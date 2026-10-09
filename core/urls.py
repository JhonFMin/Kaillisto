from rest_framework.routers import DefaultRouter

from .views import (
    ComunidadViewSet,
    DispositivoViewSet,
    EstadoInstalacionViewSet,
    InstalacionViewSet,
)


router = DefaultRouter()

router.register(
    "comunidades",
    ComunidadViewSet,
    basename="comunidad",
)

router.register(
    "estados-instalacion",
    EstadoInstalacionViewSet,
    basename="estado-instalacion",
)

router.register(
    "instalaciones",
    InstalacionViewSet,
    basename="instalacion",
)

router.register(
    "dispositivos",
    DispositivoViewSet,
    basename="dispositivo",
)

urlpatterns = router.urls