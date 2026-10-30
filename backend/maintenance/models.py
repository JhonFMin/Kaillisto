from django.db import models
from core.models import OrdenTrabajo, Repuesto, Alerta, Umbral

class OrdenTrabajoAdmin(OrdenTrabajo):
    class Meta:
        proxy = True
        verbose_name = 'Orden de Trabajo'
        verbose_name_plural = 'Órdenes de Trabajo'

class RepuestoAdmin(Repuesto):
    class Meta:
        proxy = True
        verbose_name = 'Repuesto'
        verbose_name_plural = 'Repuestos'

class AlertaAdmin(Alerta):
    class Meta:
        proxy = True
        verbose_name = 'Alerta'
        verbose_name_plural = 'Alertas'

class UmbralAdmin(Umbral):
    class Meta:
        proxy = True
        verbose_name = 'Umbral'
        verbose_name_plural = 'Umbrales'