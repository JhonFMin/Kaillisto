from django.db import migrations


LEGACY_HOMEOWNER_DEFAULTS = {
    'view_instalacion',
    'view_dispositivo',
    'view_medicion',
    'view_alerta',
    'view_notificacion',
}
HOMEOWNER_DEFAULTS_WITH_ORDERS = LEGACY_HOMEOWNER_DEFAULTS | {'view_ordentrabajo'}


def add_homeowner_order_read(apps, schema_editor):
    Role = apps.get_model('security', 'Role')
    Permission = apps.get_model('auth', 'Permission')
    database = schema_editor.connection.alias
    role = Role.objects.using(database).filter(name='Propietario Solar').first()
    if role is None:
        return

    current_codes = set(role.permissions.filter(
        content_type__app_label='core',
    ).values_list('codename', flat=True))
    if current_codes != LEGACY_HOMEOWNER_DEFAULTS:
        return

    permission = Permission.objects.using(database).filter(
        content_type__app_label='core',
        codename='view_ordentrabajo',
        content_type__rbac_resource__is_active=True,
    ).first()
    if permission:
        role.permissions.add(permission)


def remove_homeowner_order_read(apps, schema_editor):
    Role = apps.get_model('security', 'Role')
    Permission = apps.get_model('auth', 'Permission')
    database = schema_editor.connection.alias
    role = Role.objects.using(database).filter(name='Propietario Solar').first()
    if role is None:
        return

    current_codes = set(role.permissions.filter(
        content_type__app_label='core',
    ).values_list('codename', flat=True))
    if current_codes != HOMEOWNER_DEFAULTS_WITH_ORDERS:
        return

    permission = Permission.objects.using(database).filter(
        content_type__app_label='core',
        codename='view_ordentrabajo',
    ).first()
    if permission:
        role.permissions.remove(permission)


class Migration(migrations.Migration):
    dependencies = [
        ('security', '0012_refine_default_technician_role'),
    ]

    operations = [
        migrations.RunPython(add_homeowner_order_read, remove_homeowner_order_read),
    ]
