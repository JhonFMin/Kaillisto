"""Small, session-authenticated administration API; all data is scoped server-side."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, IntegerField, Subquery, Value
from django.db.models.functions import Coalesce
from django.db.models.deletion import ProtectedError
from rest_framework import serializers, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.metadata import SimpleMetadata
from rest_framework.response import Response
from core import models as m
from core.serializers import DispositivoSerializer
from .models import Role, UserRole, has_effective_role, get_effective_permissions

def admin(user):
    return has_effective_role(user, 'Administrador')


def effective_permissions(user):
    permissions = getattr(user, '_kaillisto_effective_permissions', None)
    if permissions is None:
        permissions = get_effective_permissions(user)
        user._kaillisto_effective_permissions = permissions
    return permissions


def scoped(user, model):
    qs = model.objects.all().order_by(model._meta.pk.name)
    if admin(user) or has_full_resource_access(user):
        return qs
    technician = has_effective_role(user, 'Técnico de Campo')
    leader = has_effective_role(user, 'Líder Comunitario')
    installations = m.Instalacion.objects.none()
    if technician:
        installations = m.Instalacion.objects.filter(ordenes_trabajo__tecnico=user)
    elif leader and user.comunidad_id:
        installations = m.Instalacion.objects.filter(comunidad_id=user.comunidad_id)
    ids = installations.values('pk')
    if model == m.Instalacion:
        return qs.filter(pk__in=ids)
    if model == m.Comunidad:
        return qs.filter(instalaciones__in=ids).distinct()
    if model == m.OrdenTrabajo:
        return qs.filter(tecnico=user) if technician else qs.filter(instalacion__in=ids)
    if model in (m.Alerta, m.Dispositivo, m.Umbral):
        return qs.filter(instalacion__in=ids)
    if model == m.Notificacion:
        return qs.filter(destinatario=user, alerta__instalacion__in=ids)
    if model == m.RepuestoOrdenTrabajo:
        return qs.filter(orden_trabajo__tecnico=user) if technician else qs.none()
    if model in (m.EstadoInstalacion, m.EstadoOrdenTrabajo, m.TipoMedicion, m.EstadoAlerta, m.PrioridadAlerta, m.TipoAlerta, m.Repuesto) and (technician or leader):
        return qs
    return qs.none()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    roles = serializers.PrimaryKeyRelatedField(queryset=Role.objects.filter(is_active=True), many=True, write_only=True, required=False)
    roles_detail = serializers.SerializerMethodField()
    comunidad_display = serializers.CharField(
        source='comunidad.nombre', read_only=True, allow_null=True, default=None
    )
    class Meta:
        model = get_user_model()
        fields = ['id_usuario', 'username', 'first_name', 'last_name', 'email', 'telefono', 'comunidad', 'comunidad_display', 'is_active', 'is_staff', 'is_superuser', 'password', 'roles', 'roles_detail']
        read_only_fields = ['is_staff', 'is_superuser']
    def get_roles_detail(self, obj):
        return [
            {'rol_id': assignment.rol_id, 'rol__name': assignment.rol.name}
            for assignment in obj.roles_asignados.all()
            if assignment.rol.is_active
        ]
    def validate(self, attrs):
        if not self.instance and not attrs.get('password'):
            raise ValidationError({'password': 'Introduce una contraseña.'})
        if 'password' in attrs:
            try:
                validate_password(attrs['password'], self.instance or get_user_model()(username=attrs.get('username', '')))
            except DjangoValidationError as exc:
                raise ValidationError({'password': exc.messages})
        if self.instance and self.instance.is_superuser and not self.context['request'].user.is_superuser:
            raise PermissionDenied('Solo un superadministrador puede modificar esta cuenta.')
        request_user = self.context['request'].user
        if 'roles' in attrs and not request_user.is_superuser:
            role_permission = 'change_userrole' if self.instance else 'add_userrole'
            if role_permission not in effective_permissions(request_user):
                raise PermissionDenied('Tu rol no puede asignar roles a usuarios.')
        is_self = self.instance and self.instance.pk == request_user.pk
        if is_self and not request_user.is_superuser:
            if attrs.get('is_active') is False or 'roles' in attrs:
                raise ValidationError('Solo un superadministrador puede cambiar sus propios roles o desactivar su cuenta.')
        if is_self and request_user.is_superuser and attrs.get('is_active') is False:
            another_superuser = get_user_model().objects.filter(
                is_active=True, is_superuser=True
            ).exclude(pk=request_user.pk).exists()
            if not another_superuser:
                raise ValidationError('Antes de desactivar esta cuenta, debe existir otro superadministrador activo para conservar el acceso de recuperación.')
        role_ids = attrs.get('roles')
        if role_ids is not None and any(r.name == 'Líder Comunitario' for r in role_ids) and not attrs.get('comunidad', getattr(self.instance, 'comunidad', None)):
            raise ValidationError({'comunidad': 'El líder necesita una comunidad.'})
        return attrs
    @transaction.atomic
    def create(self, data):
        roles = data.pop('roles', [])
        password = data.pop('password')
        obj = get_user_model().objects.create_user(password=password, **data)
        for role in roles:
            UserRole.objects.create(usuario=obj, rol=role, asignado_por=self.context['request'].user)
        return obj
    @transaction.atomic
    def update(self, obj, data):
        roles = data.pop('roles', None)
        password = data.pop('password', None)
        obj = super().update(obj, data)
        if password:
            obj.set_password(password)
            obj.save(update_fields=['password'])
        if roles is not None:
            obj.roles_asignados.all().delete()
            for role in roles:
                UserRole.objects.create(usuario=obj, rol=role, asignado_por=self.context['request'].user)
        return obj

class Users(viewsets.ModelViewSet):
    queryset = get_user_model().objects.select_related('comunidad').prefetch_related(
        'roles_asignados__rol'
    ).order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method == 'OPTIONS':
            return
        verb = {'GET': 'view', 'HEAD': 'view', 'POST': 'add', 'PUT': 'change', 'PATCH': 'change', 'DELETE': 'delete'}.get(request.method)
        required = f'{verb}_usuario' if verb else None
        if not request.user.is_superuser and required not in effective_permissions(request.user):
            raise PermissionDenied('Tu rol no tiene este permiso para usuarios.')
    def destroy(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data={'is_active': False}, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if user.pk == request.user.pk:
            from django.contrib.auth import logout
            logout(request)
        return Response(serializer.data)
    def perform_update(self, serializer):
        user = serializer.save()
        if user.pk == self.request.user.pk and not user.is_active:
            from django.contrib.auth import logout
            logout(self.request)
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def toggle_superadmin(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied('Solo un superadministrador puede promover o revocar este acceso.')
        from django.shortcuts import get_object_or_404
        obj = get_object_or_404(self.get_queryset().select_for_update(), pk=pk)
        if not obj.is_active:
            raise ValidationError('Activa la cuenta primero.')
        if obj.is_superuser and not Usuario.objects.filter(
            is_active=True, is_superuser=True
        ).exclude(pk=obj.pk).exists():
            raise ValidationError('No puedes revocar el último superadministrador activo. Promueve otra cuenta primero.')
        obj.is_superuser = not obj.is_superuser
        obj.is_staff = obj.is_superuser
        obj.save(update_fields=['is_superuser', 'is_staff'])
        return Response(self.get_serializer(obj).data)

RESOURCES = {
    'comunidades': m.Comunidad, 'instalaciones': m.Instalacion,
    'dispositivos': m.Dispositivo, 'umbrales': m.Umbral, 'alertas': m.Alerta,
    'ordenes': m.OrdenTrabajo, 'repuestos': m.Repuesto,
    'consumos': m.RepuestoOrdenTrabajo, 'notificaciones': m.Notificacion,
    'estados-instalacion': m.EstadoInstalacion, 'estados-orden': m.EstadoOrdenTrabajo,
    'tipos-medicion': m.TipoMedicion, 'estados-alerta': m.EstadoAlerta,
    'prioridades': m.PrioridadAlerta, 'tipos-alerta': m.TipoAlerta,
}

ALL_VIEW_PERMISSIONS = {
    f"view_{model._meta.model_name}"
    for model in (*RESOURCES.values(), get_user_model(), Role, UserRole)
}


def has_full_resource_access(user):
    """Full read access grants the same global data scope as the admin role."""
    if not user.is_authenticated or not user.is_active:
        return False
    permissions = set(effective_permissions(user))
    return "ALL" in permissions or ALL_VIEW_PERMISSIONS.issubset(permissions)

class PortalMetadata(SimpleMetadata):
    def determine_actions(self, request, view):
        return {"POST": self.get_serializer_info(view.get_serializer())}

def resource_view(model):
    relation_fields = tuple(
        field for field in model._meta.concrete_fields
        if field.is_relation and field.many_to_one
    )

    class Serializer(serializers.ModelSerializer):
        class Meta:
            fields = '__all__'
            read_only_fields = ['fecha_atencion', 'fecha_cierre']
        def validate(self, attrs):
            if model == m.Umbral:
                low = attrs.get('valor_minimo', getattr(self.instance, 'valor_minimo', 0))
                high = attrs.get('valor_maximo', getattr(self.instance, 'valor_maximo', 0))
                if low >= high:
                    raise ValidationError('El mínimo debe ser menor que el máximo.')
            if model == m.OrdenTrabajo and 'tecnico' in attrs:
                if not attrs['tecnico'].is_active or not has_effective_role(attrs['tecnico'], 'Técnico de Campo'):
                    raise ValidationError({'tecnico': 'Selecciona un técnico activo.'})
            if model == m.OrdenTrabajo and attrs.get('alerta'):
                if attrs['alerta'].instalacion_id != attrs.get('instalacion', getattr(self.instance, 'instalacion', None)).pk:
                    raise ValidationError('La alerta pertenece a otra instalación.')
            if model == m.RepuestoOrdenTrabajo and attrs.get('cantidad', 1) <= 0:
                raise ValidationError('La cantidad debe ser positiva.')
            return attrs

        def to_representation(self, instance):
            data = super().to_representation(instance)
            request = self.context.get('request')
            can_view_users = bool(
                request and (
                    request.user.is_superuser
                    or 'view_usuario' in effective_permissions(request.user)
                )
            )
            for field in relation_fields:
                related = getattr(instance, field.name, None)
                if related is None:
                    label = None
                elif (
                    field.remote_field.model == get_user_model()
                    and not can_view_users
                ):
                    label = None
                else:
                    label = next((
                        str(value) for name in (
                            'nombre', 'name', 'username', 'codigo', 'mensaje', 'descripcion'
                        )
                        if (value := getattr(related, name, None)) not in (None, '')
                    ), f'#{related.pk}')
                data[f'{field.name}_display'] = label
            return data
    Serializer.Meta.model = model
    class Resource(viewsets.ModelViewSet):
        metadata_class = PortalMetadata
        queryset = model.objects.all()
        serializer_class = DispositivoSerializer if model == m.Dispositivo else Serializer
        permission_classes = [IsAuthenticated]
        def get_queryset(self):
            return scoped(self.request.user, model).select_related(
                *(field.name for field in relation_fields)
            )
        def initial(self, request, *args, **kwargs):
            super().initial(request, *args, **kwargs)
            if not request.user.is_superuser and request.method != 'OPTIONS':
                verb = {'GET': 'view', 'HEAD': 'view', 'POST': 'add', 'PATCH': 'change', 'PUT': 'change', 'DELETE': 'delete'}[request.method]
                required = f'{verb}_{model._meta.model_name}'
                if required not in effective_permissions(request.user):
                    raise PermissionDenied('Tu rol no tiene este permiso activo.')
            if (
                request.method in ('PUT', 'PATCH')
                and model == m.OrdenTrabajo
                and has_effective_role(request.user, 'Técnico de Campo')
                and not admin(request.user)
                and not has_full_resource_access(request.user)
            ):
                tech = has_effective_role(request.user, 'Técnico de Campo')
                allowed = {'diagnostico', 'solucion_aplicada', 'estado'} if tech else set()
                if set(request.data) - allowed:
                    raise PermissionDenied('No puedes modificar la asignación de la orden.')
        def perform_create(self, serializer):
            if (
                model == m.RepuestoOrdenTrabajo
                and has_effective_role(self.request.user, 'Técnico de Campo')
                and not admin(self.request.user)
                and not has_full_resource_access(self.request.user)
            ):
                if serializer.validated_data['orden_trabajo'].tecnico_id != self.request.user.pk:
                    raise PermissionDenied('La orden no te pertenece.')
            serializer.save()
        def perform_update(self, serializer):
            changes = {}
            if model == m.OrdenTrabajo:
                from django.utils import timezone
                state = serializer.validated_data.get('estado', serializer.instance.estado).nombre
                if state == 'En proceso' and not serializer.instance.fecha_atencion:
                    changes['fecha_atencion'] = timezone.now()
                if state == 'Cerrada':
                    diagnosis = serializer.validated_data.get('diagnostico', serializer.instance.diagnostico)
                    solution = serializer.validated_data.get('solucion_aplicada', serializer.instance.solucion_aplicada)
                    if not diagnosis.strip() or not solution.strip():
                        raise ValidationError('Registra diagnóstico y solución antes de cerrar.')
                    changes['fecha_cierre'] = serializer.instance.fecha_cierre or timezone.now()
            serializer.save(**changes)
        def destroy(self, request, *args, **kwargs):
            try:
                return super().destroy(request, *args, **kwargs)
            except ProtectedError:
                raise ValidationError('Este registro tiene datos relacionados y no puede eliminarse.')
    return Resource

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session(request):
    u = request.user
    return Response({'id': u.pk, 'username': u.username, 'is_superuser': u.is_superuser,
        'is_staff': u.is_staff, 'admin': admin(u),
        'full_resource_access': has_full_resource_access(u), 'comunidad': u.comunidad_id,
        'roles': list(u.roles_asignados.filter(rol__is_active=True).values_list('rol__name', flat=True)),
        'permisos': effective_permissions(u)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Entrega los conteos autorizados con una sola consulta a la base."""
    user = request.user
    permissions = set(effective_permissions(user))
    resources = {
        'comunidades': m.Comunidad,
        'instalaciones': m.Instalacion,
        'dispositivos': m.Dispositivo,
        'ordenes': m.OrdenTrabajo,
    }
    annotations = {}
    for key, model in resources.items():
        codename = f'view_{model._meta.model_name}'
        if user.is_superuser or 'ALL' in permissions or codename in permissions:
            count_query = (
                scoped(user, model)
                .order_by()
                .values(_kaillisto_group=Value(1))
                .annotate(_kaillisto_count=Count('pk', distinct=True))
                .values('_kaillisto_count')[:1]
            )
            annotations[key] = Coalesce(
                Subquery(count_query, output_field=IntegerField()),
                Value(0),
            )
        else:
            annotations[key] = Value(0, output_field=IntegerField())
    counts = (
        get_user_model().objects.filter(pk=user.pk)
        .annotate(**annotations)
        .values(*resources.keys())
        .get()
    )
    return Response(counts)


# Login uses Django's CSRF middleware even for anonymous sessions.
import json
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

@csrf_protect
@require_POST
def login_view(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'detail': 'JSON invalido.'}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({'detail': 'JSON invalido.'}, status=400)
    try:
        left = int(data.get('challenge_left'))
        right = int(data.get('challenge_right'))
        answer = int(data.get('challenge_answer'))
    except (TypeError, ValueError):
        left = right = None
        answer = None
    if (left is None or right is None or not 2 <= left <= 9 or not 2 <= right <= 9
            or answer != left + right):
        return JsonResponse({'detail': 'Resuelve correctamente la suma para continuar.'}, status=400)
    user = authenticate(request, username=data.get('username'), password=data.get('password'))
    if user is None:
        return JsonResponse({'detail': 'Usuario o contrasena incorrectos.'}, status=401)
    login(request, user)
    return JsonResponse({'username': user.username})
