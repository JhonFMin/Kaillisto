from datetime import timedelta

from django.db import migrations
from django.utils import timezone


COMMUNITIES = [
    ("Uribia", "Sector periurbano"), ("Manaure", "Zona rural"),
    ("Maicao", "Corredor residencial norte"), ("Riohacha", "Sector sur"),
    ("Albania", "Área rural"), ("Fonseca", "Zona residencial"),
]


def replace_demo_data(apps, schema_editor):
    db = schema_editor.connection.alias
    model = lambda name: apps.get_model("core", name).objects.using(db)
    Community, Installation = model("Comunidad"), model("Instalacion")
    Device, Measurement, Threshold = model("Dispositivo"), model("Medicion"), model("Umbral")
    Alert, WorkOrder = model("Alerta"), model("OrdenTrabajo")
    Spare, WorkPart = model("Repuesto"), model("RepuestoOrdenTrabajo")
    Event, Notification = model("Evento"), model("Notificacion")

    demo_communities = Community.filter(nombre__istartswith="DEMO")
    demo_installations = Installation.filter(nombre__istartswith="DEMO") | Installation.filter(ubicacion__istartswith="DEMO")
    community_ids = list(demo_communities.values_list("pk", flat=True))
    installation_ids = list(demo_installations.values_list("pk", flat=True))
    installation_ids += list(Installation.filter(comunidad_id__in=community_ids).values_list("pk", flat=True))
    demo_devices = Device.filter(codigo__istartswith="DEMO")
    device_ids = list(demo_devices.values_list("pk", flat=True))
    installation_ids = list(set(installation_ids))
    demo_spares = Spare.filter(nombre__istartswith="DEMO")
    spare_ids = list(demo_spares.values_list("pk", flat=True))
    demo_orders = WorkOrder.filter(descripcion__istartswith="DEMO")
    demo_orders = demo_orders | WorkOrder.filter(instalacion_id__in=installation_ids)
    demo_alerts = Alert.filter(mensaje__istartswith="DEMO") | Alert.filter(instalacion_id__in=installation_ids)
    alert_ids = list(demo_alerts.values_list("pk", flat=True))
    demo_orders = demo_orders | WorkOrder.filter(alerta_id__in=alert_ids)
    order_ids = list(demo_orders.values_list("pk", flat=True))

    Notification.filter(alerta_id__in=alert_ids).delete()
    WorkPart.filter(orden_trabajo_id__in=order_ids).delete()
    Event.filter(instalacion_id__in=installation_ids).delete()
    Event.filter(tipo__istartswith="DEMO").delete()
    WorkOrder.filter(pk__in=order_ids).delete()
    Alert.filter(pk__in=alert_ids).delete()
    Threshold.filter(instalacion_id__in=installation_ids).delete()
    Measurement.filter(dispositivo_id__in=device_ids).delete()
    Device.filter(pk__in=device_ids).delete()
    Installation.filter(pk__in=installation_ids).delete()
    apps.get_model("core", "Usuario").objects.using(db).filter(comunidad_id__in=community_ids).update(comunidad_id=None)
    Community.filter(pk__in=community_ids).delete()
    # Retain a marked spare if a non-demo work order still references it.
    Spare.filter(pk__in=spare_ids, usos_en_ordenes__isnull=True).delete()
    for spare in Spare.filter(pk__in=spare_ids, usos_en_ordenes__isnull=False).distinct():
        spare.nombre = f"Insumo conservado {spare.pk}"
        spare.descripcion = "Inventario conservado porque una orden no demostrativa lo tiene asociado."
        spare.save(update_fields=["nombre", "descripcion"])

    User = apps.get_model("core", "Usuario")
    UserRole = apps.get_model("security", "UserRole")
    Role = apps.get_model("security", "Role")
    technician_role = Role.objects.using(db).filter(name="Técnico de Campo", is_active=True).first()
    technician_id = None
    if technician_role:
        assignment = UserRole.objects.using(db).filter(
            rol_id=technician_role.pk, usuario__is_active=True,
        ).order_by("usuario_id").first()
        technician_id = assignment.usuario_id if assignment else None
    admin = User.objects.using(db).filter(is_active=True, is_superuser=True).order_by("pk").first()
    if admin is None:
        admin = User.objects.using(db).filter(is_active=True).order_by("pk").first()
    owner_id = admin.pk if admin else None
    technician_id = technician_id or owner_id
    if owner_id is None:
        return

    InstallationState = model("EstadoInstalacion")
    OrderState = model("EstadoOrdenTrabajo")
    MeasurementType = model("TipoMedicion")
    AlertType, Priority, AlertState = model("TipoAlerta"), model("PrioridadAlerta"), model("EstadoAlerta")
    operational = InstallationState.filter(nombre="Operativa").first()
    if operational is None:
        operational = InstallationState.create(nombre="Operativa", descripcion="Sistema en servicio")
    pending = OrderState.filter(nombre="Pendiente").first()
    if pending is None:
        pending = OrderState.create(nombre="Pendiente", descripcion="Pendiente de atención")
    alert_type = AlertType.filter(nombre="Medición fuera de umbral").first()
    if alert_type is None:
        alert_type = AlertType.create(nombre="Medición fuera de umbral")
    priority = Priority.filter(nombre="Media").first() or Priority.filter(nombre="Alta").first()
    if priority is None:
        priority = Priority.create(nombre="Media")
    open_state = AlertState.filter(nombre="Vigente").first()
    if open_state is None:
        open_state = AlertState.create(nombre="Vigente")
    voltage, _ = MeasurementType.get_or_create(nombre="Voltaje", defaults={"unidad": "V"})
    current, _ = MeasurementType.get_or_create(nombre="Corriente", defaults={"unidad": "A"})
    temperature, _ = MeasurementType.get_or_create(nombre="Temperatura", defaults={"unidad": "°C"})
    parts = []
    for name, unit in [("Fusible fotovoltaico 15 A", "unidad"), ("Conector MC4", "unidad"),
                       ("Cable solar 6 mm²", "metro"), ("Controlador de carga 40 A", "unidad"),
                       ("Batería ciclo profundo 12 V", "unidad"), ("Terminal para batería", "unidad")]:
        spare, _ = Spare.get_or_create(nombre=name, defaults={"descripcion": "Insumo de mantenimiento para simulación académica.", "unidad_medida": unit, "activo": True})
        parts.append(spare)

    now = timezone.now()
    installs = []
    for index, (municipality, sector) in enumerate(COMMUNITIES):
        community, _ = Community.get_or_create(
            nombre=f"Simulación · {municipality} · {sector}",
            defaults={
                "ubicacion": f"{sector}, {municipality}, La Guajira",
                "descripcion": "Registro académico ficticio; no representa una instalación real.",
                "latitud": 11.5 + index * 0.07,
                "longitud": -72.5 - index * 0.08,
            },
        )
        for mode in ("comunitaria", "residencial"):
            suffix = "Sistema comunitario" if mode == "comunitaria" else "Vivienda de prueba"
            name = f"Simulación · {suffix} · {municipality}"
            latitude, longitude = 11.5 + index * 0.07, -72.5 - index * 0.08
            defaults = {
                "tipo": mode,
                "comunidad_id": community.pk if mode == "comunitaria" else None,
                "responsable_id": owner_id,
                "nombre": name,
                "direccion": f"Carrera {4 + index} # {12 + index}-20" if mode == "residencial" else "",
                "barrio": sector if mode == "residencial" else "",
                "ubicacion": f"{municipality}, La Guajira",
                "latitud": latitude,
                "longitud": longitude,
                "capacidad": 3.5 + index * 1.2,
                "fecha_instalacion": timezone.localdate() - timedelta(days=40 + index * 13),
                "estado_instalacion_id": operational.pk,
            }
            install, _ = Installation.get_or_create(nombre=name, defaults=defaults)
            installs.append((install, index, mode))

    alerts_created = []
    for idx, (install, municipality_index, mode) in enumerate(installs):
        code = f"SIM-ESP32-{idx + 1:03d}"
        device, _ = Device.get_or_create(codigo=code, defaults={
            "instalacion_id": install.pk, "modelo": "ESP32 (simulación desactivada)",
            "activo": False, "api_key_hash": "!disabled-simulation-device-no-key",
        })
        selected_types = (voltage, current, temperature)
        for type_index, kind in enumerate(selected_types):
            ranges = [(11.5, 14.8), (0.2, 12.0), (5.0, 65.0)]
            low, high = ranges[type_index]
            Threshold.get_or_create(instalacion_id=install.pk, tipo_medicion_id=kind.pk, activo=True,
                                    defaults={"valor_minimo": low, "valor_maximo": high})
            for sample in range(8):
                value = [12.2 + (sample % 5) * 0.18, 3.1 + (sample % 6) * 0.42, 31.0 + (sample % 5) * 1.7][type_index]
                anomalous = sample == 7 and idx % 3 == 0 and type_index == 0
                if anomalous:
                    value = 16.2
                reading = Measurement.create(dispositivo_id=device.pk, tipo_medicion_id=kind.pk,
                                             valor=value, es_anomala=anomalous)
                Measurement.filter(pk=reading.pk).update(fecha_hora=now - timedelta(hours=(24 - sample * 3 + idx % 5)))
        if idx % 2 == 0:
            alert = Alert.create(
                instalacion_id=install.pk, tipo_medicion_id=voltage.pk, tipo_alerta_id=alert_type.pk,
                prioridad_id=priority.pk, estado_id=open_state.pk,
                mensaje=f"Simulación académica · revisar lectura de voltaje en {install.nombre}.",
            )
            alerts_created.append((alert, install, idx))
    for offset, (alert, install, idx) in enumerate(alerts_created):
        if idx % 4 != 0 or not technician_id:
            continue
        order = WorkOrder.create(
            instalacion_id=install.pk, alerta_id=alert.pk, tecnico_id=technician_id,
            estado_id=pending.pk,
            descripcion=f"Simulación académica · inspección preventiva del sistema {install.nombre}.",
            diagnostico="Validar conectores, tensión y estado del controlador.",
        )
        spare = parts[offset % len(parts)]
        WorkPart.get_or_create(orden_trabajo_id=order.pk, repuesto_id=spare.pk,
                               defaults={"cantidad": 1 if spare.unidad_medida == "unidad" else 3})
        Notification.create(destinatario_id=technician_id, alerta_id=alert.pk, canal="in-app",
                            estado="pendiente", mensaje=f"Simulación académica · alerta asociada a {install.nombre}.")
        Event.create(usuario_id=technician_id, instalacion_id=install.pk,
                     tipo="Simulación · Orden creada", descripcion=f"Orden académica de mantenimiento para {install.nombre}.")


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0016_instalacion_latitud_instalacion_longitud"),
        ("security", "0008_seed_solar_owner_role"),
    ]
    operations = [migrations.RunPython(replace_demo_data, migrations.RunPython.noop)]
