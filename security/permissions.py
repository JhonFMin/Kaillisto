from rest_framework.permissions import BasePermission
from .models import UsuarioRol, RolRecurso

class RoleBasedPermission(BasePermission):
    """
    Verifica que el usuario tenga un rol y permisos para el recurso solicitado.
    """
    def has_permission(self, request, view):
        # 1. Bloquear si no está logueado
        if not request.user or not request.user.is_authenticated:
            return False
            
        # 2. El superusuario (admin) siempre tiene acceso total
        if request.user.is_superuser:
            return True

        # 3. Buscar el rol del usuario
        try:
            user_role = UsuarioRol.objects.get(usuario=request.user).rol
            if not user_role or not user_role.activo:
                return False
        except UsuarioRol.DoesNotExist:
            return False

        # 4. Identificar qué recurso está intentando consumir (lo definiremos en la vista)
        recurso_nombre = getattr(view, 'recurso_nombre', None)
        if not recurso_nombre:
            return False # Si la vista no tiene un nombre de recurso, denegamos por seguridad

        # 5. Buscar los permisos exactos en la matriz
        try:
            permiso = RolRecurso.objects.get(rol=user_role, recurso__nombre=recurso_nombre)
        except RolRecurso.DoesNotExist:
            return False # Si no hay registro en la matriz, denegado

        # 6. Validar según la acción que intenta hacer (Ver, Crear, Editar, Eliminar)
        if request.method in ['GET', 'OPTIONS', 'HEAD']:
            return permiso.puede_ver
        elif request.method == 'POST':
            return permiso.puede_crear
        elif request.method in ['PUT', 'PATCH']:
            return permiso.puede_editar
        elif request.method == 'DELETE':
            return permiso.puede_eliminar
        
        return False