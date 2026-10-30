from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Alerta,
    Comunidad,
    EstadoAlerta,
    EstadoInstalacion,
    EstadoOrdenTrabajo,
    Instalacion,
    PrioridadAlerta,
    Repuesto,
    RepuestoOrdenTrabajo,
    Rol,
    TipoAlerta,
    TipoMedicion,
    Usuario,
)
from security.models import Role, UserRole


from django.contrib.auth.models import Permission

PERMISOS_BASE_POR_ROL = {
    "Administrador": None,
    "Técnico de Campo": [
        "view_instalacion", "view_dispositivo", "view_umbral",
        "view_ordentrabajo", "change_ordentrabajo",
        "view_repuesto", "add_repuestoordentrabajo", "change_repuestoordentrabajo",
        "view_alerta",
    ],
    "Líder Comunitario": [
        "view_instalacion", "view_alerta", "view_ordentrabajo", "view_dispositivo",
    ],
}


def _asignar_rol_seguridad(usuario, nombre_rol):
    """
    Da de alta (si no existe) el rol RBAC real en `security.Role`, lo
    asigna al usuario mediante `security.UserRole` y le otorga los
    permisos base que ese rol necesita.
    """
    rol, creado = Role.objects.get_or_create(name=nombre_rol)
    UserRole.objects.get_or_create(usuario=usuario, rol=rol)

    if creado or not rol.permissions.exists():
        codenames = PERMISOS_BASE_POR_ROL.get(nombre_rol)
        if codenames is None:
            permisos = Permission.objects.filter(
                content_type__app_label__in=["core", "devices", "catalogs", "maintenance"]
            )
        else:
            permisos = Permission.objects.filter(codename__in=codenames)
        rol.permissions.set(permisos)

    return rol


