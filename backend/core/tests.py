from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Comunidad,
    EstadoInstalacion,
    EstadoOrdenTrabajo,
    Evento,
    Instalacion,
    OrdenTrabajo,
    Rol,
    Usuario,
    Alerta,
    EstadoAlerta,
    Notificacion,
    PrioridadAlerta,
    TipoAlerta,
    TipoMedicion,
)
from unittest.mock import patch

from django.test import TestCase, override_settings

from .notificaciones import notificar_alerta_a_lideres
from security.models import Role, UserRole


from django.contrib.auth.models import Permission

# Permisos base por rol, reflejando lo mismo que seed_roles.py le da a
# cada rol en producción. Antes del fix de TienePermisoAsignado esto no
# hacía falta (los permission_classes miraban el nombre del rol); ahora
# un rol de prueba sin permisos reales se queda sin acceso, igual que
# le pasaría a un usuario real mal configurado.
PERMISOS_BASE_POR_ROL = {
    "Administrador": None,  # None = todos los permisos del dominio
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
    permisos base que ese rol necesita (TienePermisoAsignado ya no
    concede nada solo por el nombre del rol).
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


class InstalacionAPITests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username="admin_pruebas",
            email="admin_pruebas@example.com",
            password="ClaveSoloParaPruebas_2026!",
            is_staff=True,
            is_superuser=True,
        )
        _asignar_rol_seguridad(self.admin, "Administrador")

        self.comunidad = Comunidad.objects.create(
            nombre="Comunidad de pruebas",
            ubicacion="Riohacha",
        )

        self.estado = EstadoInstalacion.objects.create(
            nombre="Normal",
        )

        self.url = reverse("instalacion-list")

        self.datos = {
            "comunidad": self.comunidad.pk,
            "nombre": "Instalación de pruebas",
            "ubicacion": "Riohacha",
            "capacidad": "5.00",
            "fecha_instalacion": "2026-10-09",
            "estado_instalacion": self.estado.pk,
        }

        self.client.force_authenticate(user=self.admin)

    def test_crear_instalacion_valida(self):
        respuesta = self.client.post(
            self.url,
            self.datos,
            format="json",
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(Instalacion.objects.count(), 1)

        instalacion = Instalacion.objects.get()
        self.assertEqual(instalacion.comunidad, self.comunidad)
        self.assertEqual(instalacion.estado_instalacion, self.estado)

    def test_rechazar_capacidad_negativa(self):
        self.datos["capacidad"] = "-5.00"

        respuesta = self.client.post(
            self.url,
            self.datos,
            format="json",
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("capacidad", respuesta.data)
        self.assertEqual(Instalacion.objects.count(), 0)

    def test_rechazar_comunidad_inexistente(self):
        self.datos["comunidad"] = self.comunidad.pk + 9999

        respuesta = self.client.post(
            self.url,
            self.datos,
            format="json",
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("comunidad", respuesta.data)
        self.assertEqual(Instalacion.objects.count(), 0)

    def test_rechazar_acceso_sin_autenticacion(self):
        self.client.force_authenticate(user=None)

        respuesta = self.client.get(self.url)

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_rechazar_usuario_sin_permisos_administrativos(self):
        usuario = Usuario.objects.create_user(
            username="usuario_pruebas",
            email="usuario_pruebas@example.com",
            password="OtraClaveSoloParaPruebas_2026!",
            is_staff=False,
        )

        self.client.force_authenticate(user=usuario)

        respuesta = self.client.post(
            self.url,
            self.datos,
            format="json",
        )

        self.assertEqual(
            respuesta.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(Instalacion.objects.count(), 0)
class FlujoOrdenTrabajoTests(APITestCase):
    def setUp(self):
        rol = Rol.objects.create(nombre="tecnico")
        comunidad = Comunidad.objects.create(
            nombre="Comunidad de pruebas", ubicacion="Riohacha"
        )
        estado_inst = EstadoInstalacion.objects.create(nombre="Normal")
        self.instalacion = Instalacion.objects.create(
            comunidad=comunidad,
            nombre="Instalación de pruebas",
            ubicacion="Riohacha",
            capacidad="5.00",
            fecha_instalacion="2026-10-09",
            estado_instalacion=estado_inst,
        )

        self.tecnico = Usuario.objects.create_user(
            username="tecnico_pruebas",
            email="tecnico_pruebas@example.com",
            password="ClaveSoloParaPruebas_2026!",
            rol=rol,
        )
        self.otro_tecnico = Usuario.objects.create_user(
            username="otro_tecnico",
            email="otro_tecnico@example.com",
            password="ClaveSoloParaPruebas_2026!",
            rol=rol,
        )
        _asignar_rol_seguridad(self.tecnico, "Técnico de Campo")
        _asignar_rol_seguridad(self.otro_tecnico, "Técnico de Campo")

        self.pendiente = EstadoOrdenTrabajo.objects.create(nombre="Pendiente")
        self.en_proceso = EstadoOrdenTrabajo.objects.create(nombre="En proceso")
        self.cerrada = EstadoOrdenTrabajo.objects.create(nombre="Cerrada")

        self.orden = OrdenTrabajo.objects.create(
            instalacion=self.instalacion,
            tecnico=self.tecnico,
            estado=self.pendiente,
            descripcion="Orden de prueba",
        )
        self.url = reverse(
            "orden-trabajo-detail", args=[self.orden.id_orden_trabajo]
        )
        self.client.force_authenticate(user=self.tecnico)

    def test_iniciar_atencion_registra_fecha_y_evento(self):
        respuesta = self.client.patch(
            self.url, {"estado": self.en_proceso.pk}, format="json"
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertIsNotNone(self.orden.fecha_atencion)
        self.assertIsNone(self.orden.fecha_cierre)
        self.assertTrue(
            Evento.objects.filter(tipo="Atención iniciada").exists()
        )

    def test_cerrar_orden_registra_fecha_y_evento(self):
        self.client.patch(
            self.url, {"estado": self.en_proceso.pk}, format="json"
        )
        respuesta = self.client.patch(
            self.url, {"estado": self.cerrada.pk}, format="json"
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.orden.refresh_from_db()
        self.assertIsNotNone(self.orden.fecha_cierre)
        self.assertEqual(
            Evento.objects.filter(tipo="Orden cerrada").count(), 1
        )

    def test_tecnico_no_puede_modificar_orden_ajena(self):
        self.client.force_authenticate(user=self.otro_tecnico)

        respuesta = self.client.patch(
            self.url, {"estado": self.en_proceso.pk}, format="json"
        )

        self.assertEqual(respuesta.status_code, status.HTTP_404_NOT_FOUND)
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.estado, self.pendiente)

    def test_ficha_tecnica_con_orden_asignada(self):
        url = reverse(
            "ficha-instalacion-tecnico",
            args=[self.instalacion.id_instalacion],
        )

        respuesta = self.client.get(url)

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["nombre"], "Instalación de pruebas")

    def test_ficha_tecnica_sin_orden_asignada(self):
        self.client.force_authenticate(user=self.otro_tecnico)
        url = reverse(
            "ficha-instalacion-tecnico",
            args=[self.instalacion.id_instalacion],
        )

        respuesta = self.client.get(url)

        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(WHATSAPP_ENABLED=False)
class NotificacionAlertaTests(TestCase):
    def setUp(self):
        rol = Rol.objects.create(nombre="lider comunitario")
        self.comunidad_a = Comunidad.objects.create(
            nombre="Comunidad A", ubicacion="Riohacha"
        )
        self.comunidad_b = Comunidad.objects.create(
            nombre="Comunidad B", ubicacion="Uribia"
        )
        estado_inst = EstadoInstalacion.objects.create(nombre="Normal")
        instalacion = Instalacion.objects.create(
            comunidad=self.comunidad_a,
            nombre="Instalación A",
            ubicacion="Riohacha",
            capacidad="5.00",
            fecha_instalacion="2026-10-09",
            estado_instalacion=estado_inst,
        )

        self.lider_a = Usuario.objects.create_user(
            username="lider_a",
            email="lider_a@example.com",
            password="ClaveSoloParaPruebas_2026!",
            rol=rol,
            comunidad=self.comunidad_a,
            telefono="3000000001",
        )
        self.lider_b = Usuario.objects.create_user(
            username="lider_b",
            email="lider_b@example.com",
            password="ClaveSoloParaPruebas_2026!",
            rol=rol,
            comunidad=self.comunidad_b,
            telefono="3000000002",
        )

        self.alerta = Alerta.objects.create(
            instalacion=instalacion,
            tipo_medicion=TipoMedicion.objects.create(nombre="Voltaje", unidad="V"),
            tipo_alerta=TipoAlerta.objects.create(nombre="Medición fuera de umbral"),
            prioridad=PrioridadAlerta.objects.create(nombre="Alta"),
            estado=EstadoAlerta.objects.create(nombre="Vigente"),
            mensaje="Tres mediciones fuera del umbral.",
        )

    def test_notifica_solo_al_lider_de_la_comunidad(self):
        notificar_alerta_a_lideres(self.alerta)

        self.assertEqual(Notificacion.objects.count(), 1)
        notificacion = Notificacion.objects.get()
        self.assertEqual(notificacion.destinatario, self.lider_a)
        self.assertEqual(notificacion.estado, "simulada")

    def test_lider_sin_telefono_queda_fallida(self):
        self.lider_a.telefono = ""
        self.lider_a.save()

        notificar_alerta_a_lideres(self.alerta)

        self.assertEqual(Notificacion.objects.get().estado, "fallida")

    def test_fallo_de_envio_no_interrumpe_el_flujo(self):
        with patch(
            "core.notificaciones._enviar_whatsapp",
            side_effect=Exception("fallo simulado"),
        ):
            notificar_alerta_a_lideres(self.alerta)

        notificacion = Notificacion.objects.get()
        self.assertEqual(notificacion.estado, "fallida")
        self.assertIn("fallo simulado", notificacion.detalle_error)