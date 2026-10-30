from django.contrib.auth.models import Permission
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Resource
from .permissions import IsAdminRole

ACTIONS = [('view', 'Consultar'), ('add', 'Crear'), ('change', 'Editar'), ('delete', 'Eliminar')]

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

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def matrix(request):
    permissions = Permission.objects.filter(content_type__rbac_resource__isnull=False)
    by_code = {(p.content_type_id, p.codename): p for p in permissions}
    resources = []
    for resource in Resource.objects.select_related('content_type'):
        cells = {}
        for action, label in ACTIONS:
            code = f'{action}_{resource.content_type.model}'
            permission = by_code.get((resource.content_type_id, code))
            if permission:
                cells[action] = {'id': permission.pk, 'code': code, 'label': label}
        resources.append({**ResourceSerializer(resource).data, 'permissions': cells})
    return Response({'actions': [{'code': code, 'label': label} for code, label in ACTIONS], 'resources': resources})
