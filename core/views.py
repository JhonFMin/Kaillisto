from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser
from .models import Dispositivo

from .serializers import DispositivoSerializer
from .models import Comunidad, EstadoInstalacion, Instalacion
from .serializers import (
    ComunidadSerializer,
    EstadoInstalacionSerializer,
    InstalacionSerializer,
)


class ComunidadViewSet(viewsets.ModelViewSet):
    queryset = Comunidad.objects.all().order_by("id_comunidad")
    serializer_class = ComunidadSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]


class EstadoInstalacionViewSet(viewsets.ModelViewSet):
    queryset = EstadoInstalacion.objects.all().order_by(
        "id_estado_instalacion"
    )
    serializer_class = EstadoInstalacionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]


class InstalacionViewSet(viewsets.ModelViewSet):
    queryset = Instalacion.objects.select_related(
        "comunidad",
        "estado_instalacion",
    ).order_by("id_instalacion")

    serializer_class = InstalacionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]
    
class DispositivoViewSet(viewsets.ModelViewSet):
    queryset = Dispositivo.objects.select_related(
        "instalacion"
    ).order_by("id_dispositivo")

    serializer_class = DispositivoSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]