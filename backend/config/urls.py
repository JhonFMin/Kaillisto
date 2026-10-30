from django.contrib import admin
from django.http import JsonResponse
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from pathlib import Path
from django.conf import settings

from core import views


@ensure_csrf_cookie
def csrf_token_view(request):
    return JsonResponse({"detail": "CSRF cookie set"})


def frontend_app(request):
    index = Path(settings.FRONTEND_DIST) / "index.html"
    if not index.is_file():
        raise Http404("Frontend build not found")
    return FileResponse(index.open("rb"), content_type="text/html; charset=utf-8")


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
    re_path(r"^(?!api/|admin/|static/).*$", frontend_app),
]
