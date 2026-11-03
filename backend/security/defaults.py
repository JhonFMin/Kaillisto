"""Permission presets for the three operational Kaillisto roles."""

from django.contrib.auth.models import Permission


ROLE_PERMISSION_PRESETS = {
    "Técnico de Campo": {
        "instalacion": ("view",),
        "comunidad": ("view",),
        "dispositivo": ("view",),
        "umbral": ("view",),
        "alerta": ("view",),
        "ordentrabajo": ("view", "change"),
        "repuesto": ("view",),
        "repuestoordentrabajo": ("view", "add"),
        "notificacion": ("view",),
        "estadoinstalacion": ("view",),
        "estadoordentrabajo": ("view",),
        "tipomedicion": ("view",),
        "estadoalerta": ("view",),
        "prioridadalerta": ("view",),
        "tipoalerta": ("view",),
    },
    "Líder Comunitario": {
        "comunidad": ("view",),
        "instalacion": ("view",),
        "dispositivo": ("view",),
        "alerta": ("view",),
        "ordentrabajo": ("view",),
        "notificacion": ("view",),
    },
    "Propietario Solar": {
        "instalacion": ("view",),
        "dispositivo": ("view",),
        "alerta": ("view",),
        "notificacion": ("view",),
    },
}

# Operational actions are separate from generic CRUD permissions so a role
# can update an order without automatically receiving authority to close it.
ROLE_EXTRA_PERMISSION_PRESETS = {
    "Técnico de Campo": ("close_ordentrabajo",),
}


def default_permissions(role_name):
    """Return the Django permissions for a built-in role, or None if custom."""
    if role_name == "Administrador":
        return Permission.objects.filter(
            content_type__rbac_resource__is_active=True,
        ).distinct()

    preset = ROLE_PERMISSION_PRESETS.get(role_name)
    if preset is None:
        return None

    codenames = [
        f"{action}_{model}"
        for model, actions in preset.items()
        for action in actions
    ]
    codenames.extend(ROLE_EXTRA_PERMISSION_PRESETS.get(role_name, ()))
    return Permission.objects.filter(
        content_type__rbac_resource__is_active=True,
        content_type__app_label="core",
        codename__in=codenames,
    ).distinct()


def default_permission_codes():
    return {
        name: list(default_permissions(name).values_list("codename", flat=True))
        for name in ("Administrador", *ROLE_PERMISSION_PRESETS)
    }
