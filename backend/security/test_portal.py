from datetime import date, datetime
from django.contrib.auth.models import Permission
from rest_framework.test import APITestCase, APIClient
from core import models as m
from security.models import Role, UserRole
from security.defaults import default_permissions

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
            if name == 'Administrador':
                role.permissions.set(Permission.objects.all())
            else:
                allowed = {
                    'Técnico de Campo': [
                        'view_instalacion', 'view_dispositivo', 'view_umbral',
                        'view_ordentrabajo', 'change_ordentrabajo', 'close_ordentrabajo',
                        'view_estadoordentrabajo', 'view_repuesto',
                        'add_repuestoordentrabajo', 'change_repuestoordentrabajo',
                        'view_alerta', 'view_notificacion',
                    ],
                    'Líder Comunitario': [
                        'view_instalacion', 'view_alerta', 'view_ordentrabajo',
                        'view_dispositivo', 'view_medicion',
                    ],
                }[name]
                role.permissions.set(Permission.objects.filter(codename__in=allowed))
            UserRole.objects.create(usuario=user,rol=role)
        state = m.EstadoInstalacion.objects.create(nombre='Operativa')
        cls.i1=m.Instalacion.objects.create(nombre='Solar A',comunidad=cls.a,ubicacion='A',direccion='Vereda A',barrio='Sector A',latitud='11.550000',longitud='-72.900000',capacidad=5,fecha_instalacion=date.today(),estado_instalacion=state)
        cls.i2=m.Instalacion.objects.create(nombre='Solar B',comunidad=cls.b,ubicacion='B',capacidad=5,fecha_instalacion=date.today(),estado_instalacion=state)
        order_state, _=m.EstadoOrdenTrabajo.objects.get_or_create(nombre='Pendiente')
        cls.order=m.OrdenTrabajo.objects.create(instalacion=cls.i1,tecnico=cls.tech,estado=order_state,descripcion='Test')
        cls.other=m.OrdenTrabajo.objects.create(instalacion=cls.i2,tecnico=cls.manager,estado=order_state,descripcion='Other')

    def test_role_defaults_only_grant_operational_permissions_and_restore_from_admin(self):
        technician_codes = set(default_permissions('Técnico de Campo').values_list('codename', flat=True))
        self.assertTrue({'view_ordentrabajo', 'change_ordentrabajo', 'close_ordentrabajo', 'view_medicion'}.issubset(technician_codes))
        self.assertFalse({
            'view_comunidad', 'view_estadoinstalacion', 'view_tipomedicion',
            'view_estadoalerta', 'view_prioridadalerta', 'view_tipoalerta',
        } & technician_codes)
        homeowner_codes = set(default_permissions('Propietario Solar').values_list('codename', flat=True))
        self.assertTrue({'view_instalacion', 'view_dispositivo', 'view_medicion', 'view_alerta', 'view_ordentrabajo', 'view_notificacion'}.issubset(homeowner_codes))
        self.assertFalse({'change_ordentrabajo', 'close_ordentrabajo', 'view_comunidad', 'view_repuesto'} & homeowner_codes)

        self.client.force_authenticate(self.manager)
        role = self.tech.roles_asignados.get().rol
        response = self.client.post(f'/api/security/roles/{role.pk}/restore-defaults/')
        self.assertEqual(response.status_code, 200, response.data)
        role.refresh_from_db()
        self.assertEqual(
            set(role.permissions.values_list('codename', flat=True)),
            technician_codes,
        )

    def test_homeowner_default_can_follow_only_orders_for_their_own_installation(self):
        homeowner = m.Usuario.objects.create_user(
            username='solar-owner', email='solar-owner@example.test',
            password='TestPassword123!',
        )
        owned_installation = m.Instalacion.objects.create(
            tipo=m.Instalacion.Tipo.RESIDENCIAL, responsable=homeowner,
            nombre='Hogar propietario', direccion='Calle 2', barrio='Centro',
            capacidad=3, fecha_instalacion=date.today(),
            estado_instalacion=self.i1.estado_instalacion,
        )
        own_order = m.OrdenTrabajo.objects.create(
            instalacion=owned_installation, tecnico=self.tech,
            estado=self.order.estado, descripcion='Mantenimiento del hogar',
        )
        owner_role, _ = Role.objects.get_or_create(name='Propietario Solar')
        owner_role.permissions.set(default_permissions('Propietario Solar'))
        UserRole.objects.create(usuario=homeowner, rol=owner_role)
        self.client.force_authenticate(homeowner)

        response = self.client.get(
            '/api/security/portal/ordenes/',
            HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([row['id_orden_trabajo'] for row in response.data], [own_order.pk])

    def test_personal_notification_can_be_marked_read_only_by_its_recipient(self):
        measurement_type, _ = m.TipoMedicion.objects.get_or_create(
            nombre='Voltaje notificación test', defaults={'unidad': 'V'},
        )
        alert_type, _ = m.TipoAlerta.objects.get_or_create(nombre='Notificación test')
        priority, _ = m.PrioridadAlerta.objects.get_or_create(nombre='Media')
        alert_state, _ = m.EstadoAlerta.objects.get_or_create(nombre='Vigente')
        alert = m.Alerta.objects.create(
            instalacion=self.i1,
            tipo_medicion=measurement_type,
            tipo_alerta=alert_type,
            prioridad=priority,
            estado=alert_state,
            mensaje='Aviso para revisar',
        )
        own_notification = m.Notificacion.objects.create(
            destinatario=self.tech, alerta=alert, canal='in-app',
            estado='enviada', mensaje='Revisa el sistema solar.',
        )
        other_notification = m.Notificacion.objects.create(
            destinatario=self.leader, alerta=alert, canal='in-app',
            estado='enviada', mensaje='Aviso de otra persona.',
        )
        self.client.force_authenticate(self.tech)
        url = f'/api/security/portal/notificaciones/{own_notification.pk}/marcar-leida/'
        response = self.client.post(url, HTTP_X_KAILLISTO_WORKSPACE='personal')
        self.assertEqual(response.status_code, 200, response.content)
        own_notification.refresh_from_db()
        first_read_time = own_notification.leida_en
        self.assertIsNotNone(first_read_time)
        self.assertEqual(datetime.fromisoformat(response.data['leida_en']), first_read_time)

        again = self.client.post(url, HTTP_X_KAILLISTO_WORKSPACE='personal')
        own_notification.refresh_from_db()
        self.assertEqual(again.status_code, 200)
        self.assertEqual(own_notification.leida_en, first_read_time)

        hidden = self.client.post(
            f'/api/security/portal/notificaciones/{other_notification.pk}/marcar-leida/',
            HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(hidden.status_code, 404)
        other_notification.refresh_from_db()
        self.assertIsNone(other_notification.leida_en)

    def test_assigned_technician_can_record_and_update_used_parts(self):
        part = m.Repuesto.objects.create(nombre='Cable solar de prueba', unidad_medida='metros')
        self.client.force_authenticate(self.tech)
        url = '/api/security/portal/consumos/'
        created = self.client.post(
            url,
            {'orden_trabajo': self.order.pk, 'repuesto': part.pk, 'cantidad': '1.50'},
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.content)
        consumption_id = created.data['id_repuesto_orden_trabajo']

        updated = self.client.patch(
            f'{url}{consumption_id}/', {'cantidad': '2.50'}, format='json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        consumption = m.RepuestoOrdenTrabajo.objects.get(pk=consumption_id)
        self.assertEqual(str(consumption.cantidad), '2.50')

        foreign_order = self.client.post(
            url,
            {'orden_trabajo': self.other.pk, 'repuesto': part.pk, 'cantidad': '1.00'},
            format='json',
        )
        self.assertIn(foreign_order.status_code, (403, 404))
        self.assertEqual(m.RepuestoOrdenTrabajo.objects.count(), 1)

    def test_anonymous_and_leader_scope(self):
        url='/api/security/portal/instalaciones/'
        self.assertIn(self.client.get(url).status_code,[401,403])
        self.client.force_authenticate(self.leader)
        self.assertEqual([r['id_instalacion'] for r in self.client.get(url).data],[self.i1.pk])
        self.assertEqual(self.client.get(url+str(self.i2.pk)+'/').status_code,404)
        self.assertEqual(self.client.patch(url+str(self.i1.pk)+'/',{'nombre':'hack'}).status_code,403)
        self.assertEqual(self.client.get('/api/instalaciones/'+str(self.i2.pk)+'/').status_code,404)

    def test_personal_navigation_uses_only_non_admin_roles_for_dual_access_account(self):
        UserRole.objects.create(
            usuario=self.leader,
            rol=self.manager.roles_asignados.get().rol,
        )
        self.client.force_authenticate(self.leader)

        personal = self.client.get('/api/security/navigation/?workspace=personal')
        self.assertEqual(personal.status_code, 200)
        self.assertIn('view_instalacion', personal.data['permissions'])
        self.assertIn('view_ordentrabajo', personal.data['permissions'])
        self.assertNotIn('view_usuario', personal.data['permissions'])
        self.assertNotIn('view_role', personal.data['permissions'])
        personal_paths = {resource['menu_path'] for resource in personal.data['resources']}
        self.assertIn('/instalaciones', personal_paths)
        self.assertIn('/mantenimiento', personal_paths)
        self.assertNotIn('/usuarios', personal_paths)
        self.assertNotIn('/roles', personal_paths)

        administration = self.client.get('/api/security/navigation/')
        self.assertEqual(administration.status_code, 200)
        administration_paths = {resource['menu_path'] for resource in administration.data}
        self.assertIn('/usuarios', administration_paths)
        self.assertIn('/roles', administration_paths)

        from security.models import Resource
        alerts_resource = Resource.objects.get(content_type__app_label='core', content_type__model='alerta')
        alerts_resource.menu_visible = False
        alerts_resource.save(update_fields=['menu_visible'])
        hidden_resource_access = self.client.get('/api/security/navigation/?workspace=personal')
        hidden_paths = {resource['menu_path'] for resource in hidden_resource_access.data['resources']}
        self.assertNotIn('/alertas', hidden_paths)

    def test_personal_navigation_does_not_give_superuser_every_resource_automatically(self):
        UserRole.objects.create(
            usuario=self.superuser,
            rol=self.tech.roles_asignados.get().rol,
        )
        self.client.force_authenticate(self.superuser)

        personal = self.client.get('/api/security/navigation/?workspace=personal')
        self.assertEqual(personal.status_code, 200)
        self.assertIn('view_ordentrabajo', personal.data['permissions'])
        self.assertNotIn('view_comunidad', personal.data['permissions'])
        personal_models = {resource['model'] for resource in personal.data['resources']}
        self.assertIn('ordentrabajo', personal_models)
        self.assertNotIn('comunidad', personal_models)
        personal_installations = self.client.get(
            '/api/security/portal/instalaciones/',
            HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(personal_installations.status_code, 200)
        self.assertEqual(personal_installations.data, [])
        administration_installations = self.client.get('/api/security/portal/instalaciones/')
        self.assertEqual(administration_installations.status_code, 200)
        self.assertEqual(len(administration_installations.data), 2)

    def test_personal_workspace_does_not_apply_admin_scope_to_dual_role_measurements(self):
        UserRole.objects.create(
            usuario=self.leader,
            rol=self.manager.roles_asignados.get().rol,
        )
        measurement_type, _ = m.TipoMedicion.objects.get_or_create(
            nombre='Voltaje de prueba', defaults={'unidad': 'V'},
        )
        community_device = m.Dispositivo.objects.create(
            instalacion=self.i1, codigo='leader-device', modelo='ESP32', api_key_hash='hash',
        )
        foreign_device = m.Dispositivo.objects.create(
            instalacion=self.i2, codigo='foreign-device', modelo='ESP32', api_key_hash='hash',
        )
        homeowner = m.Usuario.objects.create_user(
            username='measurement-owner', first_name='Ana', last_name='Solar',
            email='measurement-owner@example.test', password='TestPassword123!',
        )
        residential = m.Instalacion.objects.create(
            tipo=m.Instalacion.Tipo.RESIDENCIAL, responsable=homeowner,
            nombre='Casa Solar', direccion='Calle 1', barrio='Centro',
            ubicacion='Riohacha', latitud='11.540000', longitud='-72.910000',
            capacidad=4, fecha_instalacion=date.today(), estado_instalacion=self.i1.estado_instalacion,
        )
        residential_device = m.Dispositivo.objects.create(
            instalacion=residential, codigo='owner-device', modelo='ESP32', api_key_hash='hash',
        )
        m.Medicion.objects.create(dispositivo=community_device, tipo_medicion=measurement_type, valor='12.40')
        m.Medicion.objects.create(dispositivo=foreign_device, tipo_medicion=measurement_type, valor='13.10')
        m.Medicion.objects.create(dispositivo=residential_device, tipo_medicion=measurement_type, valor='14.20')
        self.client.force_authenticate(self.leader)

        personal = self.client.get(
            '/api/security/portal/recursos/core-medicion/',
            HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(personal.status_code, 200, personal.content)
        self.assertEqual([row['dispositivo_display'] for row in personal.data], ['leader-device'])
        self.assertEqual(personal.data[0]['instalacion_display'], self.i1.nombre)
        self.assertEqual(personal.data[0]['comunidad_display'], self.a.nombre)
        personal_comparison = self.client.get(
            f'/api/security/portal/dispositivos/{community_device.pk}/comparativa/',
            HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(personal_comparison.status_code, 200, personal_comparison.content)
        self.leader.roles_asignados.get(rol__name='Líder Comunitario').rol.permissions.remove(
            Permission.objects.get(content_type__app_label='core', codename='view_medicion')
        )
        restricted_comparison = self.client.get(
            f'/api/security/portal/dispositivos/{community_device.pk}/comparativa/',
            HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(restricted_comparison.status_code, 403)
        personal_update = self.client.patch(
            f'/api/security/portal/ordenes/{self.order.pk}/',
            {'diagnostico': 'No debe usar el permiso de administrador'},
            format='json', HTTP_X_KAILLISTO_WORKSPACE='personal',
        )
        self.assertEqual(personal_update.status_code, 403)

        administration = self.client.get('/api/security/portal/recursos/core-medicion/')
        self.assertEqual(administration.status_code, 200)
        administration_devices = {row['dispositivo_display'] for row in administration.data}
        self.assertTrue({'leader-device', 'foreign-device', 'owner-device'}.issubset(administration_devices))
        administration_update = self.client.patch(
            f'/api/security/portal/ordenes/{self.order.pk}/',
            {'diagnostico': 'Edición administrativa permitida'}, format='json',
        )
        self.assertEqual(administration_update.status_code, 200)
        owner_measurement = next(row for row in administration.data if row['dispositivo_display'] == 'owner-device')
        self.assertEqual(owner_measurement['propietario_display'], 'Ana Solar')
        self.assertEqual(owner_measurement['instalacion_barrio'], 'Centro')
        self.assertEqual(owner_measurement['instalacion_latitud'], '11.540000')
    def test_technician_cannot_reassign_or_read_foreign_order(self):
        self.client.force_authenticate(self.tech)
        url='/api/security/portal/ordenes/'
        orders = self.client.get(url).data
        self.assertEqual(len(orders),1)
        self.assertEqual(orders[0]['instalacion_direccion'], 'Vereda A')
        self.assertEqual(orders[0]['instalacion_barrio'], 'Sector A')
        self.assertEqual(orders[0]['instalacion_ubicacion'], 'A')
        self.assertEqual(orders[0]['instalacion_latitud'], '11.550000')
        self.assertEqual(orders[0]['instalacion_longitud'], '-72.900000')
        self.assertEqual(orders[0]['instalacion_comunidad_display'], 'A')
        self.assertIsNone(orders[0]['alerta_prioridad_display'])
        self.assertEqual(self.client.patch(url+str(self.order.pk)+'/',{'tecnico':self.manager.pk}).status_code,403)
        self.assertEqual(self.client.patch(url+str(self.other.pk)+'/',{'diagnostico':'hack'}).status_code,404)
        self.assertEqual(self.client.patch(url+str(self.order.pk)+'/',{'diagnostico':'Revisado'}).status_code,200)
        self.assertIn('diagnostico',self.client.options(url).data['actions']['POST'])
    def test_only_superuser_can_promote(self):
        url=f'/api/security/accounts/{self.tech.pk}/toggle_superadmin/'
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(url).status_code,403)
        self.client.force_authenticate(self.superuser)
        self.assertEqual(self.client.post(f'/api/security/accounts/{self.superuser.pk}/toggle_superadmin/').status_code,400)
        self.assertEqual(self.client.post(url).status_code,200)
        self.tech.refresh_from_db()
        self.assertTrue(self.tech.is_staff and self.tech.is_superuser)
        self.assertEqual(self.client.post(f'/api/security/accounts/{self.superuser.pk}/toggle_superadmin/').status_code,200)
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
        self.assertEqual(set(resource['permissions']), {'view', 'add', 'change', 'delete', 'close_ordentrabajo'})
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
        response=client.post(url,{'username':'manager','password':'TestPassword123!','challenge_left':2,'challenge_right':3,'challenge_answer':5},format='json',HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value)
        self.assertEqual(response.status_code,200)
        self.assertEqual(client.get('/api/security/session/').data['username'],'manager')
        self.assertEqual(client.post('/api/cerrar_sesion/',HTTP_X_CSRFTOKEN=client.cookies['csrftoken'].value).status_code,200)
        self.assertIn(client.get('/api/security/session/').status_code,[401,403])
