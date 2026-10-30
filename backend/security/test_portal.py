from datetime import date
from django.contrib.auth.models import Permission
from rest_framework.test import APITestCase, APIClient
from core import models as m
from security.models import Role, UserRole

class PortalAccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a = m.Comunidad.objects.create(nombre='A', ubicacion='A')
        cls.b = m.Comunidad.objects.create(nombre='B', ubicacion='B')
        cls.superuser = m.Usuario.objects.create_superuser(username='root',email='root@example.test',password='TestPassword123!')
        cls.manager = m.Usuario.objects.create_user(username='manager',email='manager@example.test',password='TestPassword123!')
        cls.tech = m.Usuario.objects.create_user(username='tech',email='tech@example.test',comunidad=cls.a)
        cls.leader = m.Usuario.objects.create_user(username='leader',email='leader@example.test',comunidad=cls.a)
        for user, name in [(cls.manager,'Administrador'),(cls.tech,'Técnico de Campo'),(cls.leader,'Líder Comunitario')]:
            role, _ = Role.objects.get_or_create(name=name)
            role.permissions.set(Permission.objects.filter(content_type__app_label='core'))
            UserRole.objects.create(usuario=user,rol=role)
        state = m.EstadoInstalacion.objects.create(nombre='Operativa')
        cls.i1=m.Instalacion.objects.create(nombre='Solar A',comunidad=cls.a,ubicacion='A',capacidad=5,fecha_instalacion=date.today(),estado_instalacion=state)
        cls.i2=m.Instalacion.objects.create(nombre='Solar B',comunidad=cls.b,ubicacion='B',capacidad=5,fecha_instalacion=date.today(),estado_instalacion=state)
        order_state=m.EstadoOrdenTrabajo.objects.create(nombre='Pendiente')
        cls.order=m.OrdenTrabajo.objects.create(instalacion=cls.i1,tecnico=cls.tech,estado=order_state,descripcion='Test')
        cls.other=m.OrdenTrabajo.objects.create(instalacion=cls.i2,tecnico=cls.manager,estado=order_state,descripcion='Other')
    def test_anonymous_and_leader_scope(self):
        url='/api/security/portal/instalaciones/'
        self.assertIn(self.client.get(url).status_code,[401,403])
        self.client.force_authenticate(self.leader)
        self.assertEqual([r['id_instalacion'] for r in self.client.get(url).data],[self.i1.pk])
        self.assertEqual(self.client.get(url+str(self.i2.pk)+'/').status_code,404)
        self.assertEqual(self.client.patch(url+str(self.i1.pk)+'/',{'nombre':'hack'}).status_code,403)
        self.assertEqual(self.client.get('/api/instalaciones/'+str(self.i2.pk)+'/').status_code,404)
    def test_technician_cannot_reassign_or_read_foreign_order(self):
        self.client.force_authenticate(self.tech)
        url='/api/security/portal/ordenes/'
        self.assertEqual(len(self.client.get(url).data),1)
        self.assertEqual(self.client.patch(url+str(self.order.pk)+'/',{'tecnico':self.manager.pk}).status_code,403)
        self.assertEqual(self.client.patch(url+str(self.other.pk)+'/',{'diagnostico':'hack'}).status_code,404)
        self.assertEqual(self.client.patch(url+str(self.order.pk)+'/',{'diagnostico':'Revisado'}).status_code,200)
        self.assertIn('diagnostico',self.client.options(url).data['actions']['POST'])
    def test_only_superuser_can_promote(self):
        url=f'/api/security/accounts/{self.tech.pk}/toggle_superadmin/'
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(url).status_code,403)
        self.client.force_authenticate(self.superuser)
        self.assertEqual(self.client.post(url).status_code,200)
        self.tech.refresh_from_db()
        self.assertTrue(self.tech.is_staff and self.tech.is_superuser)
        self.assertEqual(self.client.post(f'/api/security/accounts/{self.superuser.pk}/toggle_superadmin/').status_code,400)
    def test_permission_revocation_is_enforced(self):
        self.client.force_authenticate(self.tech)
        role = self.tech.roles_asignados.get().rol
        role.permissions.remove(Permission.objects.get(content_type__app_label='core', codename='change_ordentrabajo'))
        self.assertEqual(self.client.patch(f'/api/security/portal/ordenes/{self.order.pk}/', {'diagnostico': 'blocked'}).status_code,403)
    def test_matrix_matches_resources_and_saves_real_role_permissions(self):
        self.client.force_authenticate(self.manager)
        response = self.client.get('/api/security/matrix/')
        self.assertEqual(response.status_code, 200)
        resource = next(r for r in response.data['resources'] if r['code'] == 'core-ordentrabajo')
        self.assertEqual(set(resource['permissions']), {'view', 'add', 'change', 'delete'})
        role = self.tech.roles_asignados.get().rol
        permissions = list(role.permissions.exclude(pk=resource['permissions']['change']['id']).values_list('pk', flat=True))
        self.assertEqual(self.client.patch(f'/api/security/roles/{role.pk}/', {'permissions': permissions}, format='json').status_code, 200)
        self.client.force_authenticate(self.tech)
        self.assertEqual(self.client.patch(f'/api/security/portal/ordenes/{self.order.pk}/', {'diagnostico': 'blocked'}).status_code,403)
        self.assertEqual(self.client.get('/api/security/matrix/').status_code,403)
    def test_administrator_checks_are_enforced_but_superuser_bypasses(self):
        from security.models import Resource
        role = self.manager.roles_asignados.get().rol
        role.permissions.remove(Permission.objects.get(content_type__app_label='core', codename='view_instalacion'))
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get('/api/security/portal/instalaciones/').status_code,403)
        self.client.force_authenticate(self.superuser)
        self.assertEqual(self.client.get('/api/security/portal/instalaciones/').status_code,200)
    def test_user_creation_hashes_password_and_ignores_superuser_injection(self):
        self.client.force_authenticate(self.manager)
        response=self.client.post('/api/security/accounts/',{'username':'new','email':'new@example.test','password':'ExamplePass123!','is_superuser':True},format='json')
        self.assertEqual(response.status_code,201,response.data)
        user=m.Usuario.objects.get(username='new')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password('ExamplePass123!'))
        self.assertEqual(self.client.patch(f'/api/security/accounts/{self.manager.pk}/',{'is_active':False}).status_code,400)
    def test_session_login_requires_csrf_and_logout(self):
        client=APIClient(enforce_csrf_checks=True)
        url='/api/security/login/'
        self.assertEqual(client.post(url,{'username':'manager','password':'TestPassword123!'},format='json').status_code,403)
        client.get('/api/csrf/')
        response=client.post(url,{'username':'manager','password':'TestPassword123!'},format='json',HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value)
        self.assertEqual(response.status_code,200)
        self.assertEqual(client.get('/api/security/session/').data['username'],'manager')
        self.assertEqual(client.post('/api/cerrar_sesion/',HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value).status_code,200)
        self.assertIn(client.get('/api/security/session/').status_code,[401,403])
