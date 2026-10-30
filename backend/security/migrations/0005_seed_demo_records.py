from datetime import timedelta

from django.db import migrations
from django.utils import timezone


COMMUNITY_NAME = "DEMO · Comunidad Walirü"
INSTALLATION_NAME = "DEMO · Estación solar Walirü"
DEVICE_CODE = "DEMO-ESP32-001"
ORDER_DESCRIPTION = "DEMO · Inspección preventiva del sistema solar."
ALERT_MESSAGE = "DEMO · Lectura de voltaje de ejemplo para probar la vista de alertas."


def seed_demo_records(apps, schema_editor):
    database = schema_editor.connection.alias
    get = lambda model: apps.get_model("core", model).objects.using(database)

    Community = get("Comunidad")
    Installation = get("Instalacion")
    Device = get("Dispositivo")
    Measurement = get("Medicion")
    MeasurementType = get("TipoMedicion")
    Threshold = get("Umbral")
    Alert = get("Alerta")
    AlertType = get("TipoAlerta")
    AlertPriority = get("PrioridadAlerta")
    AlertState = get("EstadoAlerta")
    InstallationState = get("EstadoInstalacion")
    WorkOrderState = get("EstadoOrdenTrabajo")
    WorkOrder = get("OrdenTrabajo")
    SparePart = get("Repuesto")
    WorkOrderSparePart = get("RepuestoOrdenTrabajo")
    Event = get("Evento")
    Notification = get("Notificacion")
    User = apps.get_model("core", "Usuario").objects.using(database)

    community, _ = Community.get_or_create(
        nombre=COMMUNITY_NAME,
        defaults={
            "ubicacion": "La Guajira (ubicación ficticia)",
            "descripcion": "Datos ficticios marcados DEMO para explorar Kaillisto.",
        },
    )
    installation_state = InstallationState.get(nombre="Operativa")
    installation, _ = Installation.get_or_create(
        comunidad_id=community.pk,
        nombre=INSTALLATION_NAME,
        defaults={
            "ubicacion": "DEMO · Sector norte",
            "capacidad": 5,
            "fecha_instalacion": timezone.localdate() - timedelta(days=30),
            "estado_instalacion_id": installation_state.pk,
        },
    )

    device, _ = Device.get_or_create(
        codigo=DEVICE_CODE,
        defaults={
            "instalacion_id": installation.pk,
            "modelo": "ESP32 (demo inactivo)",
            "activo": False,
            # This is deliberately not a usable Django password hash or API key.
            "api_key_hash": "!disabled-demo-device-no-key",
        },
    )

    voltage = MeasurementType.get(nombre="Voltaje")
    current = MeasurementType.get(nombre="Corriente")
    voltage_threshold, _ = Threshold.get_or_create(
        instalacion_id=installation.pk,
        tipo_medicion_id=voltage.pk,
        activo=True,
        defaults={"valor_minimo": 11, "valor_maximo": 15},
    )
    Threshold.get_or_create(
        instalacion_id=installation.pk,
        tipo_medicion_id=current.pk,
        activo=True,
        defaults={"valor_minimo": 0, "valor_maximo": 10},
    )

    existing_measurements = Measurement.filter(dispositivo_id=device.pk).count()
    if not existing_measurements:
        now = timezone.now()
        voltage_values = [12.2, 12.4, 12.1, 12.7, 12.5, 12.3, 12.8, 16.2]
        current_values = [4.1, 4.3, 4.0, 4.6, 4.4, 4.2, 4.7, 4.5]
        for kind, values in ((voltage, voltage_values), (current, current_values)):
            for index, value in enumerate(values):
                anomalous = kind.pk == voltage.pk and value > 15
                measurement = Measurement.create(
                    dispositivo_id=device.pk,
                    tipo_medicion_id=kind.pk,
                    valor=value,
                    es_anomala=anomalous,
                )
                Measurement.filter(pk=measurement.pk).update(
                    fecha_hora=now - timedelta(hours=(len(values) - index - 1) * 3)
                )

    alert_type = AlertType.get(nombre="Medición fuera de umbral")
    high_priority = AlertPriority.get(nombre="Alta")
    open_state = AlertState.get(nombre="Vigente")
    alert, _ = Alert.get_or_create(
        instalacion_id=installation.pk,
        tipo_medicion_id=voltage.pk,
        tipo_alerta_id=alert_type.pk,
        prioridad_id=high_priority.pk,
        estado_id=open_state.pk,
        mensaje=ALERT_MESSAGE,
    )

    administrator = User.filter(username="kaillisto_demo").first()
    if administrator is None:
        administrator = User.filter(is_superuser=True, is_active=True).order_by("pk").first()

    if administrator is not None:
        pending = WorkOrderState.get(nombre="Pendiente")
        order, _ = WorkOrder.get_or_create(
            instalacion_id=installation.pk,
            descripcion=ORDER_DESCRIPTION,
            defaults={
                "alerta_id": alert.pk,
                "tecnico_id": administrator.pk,
                "estado_id": pending.pk,
            },
        )
        spare_part, _ = SparePart.get_or_create(
            nombre="DEMO · Conector MC4",
            defaults={"descripcion": "Repuesto ficticio para probar órdenes.", "activo": True},
        )
        WorkOrderSparePart.get_or_create(
            orden_trabajo_id=order.pk,
            repuesto_id=spare_part.pk,
            defaults={"cantidad": 2},
        )
        Notification.get_or_create(
            destinatario_id=administrator.pk,
            alerta_id=alert.pk,
            mensaje="DEMO · Hay una alerta de ejemplo para revisar.",
            defaults={"canal": "in-app", "estado": "demo"},
        )
        Event.get_or_create(
            usuario_id=administrator.pk,
            instalacion_id=installation.pk,
            tipo="DEMO · Instalación creada",
            descripcion="Registro ficticio creado para explorar el historial de actividad.",
        )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0010_notificacion"),
        ("security", "0004_seed_initial_roles_and_catalogs"),
    ]

    operations = [
        migrations.RunPython(seed_demo_records, migrations.RunPython.noop),
    ]
