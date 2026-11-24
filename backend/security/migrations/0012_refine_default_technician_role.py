from django.db import migrations


LEGACY_TECHNICIAN_DEFAULTS = {
    'view_comunidad',
    'view_instalacion',
    'view_dispositivo',
    'view_medicion',
    'view_umbral',
    'view_alerta',
    'view_ordentrabajo',
    'change_ordentrabajo',
    'close_ordentrabajo',
    'view_repuesto',
    'view_repuestoordentrabajo',
    'add_repuestoordentrabajo',
    'view_notificacion',
    'view_estadoinstalacion',
    'view_estadoordentrabajo',
    'view_tipomedicion',
    'view_estadoalerta',
    'view_prioridadalerta',
    'view_tipoalerta',
}

REMOVE_FROM_TECHNICIAN_DEFAULTS = {
    'view_comunidad',
    'view_estadoinstalacion',
    'view_tipomedicion',
    'view_estadoalerta',
    'view_prioridadalerta',
    'view_tipoalerta',
}


def refine_legacy_defaults(apps, schema_editor):
    Role = apps.get_model('security', 'Role')
    Permission = apps.get_model('auth', 'Permission')
    database = schema_editor.connection.alias
    role = Role.objects.using(database).filter(name='Técnico de Campo').first()
    if role is None:
        return

    current_codes = set(role.permissions.filter(
        content_type__app_label='core',
    ).values_list('codename', flat=True))
    if current_codes != LEGACY_TECHNICIAN_DEFAULTS:
        return

    permissions_to_remove = Permission.objects.using(database).filter(
        content_type__app_label='core',
        codename__in=REMOVE_FROM_TECHNICIAN_DEFAULTS,
    )
    role.permissions.remove(*permissions_to_remove)


def restore_legacy_defaults(apps, schema_editor):
    Role = apps.get_model('security', 'Role')
    Permission = apps.get_model('auth', 'Permission')
    database = schema_editor.connection.alias
    role = Role.objects.using(database).filter(name='Técnico de Campo').first()
    if role is None:
        return

    refined_codes = LEGACY_TECHNICIAN_DEFAULTS - REMOVE_FROM_TECHNICIAN_DEFAULTS
    current_codes = set(role.permissions.filter(
        content_type__app_label='core',
    ).values_list('codename', flat=True))
    if current_codes != refined_codes:
        return

    permissions_to_restore = Permission.objects.using(database).filter(
        content_type__app_label='core',
        codename__in=REMOVE_FROM_TECHNICIAN_DEFAULTS,
    )
    role.permissions.add(*permissions_to_restore)


class Migration(migrations.Migration):
    dependencies = [
        ('security', '0011_seed_dynamic_navigation_resources'),
    ]

    operations = [
        migrations.RunPython(refine_legacy_defaults, restore_legacy_defaults),
    ]
