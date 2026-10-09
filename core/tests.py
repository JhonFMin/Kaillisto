from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Comunidad, EstadoInstalacion, Instalacion, Usuario


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