from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from .models import Dispositivo
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer
from .device_auth import DispositivoAuthentication
from .models import (
    Alerta,
    EstadoAlerta,
    Medicion,
    PrioridadAlerta,
    TipoAlerta,
    TipoMedicion,
    Umbral,
    Repuesto, 
    RepuestoOrdenTrabajo,

)
from .serializers import MedicionSerializer, AlertaSerializer
from .serializers import DispositivoSerializer
from .models import Comunidad, Umbral, EstadoInstalacion, Instalacion
from .serializers import (
    ComunidadSerializer,
    UmbralSerializer,
    EstadoInstalacionSerializer,
    InstalacionSerializer,
    TipoMedicionSerializer,
    RepuestoSerializer,
    RepuestoOrdenTrabajoSerializer,
)
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
)
from rest_framework.response import Response


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

class RecepcionMedicionView(generics.CreateAPIView):
    serializer_class = MedicionSerializer
    authentication_classes = [DispositivoAuthentication]
    permission_classes = []

    def perform_create(self, serializer):
        dispositivo = self.request.user
        dispositivo_recibido = serializer.validated_data["dispositivo"]
        tipo_medicion = serializer.validated_data["tipo_medicion"]
        valor = serializer.validated_data["valor"]

        if dispositivo_recibido != dispositivo:
            raise PermissionDenied(
                "No puedes enviar mediciones de otro dispositivo."
            )

        umbral = Umbral.objects.filter(
            instalacion=dispositivo.instalacion,
            tipo_medicion=tipo_medicion,
            activo=True,
        ).first()

        es_anomala = False

        if umbral is not None:
            es_anomala = (
                valor < umbral.valor_minimo
                or valor > umbral.valor_maximo
            )

        medicion = serializer.save(es_anomala=es_anomala)

        if not es_anomala:
            return

        ultimas_mediciones = list(
            Medicion.objects.filter(
                dispositivo=dispositivo,
                tipo_medicion=tipo_medicion,
            ).order_by("-fecha_hora")[:3]
        )

        hay_tres_anomalias = (
            len(ultimas_mediciones) == 3
            and all(
                lectura.es_anomala
                for lectura in ultimas_mediciones
            )
        )

        if not hay_tres_anomalias:
            return

        tipo_alerta = TipoAlerta.objects.get(
            nombre="Medición fuera de umbral"
        )
        prioridad = PrioridadAlerta.objects.get(nombre="Alta")
        estado_vigente = EstadoAlerta.objects.get(nombre="Vigente")

        alerta_ya_vigente = Alerta.objects.filter(
            instalacion=dispositivo.instalacion,
            tipo_medicion=tipo_medicion,
            tipo_alerta=tipo_alerta,
            estado=estado_vigente,
        ).exists()

        if alerta_ya_vigente:
            return

        Alerta.objects.create(
            instalacion=dispositivo.instalacion,
            tipo_medicion=tipo_medicion,
            tipo_alerta=tipo_alerta,
            prioridad=prioridad,
            estado=estado_vigente,
            mensaje=(
                "Se detectaron tres mediciones consecutivas "
                "fuera del umbral configurado."
            ),
        )
class TipoMedicionViewSet(viewsets.ModelViewSet):
    queryset = TipoMedicion.objects.all().order_by("id_tipo_medicion")
    serializer_class = TipoMedicionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]
class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenTrabajoSerializer
    authentication_classes = [SessionAuthentication]

    def get_queryset(self):
        queryset = OrdenTrabajo.objects.select_related(
            "instalacion",
            "alerta",
            "tecnico",
            "estado",
        ).order_by("-fecha_creacion")

        if self.request.user.is_staff:
            return queryset

        return queryset.filter(tecnico=self.request.user)

    def get_permissions(self):
        if self.action == "create":
            return [IsAdminUser()]

        return [IsAuthenticated()]

    def perform_update(self, serializer):
        orden_anterior = self.get_object()
        estado_anterior = orden_anterior.estado.nombre
        estado_nuevo = serializer.validated_data.get(
            "estado",
            orden_anterior.estado,
        ).nombre

        cambios = {}

        if (
            estado_anterior == "Pendiente"
            and estado_nuevo == "En proceso"
            and orden_anterior.fecha_atencion is None
        ):
            cambios["fecha_atencion"] = timezone.now()

        if (
            estado_nuevo == "Cerrada"
            and orden_anterior.fecha_cierre is None
        ):
            cambios["fecha_cierre"] = timezone.now()

        serializer.save(**cambios)
class UmbralViewSet(viewsets.ModelViewSet):
    queryset = Umbral.objects.select_related(
        "instalacion",
        "tipo_medicion",
    ).order_by("id_umbral")

    serializer_class = UmbralSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]

class AlertaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Alerta.objects.select_related(
        "instalacion",
        "tipo_medicion",
        "tipo_alerta",
        "prioridad",
        "estado",
    ).order_by("-fecha_creacion")

    serializer_class = AlertaSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]
@api_view(["POST"])
@permission_classes([AllowAny])
def iniciar_sesion(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {
                "detail": (
                    "Debes enviar username y password."
                )
            },
            status=400,
        )

    usuario = authenticate(
        request,
        username=username,
        password=password,
    )

    if usuario is None:
        return Response(
            {
                "detail": "Usuario o contraseña inválidos."
            },
            status=401,
        )

    login(request, usuario)

    return Response(
        {
            "id_usuario": usuario.id_usuario,
            "username": usuario.username,
            "es_administrador": usuario.is_staff,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cerrar_sesion(request):
    logout(request)

    return Response(
        {"detail": "Sesión cerrada correctamente."}
    )
class RepuestoViewSet(viewsets.ModelViewSet):
    queryset = Repuesto.objects.all().order_by("nombre")
    serializer_class = RepuestoSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAdminUser]


class RepuestoOrdenTrabajoViewSet(viewsets.ModelViewSet):
    serializer_class = RepuestoOrdenTrabajoSerializer
    authentication_classes = [SessionAuthentication]

    def get_queryset(self):
        queryset = RepuestoOrdenTrabajo.objects.select_related(
            "orden_trabajo",
            "repuesto",
        ).order_by("-id_repuesto_orden_trabajo")

        if self.request.user.is_staff:
            return queryset

        return queryset.filter(
            orden_trabajo__tecnico=self.request.user
        )

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        orden = serializer.validated_data["orden_trabajo"]

        if (
            not self.request.user.is_staff
            and orden.tecnico != self.request.user
        ):
            raise PermissionDenied(
                "No puedes registrar repuestos "
                "en una orden que no tienes asignada."
            )

        serializer.save()