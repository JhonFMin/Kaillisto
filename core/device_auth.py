from django.contrib.auth.hashers import check_password
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import Dispositivo


class DispositivoAuthentication(BaseAuthentication):
    def authenticate(self, request):
        api_key = request.headers.get("X-Device-Key")

        if not api_key:
            return None

        codigo = request.headers.get("X-Device-Code")

        if not codigo:
            raise AuthenticationFailed(
                "Falta la cabecera X-Device-Code."
            )

        try:
            dispositivo = Dispositivo.objects.get(
                codigo=codigo,
                activo=True,
            )
        except Dispositivo.DoesNotExist:
            raise AuthenticationFailed(
                "Dispositivo desconocido o inactivo."
            )

        if not check_password(api_key, dispositivo.api_key_hash):
            raise AuthenticationFailed("Clave de dispositivo inválida.")

        return (dispositivo, None)

    def authenticate_header(self, request):
        return "X-Device-Key"