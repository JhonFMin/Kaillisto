from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def seed_more_demo_data(apps, schema_editor):
    database = schema_editor.connection.alias
    get = lambda name: apps.get_model("core", name).objects.using(database)

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
    Notification = get("Notificacion")
    Event = get("Evento")
    User = get("Usuario")
    Role = apps.get_model("security", "Role").objects.using(database)
    UserRole = apps.get_model("security", "UserRole").objects.using(database)

    community, _ = Community.get_or_create(
        nombre="DEMO · Comunidad Jalia",
        defaults={
            "ubicacion": "Manaure, La Guajira (ficticia)",
            "descripcion": "Comunidad y registros ficticios para probar Kaillisto.",
        },
    )
    operational = InstallationState.get(nombre="Operativa")
    install, _ = Installation.get_or_create(
        comunidad_id=community.pk,
        nombre="DEMO · Centro solar Jalia",
        defaults={
            "ubicacion": "DEMO · Sector central",
            "capacidad": 8,
            "fecha_instalacion": timezone.localdate() - timedelta(days=45),
            "estado_instalacion_id": operational.pk,
        },
    )
    device, _ = Device.get_or_create(
        codigo="DEMO-ESP32-002",
        defaults={
            "instalacion_id": install.pk,
            "modelo": "ESP32 (demo inactivo)",
            "activo": False,
            "api_key_hash": "!disabled-demo-device-no-key",
        },
    )

    voltage = MeasurementType.get(nombre="Voltaje")
    current = MeasurementType.get(nombre="Corriente")
    for kind, low, high in ((voltage, 11, 15), (current, 0, 10)):
        Threshold.get_or_create(
            instalacion_id=install.pk,
            tipo_medicion_id=kind.pk,
            activo=True,
            defaults={"valor_minimo": low, "valor_maximo": high},
        )

    if not Measurement.filter(dispositivo_id=device.pk).exists():
        now = timezone.now()
        values = [(voltage, 12.4, False), (current, 4.2, False), (voltage, 16.1, True)]
        for index, (kind, value, anomalous) in enumerate(values):
            measurement = Measurement.create(
                dispositivo_id=device.pk,
                tipo_medicion_id=kind.pk,
                valor=value,
                es_anomala=anomalous,
            )
            Measurement.filter(pk=measurement.pk).update(
                fecha_hora=now - timedelta(hours=(len(values) - index) * 8)
            )

    alert_type = AlertType.get(nombre="Medición fuera de umbral")
    priority = AlertPriority.get(nombre="Alta")
    alert_state = AlertState.get(nombre="Vigente")
    alert, _ = Alert.get_or_create(
        instalacion_id=install.pk,
        tipo_medicion_id=voltage.pk,
        tipo_alerta_id=alert_type.pk,
        prioridad_id=priority.pk,
        estado_id=alert_state.pk,
        mensaje="DEMO · Voltaje fuera del umbral en Centro solar Jalia.",
    )

    technician_role = Role.filter(name="Técnico de Campo", is_active=True).first()
    technician_assignment = (
        UserRole.filter(
            rol_id=technician_role.pk,
            usuario__is_active=True,
        ).order_by("usuario_id").first()
        if technician_role
        else None
    )
    technician = (
        User.filter(pk=technician_assignment.usuario_id, is_active=True).first()
        if technician_assignment
        else None
    )
    if technician:
        pending = WorkOrderState.get(nombre="Pendiente")
        order, _ = WorkOrder.get_or_create(
            instalacion_id=install.pk,
            descripcion="DEMO · Diagnóstico del Centro solar Jalia.",
            defaults={
                "alerta_id": alert.pk,
                "tecnico_id": technician.pk,
                "estado_id": pending.pk,
            },
        )
        spare, _ = SparePart.get_or_create(
            nombre="DEMO · Fusible solar 15 A",
            defaults={
                "descripcion": "Repuesto ficticio para explorar el flujo de órdenes.",
                "unidad_medida": "unidad",
                "activo": True,
            },
        )
        WorkOrderSparePart.get_or_create(
            orden_trabajo_id=order.pk,
            repuesto_id=spare.pk,
            defaults={"cantidad": 1},
        )
        Notification.get_or_create(
            destinatario_id=technician.pk,
            alerta_id=alert.pk,
            mensaje="DEMO · Se asignó una orden para revisar Centro solar Jalia.",
            defaults={"canal": "in-app", "estado": "demo"},
        )
        Event.get_or_create(
            usuario_id=technician.pk,
            instalacion_id=install.pk,
            tipo="DEMO · Alerta y orden de trabajo",
            descripcion="Datos ficticios para recorrer el flujo técnico de principio a fin.",
        )


class Migration(migrations.Migration):
    dependencies = [
        ("security", "0005_seed_demo_records"),
    ]

    operations = [
        migrations.RunPython(seed_more_demo_data, migrations.RunPython.noop),
    ]
