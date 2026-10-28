from django.db import models
from django.conf import settings  # <--- IMPORTANTE: Usamos las configuraciones de Django

class Recurso(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    ruta = models.CharField(max_length=200, blank=True, null=True, help_text="Ej: /api/devices/")
    
    def __str__(self):
        return self.nombre

class Rol(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.nombre

class RolRecurso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='permisos')
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE)
    puede_ver = models.BooleanField(default=False)
    puede_crear = models.BooleanField(default=False)
    puede_editar = models.BooleanField(default=False)
    puede_eliminar = models.BooleanField(default=False)

    class Meta:
        unique_together = ('rol', 'recurso')
        verbose_name = 'Permiso por Rol'
        verbose_name_plural = 'Matriz de Permisos'

    def __str__(self):
        return f"{self.rol.nombre} -> {self.recurso.nombre}"

class UsuarioRol(models.Model):
    # AQUÍ ESTÁ LA SOLUCIÓN: Usamos settings.AUTH_USER_MODEL
    usuario = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rol_asignado')
    rol = models.ForeignKey(Rol, on_delete=models.SET_NULL, null=True)

    class Meta:
        verbose_name = 'Rol de Usuario'
        verbose_name_plural = 'Roles por Usuario'

    def __str__(self):
        return f"{self.usuario.username} - {self.rol.nombre if self.rol else 'Sin rol'}"