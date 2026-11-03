from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import Permission
from django.urls import reverse

from .models import Role, SecurityAuditEvent
from core.models import Comunidad, EstadoInstalacion, EstadoOrdenTrabajo, Instalacion, OrdenTrabajo
from .models import UserRole


class SecurityAuditApiTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            username='rbac_admin_test',
            email='rbac_admin_test@example.test',
            password='TestPass_12345!',
        )
        self.target = get_user_model().objects.create_user(
            username='rbac_target_test',
            email='rbac_target_test@example.test',
            password='TestPass_12345!',
        )
        self.role = Role.objects.create(name='Rol de auditoría test')

    def test_role_assignment_and_revocation_are_audited(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse('user-roles-list'),
            {'usuario': self.target.pk, 'rol': self.role.pk},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SecurityAuditEvent.objects.filter(
            actor=self.admin, action='user_role.assigned', target_id=str(self.target.pk),
        ).exists())

        response = self.client.delete(reverse('user-roles-detail', args=[response.data['id']]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(SecurityAuditEvent.objects.filter(
            actor=self.admin, action='user_role.revoked', target_id=str(self.target.pk),
        ).exists())

    def test_role_permission_edits_are_audited(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            reverse('roles-detail', args=[self.role.pk]),
            {'description': 'Permisos de soporte'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = SecurityAuditEvent.objects.get(action='role.updated', target_id=str(self.role.pk))
        self.assertEqual(event.actor, self.admin)
        self.assertEqual(event.changes['before']['description'], '')
        self.assertEqual(event.changes['after']['description'], 'Permisos de soporte')

    def test_non_admin_cannot_read_security_audit(self):
        role = Role.objects.create(name='Lector de permisos test')
        view_role = Permission.objects.get(content_type__app_label='security', codename='view_role')
        role.permissions.add(view_role)
        UserRole.objects.create(usuario=self.target, rol=role)
        self.client.force_authenticate(user=self.target)
        response = self.client.get(reverse('security-audit'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_response_does_not_expose_passwords(self):
        from .audit import audit_security_change

        audit_security_change(
            self._request_for_admin(), 'account.updated', 'user', self.target.pk,
            self.target.username, {'password_changed': True},
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('security-audit'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn('TestPass_12345!', str(response.data))

    def _request_for_admin(self):
        from rest_framework.test import APIRequestFactory
        request = APIRequestFactory().post('/api/security/test/', {}, format='json')
        request.user = self.admin
        return request


class SensitiveActionPermissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.technician = User.objects.create_user(
            username='close_order_test', email='close_order_test@example.test',
            password='TestPass_12345!',
        )
        role, _ = Role.objects.get_or_create(name='Técnico de Campo')
        UserRole.objects.create(usuario=self.technician, rol=role)
        ordinary = Permission.objects.filter(
            content_type__app_label='core',
            codename__in=['view_ordentrabajo', 'change_ordentrabajo'],
        )
        role.permissions.set(ordinary)
        community = Comunidad.objects.create(nombre='Comunidad cierre test', ubicacion='Riohacha')
        installation_state, _ = EstadoInstalacion.objects.get_or_create(nombre='Operativa')
        installation = Instalacion.objects.create(
            comunidad=community, nombre='Instalación cierre test', ubicacion='Riohacha',
            capacidad='5.00', fecha_instalacion='2026-10-09',
            estado_instalacion=installation_state,
        )
        pending, _ = EstadoOrdenTrabajo.objects.get_or_create(nombre='Pendiente')
        self.closed, _ = EstadoOrdenTrabajo.objects.get_or_create(nombre='Cerrada')
        self.order = OrdenTrabajo.objects.create(
            instalacion=installation, tecnico=self.technician, estado=pending,
            descripcion='Revisión de prueba',
        )
        self.url = reverse('portal-ordenes-detail', args=[self.order.pk])
        self.client.force_authenticate(user=self.technician)

    def test_crud_edit_permission_does_not_grant_close(self):
        response = self.client.patch(
            self.url,
            {'estado': self.closed.pk, 'diagnostico': 'Falla', 'solucion_aplicada': 'Reparada'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.order.refresh_from_db()
        self.assertEqual(self.order.estado.nombre, 'Pendiente')

    def test_explicit_close_permission_closes_and_writes_audit(self):
        close = Permission.objects.get(
            content_type__app_label='core', codename='close_ordentrabajo',
        )
        role = self.technician.roles_asignados.get().rol
        role.permissions.add(close)

        response = self.client.patch(
            self.url,
            {'estado': self.closed.pk, 'diagnostico': 'Falla', 'solucion_aplicada': 'Reparada'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(SecurityAuditEvent.objects.filter(
            actor=self.technician, action='work_order.closed', target_id=str(self.order.pk),
        ).exists())

    def test_matrix_exposes_special_operation_permissions(self):
        admin = get_user_model().objects.create_superuser(
            username='matrix_admin_test', email='matrix_admin_test@example.test',
            password='TestPass_12345!',
        )
        self.client.force_authenticate(user=admin)
        response = self.client.get('/api/security/matrix/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        action_codes = {item['code'] for item in response.data['actions']}
        self.assertTrue({'close', 'assign', 'revoke'}.issubset(action_codes))
        self.assertIn(
            'close_ordentrabajo',
            response.data['defaults']['Técnico de Campo'],
        )

    def test_crud_userrole_permission_alone_cannot_assign_role(self):
        manager = get_user_model().objects.create_user(
            username='role_manager_test', email='role_manager_test@example.test',
            password='TestPass_12345!',
        )
        manager_role = Role.objects.create(name='Asignador incompleto test')
        UserRole.objects.create(usuario=manager, rol=manager_role)
        add_user_role = Permission.objects.get(
            content_type__app_label='security', codename='add_userrole',
        )
        manager_role.permissions.add(add_user_role)
        self.client.force_authenticate(user=manager)
        target = get_user_model().objects.create_user(
            username='role_target_test', email='role_target_test@example.test',
            password='TestPass_12345!',
        )
        response = self.client.post(
            reverse('user-roles-list'),
            {'usuario': target.pk, 'rol': manager_role.pk}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
