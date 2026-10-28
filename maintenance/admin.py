from django.contrib import admin
from .models import OrdenTrabajoAdmin, RepuestoAdmin, AlertaAdmin, UmbralAdmin

admin.site.register(OrdenTrabajoAdmin)
admin.site.register(RepuestoAdmin)
admin.site.register(AlertaAdmin)
admin.site.register(UmbralAdmin)