from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    RecepcionMedicionView,
    cerrar_sesion,
    iniciar_sesion,
)
from .views import (
    ComunidadViewSet,
    DispositivoViewSet,
    EstadoInstalacionViewSet,
    InstalacionViewSet,
    TipoMedicionViewSet,
    UmbralViewSet,
    AlertaViewSet,
    OrdenTrabajoViewSet,
    RepuestoOrdenTrabajoViewSet,
    RepuestoViewSet,

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
router.register(
    "tipos-medicion",
    TipoMedicionViewSet,
    basename="tipo-medicion",
)
router.register(
    "umbrales",
    UmbralViewSet,
    basename="umbral",
)
router.register(
    "alertas",
    AlertaViewSet,
    basename="alerta",
)
router.register(
    "ordenes-trabajo",
    OrdenTrabajoViewSet,
    basename="orden-trabajo",
)

router.register(
    "repuestos",
    RepuestoViewSet,
    basename="repuesto",
)

router.register(
    "repuestos-orden-trabajo",
    RepuestoOrdenTrabajoViewSet,
    basename="repuesto-orden-trabajo",
)
urlpatterns = [
    path(
    "auth/login/",
    iniciar_sesion,
    name="iniciar-sesion",
),
    path(
    "auth/logout/",
    cerrar_sesion,
    name="cerrar-sesion",
),

    path(
        "mediciones/",
        RecepcionMedicionView.as_view(),
        name="recepcion-mediciones",
    ),
] + router.urls