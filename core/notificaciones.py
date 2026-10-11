import logging

from django.conf import settings
from django.utils import timezone

from .models import Notificacion, Usuario

logger = logging.getLogger(__name__)


def _enviar_whatsapp(telefono, texto):
    """Punto de integración con la API de Meta.

    Mientras WHATSAPP_ENABLED sea falso, no se envía nada real.
    Devuelve "simulada" o "enviada".
    """
    if not getattr(settings, "WHATSAPP_ENABLED", False):
        logger.info("WhatsApp simulado hacia %s: %s", telefono, texto)
        return "simulada"

    raise NotImplementedError("La integración con Meta aún no está implementada.")


def notificar_alerta_a_lideres(alerta):
    instalacion = alerta.instalacion
    texto = f"Alerta en {instalacion.nombre}: {alerta.mensaje}"

    lideres = Usuario.objects.filter(
        comunidad=instalacion.comunidad,
        rol__nombre__icontains="lider",
        is_active=True,
    )

    notificaciones = []

    for lider in lideres:
        notificacion = Notificacion.objects.create(
            destinatario=lider,
            alerta=alerta,
            canal="whatsapp",
            mensaje=texto,
        )

        if not lider.telefono:
            notificacion.estado = "fallida"
            notificacion.detalle_error = "El líder no tiene teléfono registrado."
            notificacion.save(update_fields=["estado", "detalle_error"])
            notificaciones.append(notificacion)
            continue

        try:
            notificacion.estado = _enviar_whatsapp(lider.telefono, texto)
            notificacion.fecha_envio = timezone.now()
            notificacion.save(update_fields=["estado", "fecha_envio"])
        except Exception as error:
            logger.exception("Falló el aviso de alerta %s", alerta.id_alerta)
            notificacion.estado = "fallida"
            notificacion.detalle_error = str(error)
            notificacion.save(update_fields=["estado", "detalle_error"])

        notificaciones.append(notificacion)

    return notificaciones