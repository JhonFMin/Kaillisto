from django.contrib import admin
from .models import EstadoAlertaCatalog, EstadoInstalacionCatalog, EstadoOrdenTrabajoCatalog

admin.site.register(EstadoAlertaCatalog)
admin.site.register(EstadoInstalacionCatalog)
admin.site.register(EstadoOrdenTrabajoCatalog)