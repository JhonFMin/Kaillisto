from django.contrib.auth.hashers import check_password
from rest_framework import authentication
from rest_framework import exceptions

from .models import Dispositivo


class DispositivoAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        api_key = request.headers.get("X-API-Key")

        if not api_key:
            raise exceptions.AuthenticationFailed(
                "Debes enviar el encabezado X-API-Key."
            )

        dispositivos = Dispositivo.objects.filter(
            activo=True
        )

        for dispositivo in dispositivos:
            if check_password(
                api_key,
                dispositivo.api_key_hash,
            ):
                return (dispositivo, api_key)

        raise exceptions.AuthenticationFailed(
            "API key de dispositivo inválida."
        )