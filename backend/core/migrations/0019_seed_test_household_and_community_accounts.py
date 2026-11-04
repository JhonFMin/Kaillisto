from datetime import timedelta
from decimal import Decimal

from django.db import migrations
from django.utils import timezone


# Shared demo password: karucha123. Store only the encoded Django hash in git.
PASSWORD_HASH = "pbkdf2_sha256$1000000$sydz1LWZfKAD15UWjPGtp3$g/CylMBpHwwUX/yOMkRusUFMEZ3KKtqpCrcfD/2c+rU="

HOUSEHOLDS = [
    ("demo_vivienda_01", "Arelis", "Muestra", "Riohacha", "Barrio solar de prueba", "Cra. 4 # 8-21", 11.540100, -72.906100),
    ("demo_vivienda_02", "Julián", "Ensayo", "Maicao", "Sector residencial ficticio", "Calle 12 # 9-30", 11.378200, -72.240900),
    ("demo_vivienda_03", "María", "Piloto", "Uribia", "Zona de vivienda simulada", "Cra. 7 # 5-18", 11.713400, -72.266700),
]

COMMUNITIES = [
    ("demo_lider_01", "Yurleidis", "Piloto", "Comunidad ficticia Sol de Jepirra", "Manaure", "Sector académico norte", 11.775100, -72.444600),
    ("demo_lider_02", "Andrés", "Prueba", "Comunidad ficticia Brisa de Maicao", "Maicao", "Sector académico oeste", 11.346400, -72.315200),
    ("demo_lider_03", "Maira", "Simulación", "Comunidad ficticia Wüinpumüin", "Uribia", "Sector académico central", 11.810200, -72.178500),
]


