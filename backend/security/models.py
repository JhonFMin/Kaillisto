from django.db import models
from django.conf import settings
from django.contrib.auth.models import Permission

class Role(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Rol")
    description = models.TextField(blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Usamos los permisos nativos de Django (auth_permission)
    permissions = models.ManyToManyField(
        Permission, 
        blank=True, 
        related_name="roles",
        verbose_name="Permisos Asignados"
    )

    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['name']

    def __str__(self):
        estado = "Activo" if self.is_active else "Inactivo"
        return f"{self.name} ({estado})"


class UserRole(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="roles_asignados"
    )
    rol = models.ForeignKey(
        Role, 
        on_delete=models.CASCADE, 
        related_name="usuarios_asignados"
    )
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="roles_otorgados"
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Asignación de Rol'
        verbose_name_plural = 'Asignaciones de Roles'
        # Evitar que un usuario tenga el mismo rol duplicado
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'rol'], 
                name='unique_user_role'
            )
        ]

    def __str__(self):
        return f"{self.usuario} -> {self.rol.name}"


# ==========================================
# UTILIDADES DE PYTHON PARA PERMISOS (Sin tocar la DB del Custom User)
# ==========================================

def get_effective_permissions(user):
    """
    Retorna una lista aplanada y sin duplicados de los 'codenames' 
    de los permisos que posee el usuario a través de sus roles ACTIVOS.
    """
    if not user.is_authenticated:
        return []
        
    if user.is_superuser:
        return ["ALL"]
        
    # 1. Obtenemos los roles asignados al usuario QUE ESTÉN ACTIVOS
    active_roles = user.roles_asignados.filter(rol__is_active=True).values_list('rol', flat=True)
    
    # 2. Extraemos los permisos únicos (codenames) asociados a esos roles
    perms = Permission.objects.filter(roles__in=active_roles).values_list('codename', flat=True)
    
    return list(set(perms))

def has_effective_role(user, role_name):
    """
    Verifica si el usuario tiene un rol activo con el nombre exacto.
    """
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
        
    return user.roles_asignados.filter(rol__name=role_name, rol__is_active=True).exists()