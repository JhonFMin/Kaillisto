from django.contrib.auth.hashers import check_password
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from core.models import Dispositivo

class DeviceAuthentication(BaseAuthentication):
    def authenticate(self, request):
        device_id = request.data.get('dispositivo')
        key = request.headers.get('X-Device-Key', '')
        if not key or not str(device_id).isdigit():
            raise AuthenticationFailed('Envía dispositivo y X-Device-Key.')
        device = Dispositivo.objects.filter(pk=device_id, activo=True).first()
        if not device or not check_password(key, device.api_key_hash):
            raise AuthenticationFailed('Dispositivo o clave inválidos.')
        return device, None
