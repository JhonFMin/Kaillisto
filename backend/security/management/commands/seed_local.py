from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Permission
from django.contrib.auth.hashers import make_password
from django.db import transaction
from core import models as m
from security.models import Role, UserRole

class Command(BaseCommand):
    help = 'Crea una pequeña demostración local sin borrar ni reemplazar datos existentes.'
    def add_arguments(self, parser):
        parser.add_argument('--password', required=True)
    @transaction.atomic
    def handle(self, *args, **options):
        roles = {}
        for name in ['Administrador', 'Técnico de Campo', 'Líder Comunitario']:
            roles[name], _ = Role.objects.get_or_create(name=name)
        domain = Permission.objects.filter(content_type__app_label='core')
        roles['Administrador'].permissions.add(*domain)
        read = domain.filter(codename__startswith='view_')
        for name in ['Técnico de Campo', 'Líder Comunitario']:
            roles[name].permissions.add(*read)
        roles['Técnico de Campo'].permissions.add(*domain.filter(codename__in=['change_ordentrabajo', 'add_repuestoordentrabajo']))
        community, _ = m.Comunidad.objects.get_or_create(nombre='Demo local · Walirü', defaults={'ubicacion': 'La Guajira', 'descripcion': 'Comunidad ficticia para demostración local.'})
        users = {}
        for username, role_name, superuser in [('superadmin.local','Administrador',True), ('admin.local','Administrador',False), ('tecnico.local','Técnico de Campo',False), ('lider.local','Líder Comunitario',False)]:
            user, created = m.Usuario.objects.get_or_create(username=username, defaults={'email': username+'@example.test', 'comunidad':community, 'is_superuser':superuser,'is_staff':superuser})
            if created:
                user.set_password(options['password'])
                user.save()
            UserRole.objects.get_or_create(usuario=user, rol=roles[role_name])
            users[username] = user
        states = {}
        for name in ['Operativa','En mantenimiento','Fuera de línea']:
            states[name], _ = m.EstadoInstalacion.objects.get_or_create(nombre=name)
        order_states = {}
        for name in ['Pendiente','En proceso','Cerrada','Cancelada']:
            order_states[name], _ = m.EstadoOrdenTrabajo.objects.get_or_create(nombre=name)
        for name in ['Vigente','En atención','Cerrada']:
            m.EstadoAlerta.objects.get_or_create(nombre=name)
        for name in ['Baja','Media','Alta','Crítica']:
            m.PrioridadAlerta.objects.get_or_create(nombre=name)
        m.TipoAlerta.objects.get_or_create(nombre='Medición fuera de umbral')
        volt, _ = m.TipoMedicion.objects.get_or_create(nombre='Voltaje',defaults={'unidad':'V'})
        m.TipoMedicion.objects.get_or_create(nombre='Corriente',defaults={'unidad':'A'})
        installation, _ = m.Instalacion.objects.get_or_create(nombre='Demo local · Estación solar Walirü',comunidad=community,defaults={'ubicacion':'La Guajira','capacidad':5,'fecha_instalacion':date(2026,10,1),'estado_instalacion':states['Operativa']})
        m.Dispositivo.objects.get_or_create(codigo='ESP32-LOCAL-01',defaults={'instalacion':installation,'modelo':'ESP32','api_key_hash':make_password('demo-local-esp32-key-0123456789abcdef')})
        m.Umbral.objects.get_or_create(instalacion=installation,tipo_medicion=volt,activo=True,defaults={'valor_minimo':11,'valor_maximo':15})
        m.OrdenTrabajo.objects.get_or_create(instalacion=installation,descripcion='Revisión preventiva local del sistema solar.',defaults={'tecnico':users['tecnico.local'],'estado':order_states['Pendiente']})
        m.Repuesto.objects.get_or_create(nombre='Demo · Conector MC4',defaults={'descripcion':'Repuesto para demostración'})
        self.stdout.write(self.style.SUCCESS('Demostración lista: superadmin.local, admin.local, tecnico.local, lider.local.'))