class FlujosApiAdicionalesTests(APITestCase):
    """Pruebas de integración sobre la BD aislada que crea Django."""

    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username="admin_flujo_test",
            email="admin_flujo_test@example.test",
            password="TestPass_12345!",
            is_staff=True,
            is_superuser=True,
        )
        _asignar_rol_seguridad(self.admin, "Administrador")
        self.rol_tecnico = Rol.objects.create(nombre="Técnico de campo")
        # La vista valida el texto "lider" en minúscula.
        self.rol_lider = Rol.objects.create(nombre="lider comunitario")
        self.tecnico = Usuario.objects.create_user(
            username="tecnico_flujo_test",
            email="tecnico_flujo_test@example.test",
            password="TestPass_12345!",
            rol=self.rol_tecnico,
        )
        self.otro_tecnico = Usuario.objects.create_user(
            username="tecnico_otro_test",
            email="tecnico_otro_test@example.test",
            password="TestPass_12345!",
            rol=self.rol_tecnico,
        )
        _asignar_rol_seguridad(self.tecnico, "Técnico de Campo")
        _asignar_rol_seguridad(self.otro_tecnico, "Técnico de Campo")
        self.comunidad_a = Comunidad.objects.create(
            nombre="Comunidad A test", ubicacion="Riohacha"
        )
        self.comunidad_b = Comunidad.objects.create(
            nombre="Comunidad B test", ubicacion="Uribia"
        )
        self.estado_instalacion = EstadoInstalacion.objects.create(
            nombre="Normal"
        )
        self.instalacion_a = Instalacion.objects.create(
            comunidad=self.comunidad_a,
            nombre="Instalación A test",
            ubicacion="Riohacha",
            capacidad="5.00",
            fecha_instalacion="2026-10-09",
            estado_instalacion=self.estado_instalacion,
        )
        self.instalacion_b = Instalacion.objects.create(
            comunidad=self.comunidad_b,
            nombre="Instalación B test",
            ubicacion="Uribia",
            capacidad="8.00",
            fecha_instalacion="2026-10-09",
            estado_instalacion=self.estado_instalacion,
        )
        self.lider_a = Usuario.objects.create_user(
            username="lider_a_flujo_test",
            email="lider_a_flujo_test@example.test",
            password="TestPass_12345!",
            rol=self.rol_lider,
            comunidad=self.comunidad_a,
            telefono="573000000001",
        )
        self.lider_b = Usuario.objects.create_user(
            username="lider_b_flujo_test",
            email="lider_b_flujo_test@example.test",
            password="TestPass_12345!",
            rol=self.rol_lider,
            comunidad=self.comunidad_b,
            telefono="573000000002",
        )
        self.estado_pendiente = EstadoOrdenTrabajo.objects.create(
            nombre="Pendiente"
        )
        self.tipo_medicion = TipoMedicion.objects.create(
            nombre="Voltaje test", unidad="V"
        )
        self.tipo_alerta = TipoAlerta.objects.create(nombre="Alerta test")
        self.prioridad = PrioridadAlerta.objects.create(nombre="Alta")
        self.estado_alerta = EstadoAlerta.objects.create(nombre="Vigente")
        self.alerta_a = Alerta.objects.create(
            instalacion=self.instalacion_a,
            tipo_medicion=self.tipo_medicion,
            tipo_alerta=self.tipo_alerta,
            prioridad=self.prioridad,
            estado=self.estado_alerta,
            mensaje="Alerta de prueba A",
        )
        self.alerta_b = Alerta.objects.create(
            instalacion=self.instalacion_b,
            tipo_medicion=self.tipo_medicion,
            tipo_alerta=self.tipo_alerta,
            prioridad=self.prioridad,
            estado=self.estado_alerta,
            mensaje="Alerta de prueba B",
        )
        self.orden_a = self._crear_orden(self.instalacion_a, self.alerta_a)
        self.orden_b = self._crear_orden(self.instalacion_b, self.alerta_b)

    def _crear_orden(self, instalacion, alerta):
        return instalacion.ordenes_trabajo.create(
            alerta=alerta,
            tecnico=self.tecnico,
            estado=self.estado_pendiente,
            descripcion="Orden de prueba",
        )

    def test_login_valido_devuelve_usuario(self):
        respuesta = self.client.post(
            reverse("iniciar_sesion"),
            {"username": self.tecnico.username, "password": "TestPass_12345!"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["username"], self.tecnico.username)

    def test_login_con_clave_incorrecta_es_rechazado(self):
        respuesta = self.client.post(
            reverse("iniciar_sesion"),
            {"username": self.tecnico.username, "password": "incorrecta"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_lider_solo_ve_instalaciones_de_su_comunidad(self):
        self.client.force_authenticate(user=self.lider_a)
        respuesta = self.client.get(reverse("instalaciones-lider-comunitario"))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        ids = {item["id_instalacion"] for item in respuesta.data["instalaciones"]}
        self.assertEqual(ids, {self.instalacion_a.id_instalacion})

    def test_usuario_no_lider_no_accede_a_endpoint_de_lider(self):
        self.client.force_authenticate(user=self.tecnico)
        respuesta = self.client.get(reverse("alertas-lider-comunitario"))
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_lider_solo_ve_alertas_de_su_comunidad(self):
        self.client.force_authenticate(user=self.lider_a)
        respuesta = self.client.get(reverse("alertas-lider-comunitario"))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["total_alertas"], 1)
        self.assertEqual(
            respuesta.data["alertas"][0]["instalacion"],
            self.instalacion_a.nombre,
        )

    def test_lider_consulta_tecnico_de_ordenes_de_su_comunidad(self):
        self.client.force_authenticate(user=self.lider_a)
        respuesta = self.client.get(reverse("ordenes-trabajo-lider-comunitario"))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["total_ordenes"], 1)
        self.assertEqual(
            respuesta.data["ordenes_trabajo"][0]["tecnico"]["username"],
            self.tecnico.username,
        )

    def test_tecnico_lista_solo_sus_ordenes(self):
        self.client.force_authenticate(user=self.tecnico)
        respuesta = self.client.get(reverse("orden-trabajo-list"))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        ids = {item["id_orden_trabajo"] for item in respuesta.data}
        self.assertEqual(ids, {self.orden_a.id_orden_trabajo, self.orden_b.id_orden_trabajo})

    def test_tecnico_puede_registrar_repuesto_en_su_orden(self):
        self.client.force_authenticate(user=self.tecnico)
        repuesto = Repuesto.objects.create(nombre="Fusible de prueba")
        respuesta = self.client.post(
            reverse("repuesto-orden-trabajo-list"),
            {
                "orden_trabajo": self.orden_a.id_orden_trabajo,
                "repuesto": repuesto.id_repuesto,
                "cantidad": "2.00",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            RepuestoOrdenTrabajo.objects.filter(
                orden_trabajo=self.orden_a,
                repuesto=repuesto,
                cantidad="2.00",
            ).exists()
        )

    def test_tecnico_no_puede_registrar_repuesto_en_orden_ajena(self):
        self.client.force_authenticate(user=self.otro_tecnico)
        repuesto = Repuesto.objects.create(nombre="Fusible ajeno test")
        respuesta = self.client.post(
            reverse("repuesto-orden-trabajo-list"),
            {
                "orden_trabajo": self.orden_a.id_orden_trabajo,
                "repuesto": repuesto.id_repuesto,
                "cantidad": "1.00",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)
