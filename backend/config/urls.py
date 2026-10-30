from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from core import views 

urlpatterns = [
    path('api/iniciar_sesion/', views.iniciar_sesion, name='iniciar_sesion'),
    path('api/cerrar_sesion/', views.cerrar_sesion, name='cerrar_sesion'),
    path('api/dashboard_resumen/', views.dashboard_resumen, name='dashboard_resumen'),
    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="api-schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-docs",
    ),
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api-auth/", include("rest_framework.urls")),
    path('api/', include('core.urls')),
    path('api/security/', include('security.urls')),
]

from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from core import views

@ensure_csrf_cookie
def csrf_token_view(request):
    return JsonResponse({"detail": "CSRF cookie set"})

urlpatterns = [
    path('api/csrf/', csrf_token_view, name='csrf'),
    path('api/iniciar_sesion/', views.iniciar_sesion, name='iniciar_sesion'),
    path('api/cerrar_sesion/', views.cerrar_sesion, name='cerrar_sesion'),
    path('api/dashboard_resumen/', views.dashboard_resumen, name='dashboard_resumen'),
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="api-schema"), name="api-docs"),
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api-auth/", include("rest_framework.urls")),
    path('api/security/', include('security.urls')),
]