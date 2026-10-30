from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, UserRoleViewSet, me_permissions, lista_permisos, lista_usuarios

from .portal import Users, RESOURCES, resource_view, session, login_view, login_challenge

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
    path('login/challenge/', login_challenge),
    path('login/', login_view),
    path('', include(router.urls)),
    path('me/permissions/', me_permissions, name='me-permissions'),
    path('permissions/', lista_permisos, name='lista-permisos'),
    path('users/', lista_usuarios, name='lista-usuarios'),
]
