from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .models import Role, UserRole, get_effective_permissions
from .serializers import RoleSerializer, UserRoleSerializer
from .permissions import IsAdminRole

class RoleViewSet(viewsets.ModelViewSet):
    """CRUD de Roles. Solo para Administradores."""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def destroy(self, request, *args, **kwargs):
        """Borrado lógico: Inactiva el rol, pero no lo elimina físicamente."""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({"detail": "Rol inactivado correctamente (borrado lógico)."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def permissions(self, request, pk=None):
        """Asigna permisos nativos de Django a un rol específico."""
        rol = self.get_object()
        permisos_ids = request.data.get('permisos', [])
        
        if not isinstance(permisos_ids, list):
            return Response({"detail": "Se esperaba una lista de IDs en el campo 'permisos'."}, status=status.HTTP_400_BAD_REQUEST)
        
        rol.permissions.set(permisos_ids)
        return Response({"detail": "Permisos asignados al rol exitosamente."})

class UserRoleViewSet(viewsets.ModelViewSet):
    """Gestión de asignación de roles a usuarios. Solo Administradores."""
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def perform_create(self, serializer):
        """Impide que un administrador se asigne roles a sí mismo."""
        usuario_destino = serializer.validated_data['usuario']
        if self.request.user.id == usuario_destino.id:
            raise ValidationError({"detail": "No puedes asignarte o modificarte roles a ti mismo."})
        
        serializer.save(asignado_por=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_permissions(request):
    """Devuelve los roles activos y la lista aplanada de permisos del usuario."""
    roles = request.user.roles_asignados.filter(rol__is_active=True).values_list('rol__name', flat=True)
    permisos = get_effective_permissions(request.user)
    
    return Response({
        "usuario": request.user.username,
        "roles": list(roles),
        "permisos": permisos
    })