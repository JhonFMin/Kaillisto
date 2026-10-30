from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import has_effective_role, get_effective_permissions

class IsAdminRole(BasePermission):
    """Autoriza la operación según el permiso RBAC del modelo de la vista."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        permissions = get_effective_permissions(request.user)
        if "ALL" in permissions:
            return True
        model_name = getattr(view, "rbac_model_name", None)
        queryset = getattr(view, "queryset", None)
        if model_name is None and queryset is not None:
            model_name = queryset.model._meta.model_name
        if model_name is None:
            model_name = "role"
        action = getattr(view, "action", None)
        verb = (
            "change" if action == "restore_defaults" else
            {"GET": "view", "HEAD": "view", "OPTIONS": "view",
             "POST": "add", "PUT": "change", "PATCH": "change",
             "DELETE": "delete"}.get(request.method)
        )
        return bool(verb and f"{verb}_{model_name}" in permissions)


class HasUserViewPermission(BasePermission):
    """Permite consultar usuarios si el rol tiene el permiso RBAC explícito."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or
            "view_usuario" in get_effective_permissions(request.user)
        )

class HasRole(BasePermission):
    """
    Permite el acceso si el usuario tiene al menos uno de los roles definidos en la vista.
    Uso en la vista: allowed_roles = ['Técnico de Campo', 'Administrador']
    """
    def has_permission(self, request, view):
        allowed_roles = getattr(view, 'allowed_roles', [])
        if has_effective_role(request.user, "Administrador"):
            return True
        return any(has_effective_role(request.user, role) for role in allowed_roles)

class HasPermission(BasePermission):
    """
    Verifica si el usuario tiene un permiso específico (codename) asignado a través de sus roles.
    Uso en la vista: required_permissions = ['add_dispositivo']
    """
    def has_permission(self, request, view):
        required_perms = getattr(view, 'required_permissions', [])
        user_perms = get_effective_permissions(request.user)
        
        if "ALL" in user_perms:
            return True
            
        return any(perm in user_perms for perm in required_perms)

class ReadOnlyOrManager(BasePermission):
    """
    GET/HEAD/OPTIONS permitidos para 'Líder Comunitario' (RF-31, RF-33:
    solo puede consultar el estado de sus instalaciones y el técnico
    asignado, nunca modificar).
    POST/PUT/PATCH/DELETE requieren 'Técnico de Campo' o 'Administrador'.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        # Si es un método seguro (solo lectura)
        if request.method in SAFE_METHODS:
            return (has_effective_role(request.user, "Líder Comunitario") or
                    has_effective_role(request.user, "Técnico de Campo") or
                    has_effective_role(request.user, "Administrador"))
        
        # Si es un método de escritura
        return has_effective_role(request.user, "Técnico de Campo") or has_effective_role(request.user, "Administrador")
class TienePermisoAsignado(BasePermission):
    """
    Permiso genérico: exige el permiso Django estándar (view_/add_/change_/delete_
    + nombre del modelo) que corresponda al método HTTP, verificando los permisos
    EFECTIVOS del usuario (los que de verdad están marcados en su Rol).
    Reemplaza los checks por nombre de rol: ahora lo que decides en la pantalla
    de Roles y Permisos tiene efecto real.
    """
    perms_map = {
        'GET': 'view_%(model_name)s',
        'OPTIONS': 'view_%(model_name)s',
        'HEAD': 'view_%(model_name)s',
        'POST': 'add_%(model_name)s',
        'PUT': 'change_%(model_name)s',
        'PATCH': 'change_%(model_name)s',
        'DELETE': 'delete_%(model_name)s',
    }

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        user_perms = get_effective_permissions(request.user)
        if "ALL" in user_perms:
            return True
        queryset = getattr(view, 'queryset', None)
        if queryset is None and hasattr(view, 'get_queryset'):
            queryset = view.get_queryset()
        if queryset is None:
            return False
        codename = self.perms_map[request.method] % {
            'model_name': queryset.model._meta.model_name
        }
        return codename in user_perms
