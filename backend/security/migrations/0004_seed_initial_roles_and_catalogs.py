from django.db import migrations


ROLES = [
    (
        "Administrador",
        "Acceso total para gestionar usuarios, roles, comunidades, instalaciones, dispositivos, alertas y órdenes de trabajo.",
    ),
    (
        "Técnico de Campo",
        "Atiende órdenes asignadas y registra diagnósticos, soluciones y repuestos utilizados.",
    ),
    (
        "Líder Comunitario",
        "Consulta el estado de las instalaciones y las alertas de su comunidad.",
    ),
]


def seed_initial_data(apps, schema_editor):
    Role = apps.get_model("security", "Role")
    UserRole = apps.get_model("security", "UserRole")
    Usuario = apps.get_model("core", "Usuario")
    Permission = apps.get_model("auth", "Permission")

    roles = {}
    for name, description in ROLES:
        roles[name], _ = Role.objects.using(schema_editor.connection.alias).get_or_create(
            name=name,
            defaults={"description": description},
        )

    database = schema_editor.connection.alias
    admin_role = roles["Administrador"]
    admin_permissions = Permission.objects.using(database).filter(
        content_type__app_label__in=["core", "devices", "catalogs", "maintenance"]
    )
    admin_role.permissions.add(*admin_permissions)

    for user in Usuario.objects.using(database).filter(is_superuser=True):
        UserRole.objects.using(database).get_or_create(
            usuario_id=user.pk,
            rol_id=admin_role.pk,
            defaults={"asignado_por_id": user.pk},
        )

    catalogs = {
        "EstadoInstalacion": ["Operativa", "En mantenimiento", "Fuera de línea"],
        "EstadoOrdenTrabajo": ["Pendiente", "En proceso", "Cerrada", "Cancelada"],
        "EstadoAlerta": ["Vigente", "En atención", "Cerrada"],
        "PrioridadAlerta": ["Baja", "Media", "Alta", "Crítica"],
        "TipoAlerta": ["Medición fuera de umbral"],
    }
    for model_name, values in catalogs.items():
        Model = apps.get_model("core", model_name)
        for name in values:
            Model.objects.using(database).get_or_create(nombre=name)

    TipoMedicion = apps.get_model("core", "TipoMedicion")
    for name, unit in [("Voltaje", "V"), ("Corriente", "A")]:
        TipoMedicion.objects.using(database).get_or_create(
            nombre=name,
            defaults={"unidad": unit},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_notificacion"),
        ("security", "0003_seed_resources"),
    ]

    operations = [
        migrations.RunPython(seed_initial_data, migrations.RunPython.noop),
    ]
