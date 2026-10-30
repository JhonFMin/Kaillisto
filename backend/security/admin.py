from django.contrib import admin
from .models import Role, UserRole, Resource

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'content_type', 'is_active')
    readonly_fields = ('code', 'content_type')
    search_fields = ('name', 'code')
    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)
    filter_horizontal = ('permissions',)

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'rol', 'asignado_por', 'fecha')
    list_filter = ('rol', 'fecha')
    search_fields = ('usuario__username', 'rol__name')
