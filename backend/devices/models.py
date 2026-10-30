from django.db import models
from core.models import Dispositivo, Instalacion, Medicion, TipoMedicion

class DispositivoIoT(Dispositivo):
    class Meta:
        proxy = True
        verbose_name = 'Dispositivo'
        verbose_name_plural = 'Dispositivos'

class InstalacionIoT(Instalacion):
    class Meta:
        proxy = True
        verbose_name = 'Instalación'
        verbose_name_plural = 'Instalaciones'

class MedicionIoT(Medicion):
    class Meta:
        proxy = True
        verbose_name = 'Medición'
        verbose_name_plural = 'Mediciones'

class TipoMedicionIoT(TipoMedicion):
    class Meta:
        proxy = True
        verbose_name = 'Tipo de Medición'
        verbose_name_plural = 'Tipos de Medición'