def seed_demo_accounts(apps, schema_editor):
    db = schema_editor.connection.alias
    Model = lambda app, name: apps.get_model(app, name).objects.using(db)
    User = Model("core", "Usuario")
    Community = Model("core", "Comunidad")
    Installation = Model("core", "Instalacion")
    Device = Model("core", "Dispositivo")
    Measurement = Model("core", "Medicion")
    MeasurementType = Model("core", "TipoMedicion")
    Threshold = Model("core", "Umbral")
    Alert = Model("core", "Alerta")
    Notification = Model("core", "Notificacion")
    WorkOrder = Model("core", "OrdenTrabajo")
    InstallationState = Model("core", "EstadoInstalacion")
    AlertType = Model("core", "TipoAlerta")
    Priority = Model("core", "PrioridadAlerta")
    AlertState = Model("core", "EstadoAlerta")
    OrderState = Model("core", "EstadoOrdenTrabajo")
    Role = Model("security", "Role")
    UserRole = Model("security", "UserRole")

    homeowner_role = Role.filter(name="Propietario Solar", is_active=True).first()
    leader_role = Role.filter(name="Líder Comunitario", is_active=True).first()
    technician_role = Role.filter(name="Técnico de Campo", is_active=True).first()
    if not (homeowner_role and leader_role and technician_role):
        return

    # Owner accounts can inspect readings and thresholds for their own system.
    Permission = Model("auth", "Permission")
    permission_ids = {
        item.codename: item.pk
        for item in Permission.filter(
            content_type__app_label="core",
            codename__in=[
                "view_comunidad", "view_instalacion", "view_dispositivo", "view_umbral",
                "view_alerta", "view_ordentrabajo", "view_notificacion", "view_tipomedicion",
            ],
        )
    }
    RolePermission = apps.get_model("security", "Role").permissions.through
    for role, codes in (
        (homeowner_role, ["view_instalacion", "view_dispositivo", "view_umbral", "view_alerta", "view_notificacion", "view_tipomedicion"]),
        (leader_role, ["view_comunidad", "view_instalacion", "view_dispositivo", "view_umbral", "view_alerta", "view_ordentrabajo", "view_notificacion", "view_tipomedicion"]),
    ):
        for code in codes:
            if code in permission_ids:
                RolePermission.objects.using(db).get_or_create(role_id=role.pk, permission_id=permission_ids[code])

    users = {}
    def account(username, first_name, last_name, role, community=None):
        user, _ = User.get_or_create(username=username, defaults={
            "first_name": first_name,
            "last_name": last_name,
            "email": f"{username}@example.test",
            "documento": f"SIM-{username[-2:]}-{username[:8]}",
            "comunidad_id": community.pk if community else None,
            "is_active": True,
            "is_staff": False,
            "is_superuser": False,
            "password": PASSWORD_HASH,
        })
        # Keep existing user credentials and profile untouched on reruns.
        UserRole.get_or_create(usuario_id=user.pk, rol_id=role.pk)
        users[username] = user
        return user

    owners = []
    for username, first, last, municipality, neighborhood, address, lat, lon in HOUSEHOLDS:
        owner = account(username, first, last, homeowner_role)
        owners.append((owner, municipality, neighborhood, address, lat, lon))

    leaders = []
    for username, first, last, name, municipality, sector, lat, lon in COMMUNITIES:
        community, _ = Community.get_or_create(nombre=f"Simulación académica · {name}", defaults={
            "ubicacion": f"{municipality}, La Guajira · ubicación aproximada de prueba",
            "municipio": municipality,
            "sector": sector,
            "referencia": "Registro ficticio para pruebas; no identifica una comunidad real.",
            "latitud": Decimal(str(lat)),
            "longitud": Decimal(str(lon)),
            "descripcion": "Datos completamente ficticios de simulación académica.",
        })
        leader = account(username, first, last, leader_role, community)
        leaders.append((leader, community, municipality, sector, lat, lon))

    technician, _ = User.get_or_create(username="demo_tecnico_01", defaults={
        "first_name": "Samuel", "last_name": "Técnico de prueba",
        "email": "demo_tecnico_01@example.test", "documento": "SIM-TEC-001",
        "is_active": True, "is_staff": False, "is_superuser": False,
        "password": PASSWORD_HASH,
    })
    UserRole.get_or_create(usuario_id=technician.pk, rol_id=technician_role.pk)

    operating = InstallationState.filter(nombre="Operativa").first()
    voltage = MeasurementType.filter(nombre__icontains="voltaje").first()
    current = MeasurementType.filter(nombre__icontains="corriente").first()
    temperature = MeasurementType.filter(nombre__icontains="temperatura").first()
    kinds = [item for item in (voltage, current, temperature) if item]
    if not (operating and kinds):
        return
    alert_type = AlertType.filter(nombre="Medición fuera de umbral").first()
    priority = Priority.filter(nombre__in=["Media", "Alta"]).order_by("nombre").first()
    alert_state = AlertState.filter(nombre="Vigente").first()
    pending = OrderState.filter(nombre="Pendiente").first()
    now = timezone.now()
    installation_specs = []
    for index, (owner, municipality, neighborhood, address, lat, lon) in enumerate(owners, 1):
        installation, _ = Installation.get_or_create(nombre=f"Simulación académica · Vivienda solar {index}", defaults={
            "tipo": "residencial", "responsable_id": owner.pk,
            "direccion": address, "barrio": neighborhood,
            "ubicacion": f"{municipality}, La Guajira · punto aproximado de prueba",
            "latitud": Decimal(str(lat)), "longitud": Decimal(str(lon)),
            "capacidad": Decimal("3.50") + Decimal(index),
            "fecha_instalacion": timezone.localdate() - timedelta(days=25 + index * 12),
            "estado_instalacion_id": operating.pk,
        })
        installation_specs.append((installation, owner, index))

    for index, (leader, community, municipality, sector, lat, lon) in enumerate(leaders, 1):
        installation, _ = Installation.get_or_create(nombre=f"Simulación académica · Sistema comunitario {index}", defaults={
            "tipo": "comunitaria", "comunidad_id": community.pk,
            "nombre": f"Simulación académica · Sistema comunitario {index}",
            "ubicacion": f"{municipality}, La Guajira · punto aproximado de prueba",
            "latitud": Decimal(str(lat)), "longitud": Decimal(str(lon)),
            "capacidad": Decimal("8.00") + Decimal(index),
            "fecha_instalacion": timezone.localdate() - timedelta(days=40 + index * 15),
            "estado_instalacion_id": operating.pk,
        })
        installation_specs.append((installation, leader, index + 3))

    for index, (installation, recipient, seed) in enumerate(installation_specs, 1):
        device, _ = Device.get_or_create(codigo=f"SIM-FLUJO-ESP32-{index:02d}", defaults={
            "instalacion_id": installation.pk,
            "modelo": "ESP32 (simulación académica desactivada)",
            "activo": False,
            "api_key_hash": "!disabled-simulation-device-no-key",
        })
        for type_index, kind in enumerate(kinds):
            low, high, base = [(Decimal("11.50"), Decimal("14.80"), 12.4),
                               (Decimal("0.20"), Decimal("12.00"), 5.8),
                               (Decimal("5.00"), Decimal("65.00"), 34.0)][type_index]
            Threshold.get_or_create(instalacion_id=installation.pk, tipo_medicion_id=kind.pk, activo=True, defaults={
                "valor_minimo": low, "valor_maximo": high,
            })
            if not Measurement.filter(dispositivo_id=device.pk, tipo_medicion_id=kind.pk).exists():
                points = []
                for sample in range(72):
                    wave = ((sample * 17 + seed * 11 + type_index * 7) % 19 - 9) / 20
                    value = base + wave * (0.8 if type_index == 0 else 3.0 if type_index == 1 else 6.0)
                    points.append(Measurement(
                        dispositivo_id=device.pk, tipo_medicion_id=kind.pk,
                        valor=Decimal(f"{value:.2f}"),
                        fecha_hora=now - timedelta(hours=(71 - sample) * 4),
                        es_anomala=False,
                    ))
                Measurement.bulk_create(points, batch_size=500)
                # auto_now_add overwrites supplied timestamps during bulk_create.
                # Restore the simulated history in batches for a useful graph.
                Measurement.bulk_update(points, ["fecha_hora"], batch_size=500)

        if alert_type and priority and alert_state:
            alert, _ = Alert.get_or_create(
                instalacion_id=installation.pk,
                tipo_medicion_id=voltage.pk if voltage else kinds[0].pk,
                tipo_alerta_id=alert_type.pk, prioridad_id=priority.pk,
                estado_id=alert_state.pk,
                mensaje=f"Simulación académica · revisión preventiva de {installation.nombre}.",
            )
            Notification.get_or_create(destinatario_id=recipient.pk, alerta_id=alert.pk, defaults={
                "canal": "in-app", "estado": "pendiente",
                "mensaje": f"Simulación académica · hay una alerta preventiva para {installation.nombre}.",
            })
            if pending:
                WorkOrder.get_or_create(instalacion_id=installation.pk, alerta_id=alert.pk, tecnico_id=technician.pk, defaults={
                    "estado_id": pending.pk,
                    "descripcion": f"Simulación académica · inspección preventiva en {installation.nombre}.",
                    "diagnostico": "Revisar terminales, cableado, orientación y operación del controlador.",
                })


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0018_community_location_and_sensor_history"),
        ("security", "0008_seed_solar_owner_role"),
    ]

    operations = [migrations.RunPython(seed_demo_accounts, migrations.RunPython.noop)]
