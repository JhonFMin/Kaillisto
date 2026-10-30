from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Dispositivo

from .models import (
    Comunidad,
    Dispositivo,
    EstadoInstalacion,
    Idioma,
    Instalacion,
    Rol,
    Medicion,
    TipoMedicion,
    Usuario,
    Alerta,
    EstadoAlerta,
    PrioridadAlerta,
    TipoAlerta,
    EstadoOrdenTrabajo,
    OrdenTrabajo,
    Repuesto,
    RepuestoOrdenTrabajo,
    Evento,
)
@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Datos de Ka'iLlisto",
            {
                "fields": (
                    "documento",
                    "telefono",
                    "rol",
                    "comunidad",
                    "idioma_preferido",
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Datos de Ka'iLlisto",
            {
                "fields": (
                    "email",
                    "documento",
                    "telefono",
                    "rol",
                    "comunidad",
                    "idioma_preferido",
                )
            },
        ),
    )

    list_display = (
        "username",
        "email",
        "rol",
        "comunidad",
        "is_active",
    )


admin.site.register(Rol)
admin.site.register(Comunidad)
admin.site.register(Idioma)
admin.site.register(TipoAlerta)
admin.site.register(PrioridadAlerta)
admin.site.register(RepuestoOrdenTrabajo)
admin.site.register(Evento)