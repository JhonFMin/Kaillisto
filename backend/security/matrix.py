from django.contrib.auth.models import Permission
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Resource
from .permissions import IsAdminRole
from .defaults import default_permission_codes

ACTIONS = [('view', 'Consultar'), ('add', 'Crear'), ('change', 'Editar'), ('delete', 'Eliminar')]
SPECIAL_ACTIONS = {
    'core-ordentrabajo': [('close', 'Cerrar orden', 'close_ordentrabajo')],
    'security-userrole': [
        ('assign', 'Asignar rol', 'assign_userrole'),
        ('revoke', 'Retirar rol', 'revoke_userrole'),
    ],
}

class ResourceSerializer(serializers.ModelSerializer):
    model = serializers.CharField(source='content_type.model', read_only=True)
    class Meta:
        model = Resource
        fields = ['id', 'code', 'name', 'description', 'is_active', 'model']
        read_only_fields = ['code', 'model']

class Resources(viewsets.ReadOnlyModelViewSet):
    queryset = Resource.objects.select_related('content_type').all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    rbac_model_name = 'role'

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def matrix(request):
    permissions = Permission.objects.filter(content_type__rbac_resource__isnull=False)
    by_code = {(p.content_type_id, p.codename): p for p in permissions}
    resources = []
    matrix_actions = [{'code': code, 'label': label} for code, label in ACTIONS]
    matrix_actions.extend(
        {'code': code, 'label': label}
        for actions in SPECIAL_ACTIONS.values()
        for code, label, _permission in actions
    )
    for resource in Resource.objects.select_related('content_type'):
        cells = {}
        for action, label in ACTIONS:
            code = f'{action}_{resource.content_type.model}'
            permission = by_code.get((resource.content_type_id, code))
            if permission:
                cells[action] = {'id': permission.pk, 'code': code, 'label': label}
        for action, label, codename in SPECIAL_ACTIONS.get(resource.code, ()):
            permission = by_code.get((resource.content_type_id, codename))
            if permission:
                cells[action] = {'id': permission.pk, 'code': codename, 'label': label}
        resources.append({**ResourceSerializer(resource).data, 'permissions': cells})
    return Response({
        'actions': matrix_actions,
        'resources': resources,
        'defaults': default_permission_codes(),
    })
