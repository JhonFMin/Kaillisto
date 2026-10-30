from django.contrib import admin
from .models import DispositivoIoT, InstalacionIoT, MedicionIoT, TipoMedicionIoT

admin.site.register(DispositivoIoT)
admin.site.register(InstalacionIoT)
admin.site.register(MedicionIoT)
admin.site.register(TipoMedicionIoT)