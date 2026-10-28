from django.db import models
from core.models import EstadoAlerta, EstadoInstalacion, EstadoOrdenTrabajo

class EstadoAlertaCatalog(EstadoAlerta):
    class Meta:
        proxy = True
        verbose_name = 'Estado de Alerta'
        verbose_name_plural = 'Estados de Alerta'

class EstadoInstalacionCatalog(EstadoInstalacion):
    class Meta:
        proxy = True
        verbose_name = 'Estado de Instalación'
        verbose_name_plural = 'Estados de Instalación'

class EstadoOrdenTrabajoCatalog(EstadoOrdenTrabajo):
    class Meta:
        proxy = True
        verbose_name = 'Estado de Orden de Trabajo'
        verbose_name_plural = 'Estados de Órdenes de Trabajo'