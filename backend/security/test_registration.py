from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Comunidad, EstadoInstalacion, Instalacion, SolicitudVinculacion
from security.models import Role, UserRole


User = get_user_model()


class AccountRegistrationTests(APITestCase):
    def test_public_registration_creates_account_without_business_roles(self):
        response = self.client.post(reverse("register-account"), {
            "username": "casa.jalia",
            "first_name": "Arelis",
            "last_name": "Muestra",
            "email": "ARELIS@example.test",
            "telefono": "3001234567",
            "documento": "CC-10001",
            "password": "Jalia-Solar-2026-Strong!",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="casa.jalia")
        self.assertEqual(user.email, "arelis@example.test")
        self.assertTrue(user.check_password("Jalia-Solar-2026-Strong!"))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(UserRole.objects.filter(usuario=user).exists())

    def test_duplicate_email_is_rejected(self):
        User.objects.create_user(username="existing", email="same@example.test", password="GoodPassword123!")
        users_before = User.objects.count()
        response = self.client.post(reverse("register-account"), {
            "username": "new-person",
            "first_name": "New",
            "last_name": "Person",
            "email": "SAME@example.test",
            "password": "Another-Strong-Password-2026!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), users_before)


class ServiceLinkRequestTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="reviewer", email="reviewer@example.test", password="Admin-Strong-Password-2026!"
        )
        self.applicant = User.objects.create_user(
            username="solar.owner", email="owner@example.test", password="Owner-Strong-Password-2026!"
        )
        self.other = User.objects.create_user(
            username="other.person", email="other@example.test", password="Other-Strong-Password-2026!"
        )
        self.operational, _ = EstadoInstalacion.objects.get_or_create(nombre="Operativa")
        self.owner_role, _ = Role.objects.get_or_create(name="Propietario Solar", defaults={"is_active": True})
        self.leader_role, _ = Role.objects.get_or_create(name="Líder Comunitario", defaults={"is_active": True})
        self.url = reverse("solicitudes-vinculacion-list")
        self.residential = {
            "tipo": SolicitudVinculacion.Tipo.RESIDENCIAL,
            "nombre": "Vivienda solar Jalia",
            "municipio": "Riohacha",
            "sector": "Zona rural",
            "direccion": "Vereda Jalia, casa 12",
            "barrio": "Jalia",
            "referencia": "Junto a la escuela",
            "latitud": "11.544900",
            "longitud": "-72.907200",
            "capacidad": "3.50",
            "fecha_instalacion": date.today().isoformat(),
            "descripcion": "Paneles solares instalados en la vivienda.",
        }

    def create_request(self, user=None, data=None):
        self.client.force_authenticate(user=user or self.applicant)
        return self.client.post(self.url, data or self.residential, format="json")

    def test_request_is_private_and_only_one_pending_request_is_allowed(self):
        created = self.create_request()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data["estado"], SolicitudVinculacion.Estado.PENDIENTE)

        duplicate = self.client.post(self.url, self.residential, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.other)
        list_response = self.client.get(self.url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data, [])
        hidden_detail = self.client.get(f"{self.url}{created.data['id_solicitud']}/")
        self.assertEqual(hidden_detail.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(user=self.applicant)
        immutable = self.client.patch(
            f"{self.url}{created.data['id_solicitud']}/",
            {"estado": SolicitudVinculacion.Estado.APROBADA},
            format="json",
        )
        self.assertEqual(immutable.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_admin_approval_creates_installation_and_assigns_owner_role(self):
        created = self.create_request()
        review_url = f"{self.url}{created.data['id_solicitud']}/revisar/"
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(review_url, {"decision": "aprobar"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["estado"], SolicitudVinculacion.Estado.APROBADA)
        installation = Instalacion.objects.get(nombre=self.residential["nombre"])
        self.assertEqual(installation.tipo, Instalacion.Tipo.RESIDENCIAL)
        self.assertEqual(installation.responsable, self.applicant)
        self.assertEqual(installation.latitud, Decimal("11.544900"))
        self.assertEqual(installation.estado_instalacion, self.operational)
        self.assertTrue(UserRole.objects.filter(usuario=self.applicant, rol=self.owner_role).exists())
        self.assertEqual(response.data["instalacion"], installation.pk)

    def test_admin_approval_of_community_assigns_leader_and_creates_community(self):
        application_data = {
            **self.residential,
            "tipo": SolicitudVinculacion.Tipo.COMUNITARIA,
            "nombre": "Comunidad La Esperanza",
            "direccion": "",
            "barrio": "",
            "sector": "Vereda La Esperanza",
        }
        created = self.create_request(data=application_data)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"{self.url}{created.data['id_solicitud']}/revisar/",
            {"decision": "aprobar"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        community = Comunidad.objects.get(nombre="Comunidad La Esperanza")
        installation = Instalacion.objects.get(nombre=application_data["nombre"])
        self.applicant.refresh_from_db()
        self.assertEqual(self.applicant.comunidad, community)
        self.assertEqual(installation.comunidad, community)
        self.assertTrue(UserRole.objects.filter(usuario=self.applicant, rol=self.leader_role).exists())

    def test_admin_can_link_leader_to_an_existing_community(self):
        application_data = {
            **self.residential,
            "tipo": SolicitudVinculacion.Tipo.COMUNITARIA,
            "nombre": "Solicitud de liderazgo local",
            "direccion": "",
            "barrio": "",
            "sector": "Vereda cercana",
        }
        created = self.create_request(data=application_data)
        community = Comunidad.objects.create(
            nombre="Comunidad ya registrada",
            ubicacion="Uribia",
            municipio="Uribia",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"{self.url}{created.data['id_solicitud']}/revisar/",
            {"decision": "aprobar", "comunidad_id": community.pk},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["comunidad"], community.pk)
        self.assertIsNone(response.data["instalacion"])
        self.applicant.refresh_from_db()
        self.assertEqual(self.applicant.comunidad, community)
        self.assertTrue(UserRole.objects.filter(usuario=self.applicant, rol=self.leader_role).exists())

    def test_rejection_requires_a_reason_and_allows_resubmission(self):
        created = self.create_request()
        review_url = f"{self.url}{created.data['id_solicitud']}/revisar/"
        self.client.force_authenticate(user=self.admin)
        missing_note = self.client.post(review_url, {"decision": "rechazar"}, format="json")
        self.assertEqual(missing_note.status_code, status.HTTP_400_BAD_REQUEST)
        rejected = self.client.post(review_url, {
            "decision": "rechazar",
            "nota_revision": "Confirma el punto exacto en el mapa.",
        }, format="json")
        self.assertEqual(rejected.status_code, status.HTTP_200_OK)
        self.assertEqual(rejected.data["estado"], SolicitudVinculacion.Estado.RECHAZADA)
        self.assertEqual(rejected.data["nota_revision"], "Confirma el punto exacto en el mapa.")
        self.assertFalse(Instalacion.objects.filter(nombre=self.residential["nombre"]).exists())

        recreated = self.create_request()
        self.assertEqual(recreated.status_code, status.HTTP_201_CREATED)

    def test_non_admin_cannot_review_and_bad_coordinates_are_rejected(self):
        created = self.create_request()
        review = self.client.post(
            f"{self.url}{created.data['id_solicitud']}/revisar/",
            {"decision": "aprobar"},
            format="json",
        )
        self.assertEqual(review.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.other)
        bad_coordinates = {**self.residential, "latitud": "91.000000"}
        response = self.client.post(self.url, bad_coordinates, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
