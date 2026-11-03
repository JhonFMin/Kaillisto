from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_sensitive_permissions(apps, schema_editor):
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Role = apps.get_model('security', 'Role')
    database = schema_editor.connection.alias
    codes = [
        ('core', 'ordentrabajo', 'close_ordentrabajo', 'Cerrar órdenes de trabajo'),
        ('security', 'userrole', 'assign_userrole', 'Asignar roles a usuarios'),
        ('security', 'userrole', 'revoke_userrole', 'Retirar roles de usuarios'),
    ]
    created = {}
    for app_label, model, codename, label in codes:
        content_type, _ = ContentType.objects.using(database).get_or_create(
            app_label=app_label, model=model,
        )
        permission, _ = Permission.objects.using(database).get_or_create(
            content_type_id=content_type.pk,
            codename=codename,
            defaults={'name': label},
        )
        created[codename] = permission

    admin_role = Role.objects.using(database).filter(name='Administrador').first()
    if admin_role:
        admin_role.permissions.add(*created.values())
    technician_role = Role.objects.using(database).filter(name='Técnico de Campo').first()
    if technician_role:
        technician_defaults = Permission.objects.using(database).filter(
            content_type__app_label='core',
            codename__in=[
                'view_comunidad', 'view_instalacion', 'view_dispositivo',
                'view_umbral', 'view_alerta', 'view_ordentrabajo',
                'change_ordentrabajo', 'view_repuesto',
                'view_repuestoordentrabajo', 'add_repuestoordentrabajo', 'view_notificacion',
                'view_estadoinstalacion', 'view_estadoordentrabajo',
                'view_tipomedicion', 'view_estadoalerta',
                'view_prioridadalerta', 'view_tipoalerta',
            ],
        )
        technician_role.permissions.add(*technician_defaults, created['close_ordentrabajo'])


def remove_sensitive_permissions(apps, schema_editor):
    Permission = apps.get_model('auth', 'Permission')
    database = schema_editor.connection.alias
    Permission.objects.using(database).filter(
        codename__in=['close_ordentrabajo', 'assign_userrole', 'revoke_userrole'],
        content_type__app_label__in=['core', 'security'],
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('security', '0006_expand_demo_records'),
        ('core', '0010_notificacion'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SecurityAuditEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=60)),
                ('target_type', models.CharField(max_length=60)),
                ('target_id', models.CharField(max_length=80)),
                ('target_label', models.CharField(blank=True, max_length=160)),
                ('changes', models.JSONField(blank=True, default=dict)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='security_audit_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Evento de auditoría de seguridad',
                'verbose_name_plural': 'Eventos de auditoría de seguridad',
                'ordering': ['-created_at', '-pk'],
            },
        ),
        migrations.RunPython(seed_sensitive_permissions, remove_sensitive_permissions),
    ]
