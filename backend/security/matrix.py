from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Resource
from .permissions import IsAdminRole
from .defaults import default_permission_codes

ACTIONS = {'view': 'Consultar', 'add': 'Crear', 'change': 'Editar', 'delete': 'Eliminar'}
ACTION_ORDER = {code: index for index, code in enumerate(ACTIONS)}

class ResourceSerializer(serializers.ModelSerializer):
    model = serializers.CharField(source='content_type.model', read_only=True)
    content_type = serializers.PrimaryKeyRelatedField(
        queryset=ContentType.objects.filter(
            Q(app_label='core') & ~Q(model__in=['idioma', 'rol', 'evento'])
            | Q(app_label='security', model__in=['role', 'securityauditevent'])
        ),
        required=True,
    )
    class Meta:
        model = Resource
        fields = [
            'id', 'code', 'name', 'description', 'is_active', 'content_type',
            'model', 'menu_group', 'menu_icon', 'menu_order', 'menu_visible',
        ]
        read_only_fields = ['code', 'model']

    def validate_content_type(self, value):
        if value.model_class() is None:
            raise serializers.ValidationError('El modelo seleccionado ya no está disponible.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        resource = self.instance
        if resource and resource.code in {'security-role', 'security-securityauditevent'}:
            if attrs.get('menu_visible') is False or attrs.get('is_active') is False:
                raise serializers.ValidationError('Este recurso de seguridad debe permanecer activo y visible para evitar bloquear la administración.')
        return attrs

class Resources(viewsets.ModelViewSet):
    queryset = Resource.objects.select_related('content_type').all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    rbac_model_name = 'role'

    @action(detail=False, methods=['get'], url_path='available-models')
    def available_models(self, request):
        registered = set(Resource.objects.values_list('content_type_id', flat=True))
        models = ContentType.objects.filter(app_label='core').exclude(
            model__in=['idioma', 'rol', 'evento', 'usuario'],
        ).exclude(pk__in=registered).order_by('model')
        return Response([
            {'id': content_type.pk, 'model': content_type.model,
             'name': str(content_type.model_class()._meta.verbose_name_plural)}
            for content_type in models if content_type.model_class()
        ])

    def perform_create(self, serializer):
        content_type = serializer.validated_data['content_type']
        model = content_type.model_class()
        code = f'{content_type.app_label}-{content_type.model}'
        resource = serializer.save(
            code=code,
            name=serializer.validated_data.get('name') or str(model._meta.verbose_name_plural).title(),
        )
        self._grant_new_resource_to_admin(resource)
        audit_resource(self.request, 'resource.created', resource, {'after': ResourceSerializer(resource).data})

    @staticmethod
    def _grant_new_resource_to_admin(resource):
        from .models import Role
        admin_role = Role.objects.filter(name='Administrador', is_active=True).first()
        if not admin_role:
            return
        permissions = Permission.objects.filter(content_type=resource.content_type)
        admin_role.permissions.add(*permissions)

    def update(self, request, *args, **kwargs):
        resource = self.get_object()
        before = ResourceSerializer(resource).data
        response = super().update(request, *args, **kwargs)
        resource.refresh_from_db()
        if before.get('is_active') is False and resource.is_active:
            self._grant_new_resource_to_admin(resource)
        after = ResourceSerializer(resource).data
        if before != after:
            audit_resource(request, 'resource.updated', resource, {'before': before, 'after': after})
        return response

    def destroy(self, request, *args, **kwargs):
        resource = self.get_object()
        if resource.code in {'security-role', 'security-securityauditevent'}:
            raise serializers.ValidationError('Este recurso de seguridad no se puede retirar porque mantiene accesibles los controles del sistema.')
        if not resource.is_active:
            return Response({'detail': 'El recurso ya está inactivo.'}, status=400)
        before = ResourceSerializer(resource).data
        resource.is_active = False
        resource.save(update_fields=['is_active'])
        audit_resource(request, 'resource.deactivated', resource, {'before': before, 'after': ResourceSerializer(resource).data})
        return Response({'detail': 'Recurso desactivado.'}, status=200)


def audit_resource(request, action, resource, changes):
    from .audit import audit_security_change
    audit_security_change(request, action, 'resource', resource.pk, resource.name, changes)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def matrix(request):
    permissions = list(
        Permission.objects.filter(content_type__rbac_resource__isnull=False)
        .select_related('content_type').order_by('content_type_id', 'codename')
    )
    permissions_by_type = {}
    for permission in permissions:
        permissions_by_type.setdefault(permission.content_type_id, []).append(permission)
    resources = []
    action_labels = dict(ACTIONS)
    for resource in Resource.objects.select_related('content_type').exclude(
        content_type__app_label='core', content_type__model='idioma',
    ):
        cells = {}
        for permission in permissions_by_type.get(resource.content_type_id, []):
            code = permission.codename
            action = next((verb for verb in ACTIONS if code.startswith(f'{verb}_')), code)
            label = ACTIONS.get(action, permission.name)
            action_labels[action] = label
            cells[action] = {'id': permission.pk, 'code': code, 'label': label}
        resources.append({**ResourceSerializer(resource).data, 'permissions': cells})
    matrix_actions = [
        {'code': action, 'label': action_labels[action]}
        for action in sorted(action_labels, key=lambda code: (ACTION_ORDER.get(code, 99), code))
    ]
    return Response({
        'actions': matrix_actions,
        'resources': resources,
        'defaults': default_permission_codes(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def navigation_resources(request):
    from core.models import Usuario, Rol, Evento
    from .portal import RESOURCES, effective_permissions
    permissions = set(effective_permissions(request.user))
    resources = Resource.objects.filter(
        is_active=True, menu_visible=True,
    ).filter(
        Q(content_type__app_label='core') | Q(content_type__app_label='security', content_type__model__in=['role', 'securityauditevent'])
    ).exclude(content_type__model__in=['idioma', 'rol', 'evento']).select_related('content_type')
    result = []
    for resource in resources:
        model = resource.content_type.model_class()
        if model is None or model in (Rol, Evento):
            continue
        permission = f'view_{resource.content_type.model}'
        if not request.user.is_superuser and permission not in permissions:
            continue
        is_role_manager = resource.content_type.app_label == 'security' and resource.content_type.model == 'role'
        is_audit = resource.content_type.app_label == 'security' and resource.content_type.model == 'securityauditevent'
        api_kind = next((slug for slug, item in RESOURCES.items() if item == model), None)
        if is_role_manager:
            endpoint = '/security/roles/'
            menu_path = '/roles'
        elif is_audit:
            endpoint = '/security/audit/'
            menu_path = '/auditoria'
        elif model == Usuario:
            endpoint = '/security/accounts/'
            menu_path = '/usuarios'
        else:
            endpoint = f'/security/portal/{api_kind}/' if api_kind else f'/security/portal/recursos/{resource.code}/'
            menu_kind = {'ordenes': 'mantenimiento', 'medicion': 'mediciones'}.get(api_kind or resource.content_type.model, api_kind or resource.content_type.model)
            menu_path = f'/{menu_kind}'
        result.append({
            **ResourceSerializer(resource).data,
            'endpoint': endpoint,
            'menu_path': menu_path,
        })
    return Response(result)
