from django.db import migrations


def add_owner_role(apps, schema_editor):
    Role = apps.get_model('security', 'Role')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    alias = schema_editor.connection.alias
    role, _ = Role.objects.using(alias).get_or_create(
        name='Propietario Solar',
        defaults={'description': 'Consulta el estado de los paneles y equipos solares vinculados a su vivienda.'},
    )
    models = ('instalacion', 'dispositivo', 'alerta', 'notificacion')
    through = Role.permissions.through
    for model_name in models:
        content_type, _ = ContentType.objects.using(alias).get_or_create(
            app_label='core', model=model_name,
        )
        permission, _ = Permission.objects.using(alias).get_or_create(
            content_type_id=content_type.pk,
            codename=f'view_{model_name}',
            defaults={'name': f'Can view {model_name}'},
        )
        through.objects.using(alias).get_or_create(role_id=role.pk, permission_id=permission.pk)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0011_instalacion_responsable_instalacion_tipo_and_more'),
        ('security', '0007_security_audit_sensitive_actions'),
    ]

    operations = [migrations.RunPython(add_owner_role, migrations.RunPython.noop)]
