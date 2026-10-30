from django.db import migrations

RESOURCES = {
    'comunidad': 'Comunidades', 'instalacion': 'Instalaciones solares',
    'dispositivo': 'Dispositivos IoT', 'umbral': 'Umbrales',
    'alerta': 'Alertas', 'ordentrabajo': 'Órdenes de trabajo',
    'repuesto': 'Repuestos', 'repuestoordentrabajo': 'Repuestos utilizados',
    'notificacion': 'Notificaciones', 'usuario': 'Usuarios',
    'estadoinstalacion': 'Estados de instalación', 'estadoordentrabajo': 'Estados de orden',
    'tipomedicion': 'Tipos de medición', 'estadoalerta': 'Estados de alerta',
    'prioridadalerta': 'Prioridades', 'tipoalerta': 'Tipos de alerta',
}

def seed(apps, schema_editor):
    Resource = apps.get_model('security', 'Resource')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    for app, model, label in [('core', model, label) for model, label in RESOURCES.items()] + [('security', 'role', 'Roles'), ('security', 'userrole', 'Asignaciones de rol')]:
        ct, _ = ContentType.objects.get_or_create(app_label=app, model=model)
        Resource.objects.get_or_create(code=f'{app}-{model}', defaults={'name': label, 'content_type': ct})
        for verb in ['view', 'add', 'change', 'delete']:
            Permission.objects.get_or_create(content_type=ct, codename=f'{verb}_{model}', defaults={'name': f'{verb} {label}'})

class Migration(migrations.Migration):
    dependencies = [('security', '0002_resource')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
