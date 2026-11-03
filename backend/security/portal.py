"""Small, session-authenticated administration API; all data is scoped server-side."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count, IntegerField, OuterRef, Subquery, Value
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
from .audit import audit_security_change

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
    homeowner = has_effective_role(user, 'Propietario Solar')
    installations = m.Instalacion.objects.none()
    if technician:
        installations = m.Instalacion.objects.filter(ordenes_trabajo__tecnico=user)
    if leader and user.comunidad_id:
        installations = installations | m.Instalacion.objects.filter(comunidad_id=user.comunidad_id)
    if homeowner:
        installations = installations | m.Instalacion.objects.filter(responsable=user)
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
    if model in (m.EstadoInstalacion, m.EstadoOrdenTrabajo, m.TipoMedicion, m.EstadoAlerta, m.PrioridadAlerta, m.TipoAlerta, m.Repuesto) and (technician or leader or homeowner):
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
            current_ids = set(
                self.instance.roles_asignados.values_list('rol_id', flat=True)
            ) if self.instance else set()
            requested_ids = {role.pk for role in attrs['roles']}
            granted = requested_ids - current_ids
            revoked = current_ids - requested_ids
            permissions = set(effective_permissions(request_user))
            if granted and 'assign_userrole' not in permissions:
                raise PermissionDenied('Tu rol no puede asignar roles.')
            if revoked and 'revoke_userrole' not in permissions:
                raise PermissionDenied('Tu rol no puede retirar roles.')
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
        audit_security_change(
            self.context['request'], 'account.created', 'user', obj.pk,
            obj.username,
            {'roles': [{'id': role.pk, 'name': role.name} for role in roles],
             'is_active': obj.is_active, 'comunidad_id': obj.comunidad_id},
        )
        return obj
    @transaction.atomic
    def update(self, obj, data):
        roles = data.pop('roles', None)
        password = data.pop('password', None)
        before = {
            'is_active': obj.is_active,
            'comunidad_id': obj.comunidad_id,
            'roles': sorted(obj.roles_asignados.values_list('rol__name', flat=True)),
        }
        obj = super().update(obj, data)
        if password:
            obj.set_password(password)
            obj.save(update_fields=['password'])
        if roles is not None:
            obj.roles_asignados.all().delete()
            for role in roles:
                UserRole.objects.create(usuario=obj, rol=role, asignado_por=self.context['request'].user)
        after = {
            'is_active': obj.is_active,
            'comunidad_id': obj.comunidad_id,
            'roles': sorted(obj.roles_asignados.values_list('rol__name', flat=True)),
        }
        changes = {'before': before, 'after': after}
        if password:
            changes['password_changed'] = True
        if before != after or password:
            audit_security_change(
                self.context['request'], 'account.updated', 'user', obj.pk,
                obj.username, changes,
            )
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
        before = {'is_superuser': obj.is_superuser, 'is_staff': obj.is_staff}
        obj.is_superuser = not obj.is_superuser
        obj.is_staff = obj.is_superuser
        obj.save(update_fields=['is_superuser', 'is_staff'])
        audit_security_change(
            request, 'account.superadmin_changed', 'user', obj.pk, obj.username,
            {'before': before, 'after': {'is_superuser': obj.is_superuser,
                                         'is_staff': obj.is_staff}},
        )
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
            if model == m.Instalacion:
                kind = attrs.get('tipo', getattr(self.instance, 'tipo', m.Instalacion.Tipo.COMUNITARIA))
                community = attrs.get('comunidad', getattr(self.instance, 'comunidad', None))
                owner = attrs.get('responsable', getattr(self.instance, 'responsable', None))
                address = attrs.get('direccion', getattr(self.instance, 'direccion', ''))
                neighborhood = attrs.get('barrio', getattr(self.instance, 'barrio', ''))
                if kind == m.Instalacion.Tipo.COMUNITARIA and community is None:
                    raise ValidationError({'comunidad': 'Selecciona una comunidad para esta instalación.'})
                if kind == m.Instalacion.Tipo.RESIDENCIAL and owner is None:
                    raise ValidationError({'responsable': 'Selecciona quién responde por esta vivienda.'})
                if kind == m.Instalacion.Tipo.RESIDENCIAL and not str(address or '').strip():
                    raise ValidationError({'direccion': 'Escribe la dirección de la vivienda.'})
                if kind == m.Instalacion.Tipo.RESIDENCIAL and not str(neighborhood or '').strip():
                    raise ValidationError({'barrio': 'Escribe el barrio o sector residencial.'})
                if owner is not None and not owner.is_active:
                    raise ValidationError({'responsable': 'El responsable debe tener una cuenta activa.'})
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
        @action(detail=True, methods=['get'], url_path='comparativa')
        def comparativa(self, request, pk=None):
            if model != m.Dispositivo:
                raise ValidationError('Esta consulta solo aplica a dispositivos IoT.')
            device = self.get_object()
            latest = m.Medicion.objects.filter(
                dispositivo=device, tipo_medicion_id=OuterRef('pk'),
            ).order_by('-fecha_hora', '-pk')
            types = m.TipoMedicion.objects.annotate(
                ultima_lectura=Subquery(latest.values('valor')[:1]),
                fecha_lectura=Subquery(latest.values('fecha_hora')[:1]),
                lectura_anomala=Subquery(latest.values('es_anomala')[:1]),
            ).order_by('nombre')
            active_thresholds = m.Umbral.objects.filter(
                instalacion_id=device.instalacion_id,
                fecha_fin__isnull=True,
            ).select_related('tipo_medicion').order_by('-fecha_inicio', '-pk')
            threshold_by_type = {}
            for threshold in active_thresholds:
                threshold_by_type.setdefault(threshold.tipo_medicion_id, threshold)
            readings = []
            for kind in types:
                threshold = threshold_by_type.get(kind.pk)
                if kind.ultima_lectura is None and threshold is None:
                    continue
                value = kind.ultima_lectura
                if value is None:
                    state = 'Sin lectura'
                elif threshold is None:
                    state = 'Sin umbral'
                elif kind.lectura_anomala:
                    state = 'Fuera de rango'
                elif value < threshold.valor_minimo:
                    state = 'Bajo'
                elif value > threshold.valor_maximo:
                    state = 'Alto'
                else:
                    state = 'Normal'
                readings.append({
                    'tipo_medicion': kind.nombre,
                    'unidad': kind.unidad,
                    'valor': str(value) if value is not None else None,
                    'minimo': str(threshold.valor_minimo) if threshold else None,
                    'maximo': str(threshold.valor_maximo) if threshold else None,
                    'estado': state,
                    'fecha_hora': kind.fecha_lectura,
                })
            return Response({
                'dispositivo': device.codigo,
                'modelo': device.modelo,
                'instalacion': device.instalacion.nombre,
                'ultima_comunicacion': device.ultima_comunicacion,
                'mediciones': readings,
            })
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
        @transaction.atomic
        def perform_update(self, serializer):
            changes = {}
            if model == m.OrdenTrabajo:
                from django.utils import timezone
                previous_state = serializer.instance.estado.nombre
                state = serializer.validated_data.get('estado', serializer.instance.estado).nombre
                if state == 'Cerrada' and previous_state != 'Cerrada':
                    permissions = effective_permissions(self.request.user)
                    if 'ALL' not in permissions and 'close_ordentrabajo' not in permissions:
                        raise PermissionDenied('Tu rol no tiene permiso para cerrar órdenes de trabajo.')
                if state == 'En proceso' and not serializer.instance.fecha_atencion:
                    changes['fecha_atencion'] = timezone.now()
                if state == 'Cerrada':
                    diagnosis = serializer.validated_data.get('diagnostico', serializer.instance.diagnostico)
                    solution = serializer.validated_data.get('solucion_aplicada', serializer.instance.solucion_aplicada)
                    if not diagnosis.strip() or not solution.strip():
                        raise ValidationError('Registra diagnóstico y solución antes de cerrar.')
                    changes['fecha_cierre'] = serializer.instance.fecha_cierre or timezone.now()
            serializer.save(**changes)
            if model == m.OrdenTrabajo and previous_state != 'Cerrada' and state == 'Cerrada':
                audit_security_change(
                    self.request, 'work_order.closed', 'work_order',
                    serializer.instance.pk,
                    f'Orden #{serializer.instance.pk}',
                    {'before': previous_state, 'after': state},
                )
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


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Edit only the account associated with the current session."""
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as PasswordValidationError

    user = request.user
    if request.method == 'GET':
        return Response({
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'telefono': user.telefono,
            'documento': user.documento,
        })

    if not isinstance(request.data, dict):
        raise ValidationError('Envía los datos del perfil como un objeto.')
    allowed = {'first_name', 'last_name', 'email', 'telefono', 'documento',
               'current_password', 'new_password'}
    unknown = set(request.data) - allowed
    if unknown:
        raise ValidationError({key: 'Este campo no se puede modificar aquí.' for key in unknown})
    changes = {key: request.data[key] for key in allowed - {'current_password', 'new_password'} if key in request.data}
    if changes.get('documento') == '':
        changes['documento'] = None
    User = get_user_model()
    if 'email' in changes:
        try:
            User._meta.get_field('email').clean(changes['email'], user)
        except DjangoValidationError as exc:
            raise ValidationError({'email': exc.messages})
        if User.objects.filter(email__iexact=changes['email']).exclude(pk=user.pk).exists():
            raise ValidationError({'email': 'Ese correo ya está asociado a otra cuenta.'})
    if changes.get('documento') and User.objects.filter(documento=changes['documento']).exclude(pk=user.pk).exists():
        raise ValidationError({'documento': 'Ese documento ya está asociado a otra cuenta.'})
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    if current_password or new_password:
        if not current_password or not new_password:
            raise ValidationError({'new_password': 'Escribe la contraseña actual y la nueva para cambiarla.'})
        if not user.check_password(current_password):
            raise ValidationError({'current_password': 'La contraseña actual no coincide.'})
        try:
            validate_password(new_password, user)
        except PasswordValidationError as exc:
            raise ValidationError({'new_password': exc.messages})
        user.set_password(new_password)
    for key, value in changes.items():
        setattr(user, key, value)
    update_fields = list(changes)
    if current_password or new_password:
        update_fields.append('password')
    if update_fields:
        user.save(update_fields=update_fields)
        if new_password:
            from django.contrib.auth import update_session_auth_hash
            update_session_auth_hash(request, user)
        audit_security_change(
            request, 'account.profile_updated', 'user', user.pk, user.username,
            {'fields_changed': sorted(update_fields), 'password_changed': bool(new_password)},
        )
    return Response({
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'telefono': user.telefono,
        'documento': user.documento,
    })


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
