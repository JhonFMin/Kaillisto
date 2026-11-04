from django.db import migrations


def configure_navigation(apps, schema_editor):
    Resource = apps.get_model('security', 'Resource')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    Role = apps.get_model('security', 'Role')
    alias = schema_editor.connection.alias

    medicion_type, _ = ContentType.objects.using(alias).get_or_create(
        app_label='core', model='medicion',
    )
    medicion, _ = Resource.objects.using(alias).get_or_create(
        code='core-medicion',
        defaults={
            'name': 'Mediciones IoT', 'content_type_id': medicion_type.pk,
            'menu_group': 'Red energética', 'menu_icon': 'chart-line',
            'menu_order': 35, 'menu_visible': True, 'is_active': True,
        },
    )
    medicion.name = 'Mediciones IoT'
    medicion.menu_group = 'Red energética'
    medicion.menu_icon = 'chart-line'
    medicion.menu_order = 35
    medicion.menu_visible = True
    medicion.is_active = True
    medicion.save(update_fields=['name', 'menu_group', 'menu_icon', 'menu_order', 'menu_visible', 'is_active'])

    generated_permissions = {}
    for verb, label in [('view', 'consultar'), ('add', 'crear'), ('change', 'editar'), ('delete', 'eliminar')]:
        permission, _ = Permission.objects.using(alias).get_or_create(
            content_type_id=medicion_type.pk,
            codename=f'{verb}_medicion',
            defaults={'name': f'Can {label} mediciones IoT'},
        )
        admin_role = Role.objects.using(alias).filter(name='Administrador', is_active=True).first()
        if admin_role:
            admin_role.permissions.add(permission)
        generated_permissions[verb] = permission

    previous_resource_views = {
        f'view_{model_name}'
        for model_name in Resource.objects.using(alias).filter(is_active=True)
        .exclude(code='core-medicion')
        .values_list('content_type__model', flat=True)
    }
    default_operational_roles = {'Técnico de Campo', 'Líder Comunitario', 'Propietario Solar', 'Administrador'}
    for role in Role.objects.using(alias).all():
        existing = set(role.permissions.values_list('codename', flat=True))
        if role.name in default_operational_roles or (previous_resource_views and previous_resource_views.issubset(existing)):
            role.permissions.add(generated_permissions['view'])

    audit_type, _ = ContentType.objects.using(alias).get_or_create(
        app_label='security', model='securityauditevent',
    )
    audit_resource, _ = Resource.objects.using(alias).get_or_create(
        code='security-securityauditevent',
        defaults={
            'name': 'Auditoría de seguridad', 'content_type_id': audit_type.pk,
            'menu_group': 'Seguridad', 'menu_icon': 'clipboard',
            'menu_order': 40, 'menu_visible': True, 'is_active': True,
        },
    )
    audit_resource.name = 'Auditoría de seguridad'
    audit_resource.menu_group = 'Seguridad'
    audit_resource.menu_icon = 'clipboard'
    audit_resource.menu_order = 40
    audit_resource.menu_visible = True
    audit_resource.is_active = True
    audit_resource.save(update_fields=['name', 'menu_group', 'menu_icon', 'menu_order', 'menu_visible', 'is_active'])
    audit_permission, _ = Permission.objects.using(alias).get_or_create(
        content_type_id=audit_type.pk,
        codename='view_securityauditevent',
        defaults={'name': 'Can view security audit events'},
    )
    if admin_role:
        admin_role.permissions.add(audit_permission)

    configurations = [
        ('core-usuario', 'Usuarios', 'Seguridad', 'users', 20, True),
        ('security-role', 'Roles y recursos', 'Seguridad', 'shield', 10, True),
        ('security-userrole', 'Asignaciones de rol', 'Seguridad', 'users', 30, False),
        ('security-securityauditevent', 'Auditoría de seguridad', 'Seguridad', 'clipboard', 40, True),
    ]
    for code, name, group, icon, order, visible in configurations:
        Resource.objects.using(alias).filter(code=code).update(
            name=name, menu_group=group, menu_icon=icon,
            menu_order=order, menu_visible=visible, is_active=True,
        )
    Resource.objects.using(alias).filter(code='core-idioma').update(
        is_active=False, menu_visible=False,
    )


class Migration(migrations.Migration):
    dependencies = [('security', '0010_configure_resource_menus')]
    operations = [migrations.RunPython(configure_navigation, migrations.RunPython.noop)]
