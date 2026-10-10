from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    RecepcionMedicionView,
    cerrar_sesion,
    iniciar_sesion,
)
from .views import (
    AlertaViewSet,
    ComunidadViewSet,
    DispositivoViewSet,
    EstadoInstalacionViewSet,
    InstalacionViewSet,
    OrdenTrabajoViewSet,
    RecepcionMedicionView,
    RepuestoOrdenTrabajoViewSet,
    RepuestoViewSet,
    TipoMedicionViewSet,
    cerrar_sesion,
    dashboard_resumen,
    iniciar_sesion,
    UmbralViewSet,
    historial_mediciones_instalacion, 
    historial_mantenimientos_instalacion,
    exportar_mediciones_csv,
    exportar_mantenimientos_csv,
    instalaciones_lider_comunitario,
    alertas_lider_comunitario,
    ordenes_trabajo_lider_comunitario,
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
        "dashboard/resumen/",
        dashboard_resumen,
        name="dashboard-resumen",
    ),
    path(
        "lider/alertas/",
        alertas_lider_comunitario,
        name="alertas-lider-comunitario",
    ),
    path(
        "lider/ordenes-trabajo/",
        ordenes_trabajo_lider_comunitario,
        name="ordenes-trabajo-lider-comunitario",
    ),
    path(
        "lider/instalaciones/",
        instalaciones_lider_comunitario,
        name="instalaciones-lider-comunitario",
    ),
    path(
        "instalaciones/<int:id_instalacion>/mediciones/",
        historial_mediciones_instalacion,
        name="historial-mediciones-instalacion",
    ),
    path(
        "instalaciones/<int:id_instalacion>/mediciones/exportar-csv/",
        exportar_mediciones_csv,
        name="exportar-mediciones-csv",
    ),
    path(
        "instalaciones/<int:id_instalacion>/mantenimientos/",
        historial_mantenimientos_instalacion,
        name="historial-mantenimientos-instalacion",
    ),
    path(
        "instalaciones/<int:id_instalacion>/mantenimientos/exportar-csv/",
        exportar_mantenimientos_csv,
        name="exportar-mantenimientos-csv",
    ),

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

