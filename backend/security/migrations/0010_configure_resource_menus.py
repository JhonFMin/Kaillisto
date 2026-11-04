from django.db import migrations


MENU = {
    'comunidad': ('Red energética', 'map-pin', 10),
    'instalacion': ('Red energética', 'layers', 20),
    'dispositivo': ('Red energética', 'radio', 30),
    'umbral': ('Red energética', 'sliders', 40),
    'alerta': ('Operación y mantenimiento', 'bell', 10),
    'ordentrabajo': ('Operación y mantenimiento', 'wrench', 20),
    'repuesto': ('Operación y mantenimiento', 'package', 30),
    'repuestoordentrabajo': ('Operación y mantenimiento', 'package', 40),
    'notificacion': ('Operación y mantenimiento', 'bell', 50),
    'estadoinstalacion': ('Administración', 'layers', 10),
    'estadoordentrabajo': ('Administración', 'wrench', 20),
    'tipomedicion': ('Administración', 'sliders', 30),
    'estadoalerta': ('Administración', 'bell', 40),
    'prioridadalerta': ('Administración', 'bell', 50),
    'tipoalerta': ('Administración', 'bell', 60),
}


def configure_resources(apps, schema_editor):
    Resource = apps.get_model('security', 'Resource')
    for resource in Resource.objects.all():
        model = resource.content_type.model
        if resource.content_type.app_label == 'core' and model in MENU:
            group, icon, order = MENU[model]
            resource.menu_group = group
            resource.menu_icon = icon
            resource.menu_order = order
            resource.menu_visible = True
        else:
            resource.menu_group = 'Seguridad'
            resource.menu_icon = 'shield'
            resource.menu_order = 100
            resource.menu_visible = False
        resource.save(update_fields=['menu_group', 'menu_icon', 'menu_order', 'menu_visible'])


class Migration(migrations.Migration):
    dependencies = [('security', '0009_alter_resource_options_resource_menu_group_and_more')]
    operations = [migrations.RunPython(configure_resources, migrations.RunPython.noop)]
