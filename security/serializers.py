from rest_framework import serializers
from .models import Role, UserRole

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_active', 'created_at']

class UserRoleSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')
    rol_nombre = serializers.ReadOnlyField(source='rol.name')
    asignado_por_nombre = serializers.ReadOnlyField(source='asignado_por.username')

    class Meta:
        model = UserRole
        fields = ['id', 'usuario', 'usuario_nombre', 'rol', 'rol_nombre', 'asignado_por_nombre', 'fecha']
        read_only_fields = ['asignado_por', 'fecha']