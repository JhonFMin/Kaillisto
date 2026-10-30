from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from .models import Role, UserRole

Usuario = get_user_model()


class PermissionSerializer(serializers.ModelSerializer):
    """Permiso nativo de Django, con app_label para agrupar en el frontend."""
    app_label = serializers.CharField(source='content_type.app_label', read_only=True)
    model = serializers.CharField(source='content_type.model', read_only=True)

    class Meta:
        model = Permission
        fields = ['id', 'codename', 'name', 'app_label', 'model']


class RoleSerializer(serializers.ModelSerializer):
    """Rol con lista de permisos asignados (ids para escritura, detalle para lectura)."""
    permissions_detail = PermissionSerializer(source='permissions', many=True, read_only=True)
    permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Role
        fields = [
            'id', 'name', 'description', 'is_active',
            'created_at', 'permissions', 'permissions_detail'
        ]
        read_only_fields = ['created_at']


class UsuarioResumenSerializer(serializers.ModelSerializer):
    """Vista mínima de usuario para asignación de roles."""
    roles_activos = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'id_usuario', 'username', 'email', 'is_active', 'is_superuser', 'roles_activos']

    def get_roles_activos(self, obj):
        return list(
            obj.roles_asignados.filter(rol__is_active=True).values_list('rol__name', flat=True)
        )


class UserRoleSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')
    rol_nombre = serializers.ReadOnlyField(source='rol.name')
    asignado_por_nombre = serializers.ReadOnlyField(source='asignado_por.username')

    class Meta:
        model = UserRole
        fields = [
            'id', 'usuario', 'usuario_nombre',
            'rol', 'rol_nombre',
            'asignado_por_nombre', 'fecha'
        ]
        read_only_fields = ['asignado_por', 'fecha']