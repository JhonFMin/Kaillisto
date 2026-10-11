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
)

class InstalacionAPITests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username="admin_pruebas",
            email="admin_pruebas@example.com",
            password="ClaveSoloParaPruebas_2026!",
            is_staff=True,
        )

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