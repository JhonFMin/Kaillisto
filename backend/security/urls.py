from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, UserRoleViewSet, me_permissions, lista_permisos, lista_usuarios, security_audit, security_audit_export

from .portal import Users, RESOURCES, resource_view, session, login_view, dashboard_summary, profile

router = DefaultRouter()
from .matrix import Resources, matrix
router.register('resources', Resources, basename='resources')
router.register("accounts", Users, basename="accounts")
for resource, model in RESOURCES.items():
    router.register("portal/" + resource, resource_view(model), basename="portal-" + resource)
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'user-roles', UserRoleViewSet, basename='user-roles')

urlpatterns = [
    path('matrix/', matrix),
    path('session/', session),
    path('profile/', profile, name='profile'),
    path('portal/resumen/', dashboard_summary, name='portal-dashboard-summary'),
    path('login/', login_view),
    path('', include(router.urls)),
    path('me/permissions/', me_permissions, name='me-permissions'),
    path('permissions/', lista_permisos, name='lista-permisos'),
    path('audit/', security_audit, name='security-audit'),
    path('audit/export/', security_audit_export, name='security-audit-export'),
    path('users/', lista_usuarios, name='lista-usuarios'),
]
