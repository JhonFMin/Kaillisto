from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, UserRoleViewSet, me_permissions, lista_permisos, lista_usuarios

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'user-roles', UserRoleViewSet, basename='user-roles')

urlpatterns = [
    path('', include(router.urls)),
    path('me/permissions/', me_permissions, name='me-permissions'),
    path('permissions/', lista_permisos, name='lista-permisos'),
    path('users/', lista_usuarios, name='lista-usuarios'),
]