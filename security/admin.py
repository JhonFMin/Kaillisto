from django.contrib import admin
from .models import Rol, Recurso, RolRecurso, UsuarioRol

class RolRecursoInline(admin.TabularInline):
    model = RolRecurso
    extra = 1

@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    inlines = [RolRecursoInline]

@admin.register(Recurso)
class RecursoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'ruta')

@admin.register(UsuarioRol)
class UsuarioRolAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'rol')
    list_filter = ('rol',)