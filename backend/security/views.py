from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import transaction

from .models import Role, UserRole, get_effective_permissions
from .serializers import (
    RoleSerializer, UserRoleSerializer,
    PermissionSerializer, UsuarioResumenSerializer
)
from .permissions import IsAdminRole
from .defaults import default_permissions

Usuario = get_user_model()


class RoleViewSet(viewsets.ModelViewSet):
    """CRUD de Roles. Solo Administradores."""
    queryset = Role.objects.prefetch_related('permissions__content_type').all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    @action(detail=True, methods=['post'], url_path='restore-defaults')
    @transaction.atomic
    def restore_defaults(self, request, pk=None):
        role = self.get_object()
        permissions = default_permissions(role.name)
        if permissions is None:
            raise ValidationError({"detail": "Este rol personalizado no tiene permisos predeterminados."})
        role.permissions.set(permissions)
        return Response(self.get_serializer(role).data)

    def destroy(self, request, *args, **kwargs):
        """Borrado lógico: inactiva el rol, no lo elimina físicamente."""
        instance = self.get_object()
        if not instance.is_active:
            return Response(
                {"detail": "El rol ya está inactivo."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.is_active = False
        instance.save()
        return Response(
            {"detail": "Rol inactivado correctamente."},
            status=status.HTTP_200_OK
        )

    def update(self, request, *args, **kwargs):
        """Impide reactivar un rol inactivo desde PUT/PATCH sin permiso explícito."""
        kwargs['partial'] = kwargs.get('partial', False)
        return super().update(request, *args, **kwargs)


class UserRoleViewSet(viewsets.ModelViewSet):
    """Gestión de asignación de roles a usuarios. Solo Administradores."""
    queryset = UserRole.objects.select_related('usuario', 'rol', 'asignado_por').all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    def perform_destroy(self, instance):
        if instance.rol.name == "Administrador":
            otros_admins = UserRole.objects.filter(
                rol__name="Administrador", rol__is_active=True
            ).exclude(pk=instance.pk).exists()
            if not otros_admins:
                raise ValidationError({"detail": "No puedes quitar al último Administrador del sistema."})
        instance.delete()   
    def perform_create(self, serializer):
        usuario_destino = serializer.validated_data['usuario']
        if self.request.user.pk == usuario_destino.pk:
            raise ValidationError({"detail": "No puedes asignarte roles a ti mismo."})
        serializer.save(asignado_por=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        usuario_id = self.request.query_params.get('usuario')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_permissions(request):
    """Permisos y roles efectivos del usuario autenticado."""
    roles = list(
        request.user.roles_asignados
        .filter(rol__is_active=True)
        .values_list('rol__name', flat=True)
    )
    permisos = get_effective_permissions(request.user)
    return Response({
        "usuario": request.user.username,
        "es_superuser": request.user.is_superuser,
        "roles": roles,
        "permisos": permisos
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def lista_permisos(request):
    """Lista todos los permisos de Django disponibles para asignar a roles."""
    permisos = Permission.objects.select_related('content_type').order_by(
        'content_type__app_label', 'codename'
    )
    serializer = PermissionSerializer(permisos, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def lista_usuarios(request):
    """Lista usuarios del sistema para la asignación de roles."""
    usuarios = Usuario.objects.prefetch_related(
        'roles_asignados__rol'
    ).order_by('username')
    serializer = UsuarioResumenSerializer(usuarios, many=True)
    return Response(serializer.data)
