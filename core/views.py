from django.db.migrations import serializer
from rest_framework import viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from .models import Dispositivo
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer
from security.permissions import RoleBasedPermission
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
    Alerta,
    EstadoOrdenTrabajo,
    Instalacion,
    Evento,
    
)
from datetime import timedelta
import csv
from django.http import HttpResponse

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
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
from django.shortcuts import redirect, get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
)
from rest_framework.response import Response
from .notificaciones import notificar_alerta_a_lideres


class ComunidadViewSet(viewsets.ModelViewSet):
    queryset = Comunidad.objects.all().order_by("id_comunidad")
    serializer_class = ComunidadSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Catálogos' # NUEVO
    
class EstadoInstalacionViewSet(viewsets.ModelViewSet):
    queryset = EstadoInstalacion.objects.all().order_by("id_estado_instalacion")
    serializer_class = EstadoInstalacionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Catálogos' # NUEVO


class InstalacionViewSet(viewsets.ModelViewSet):
    queryset = Instalacion.objects.select_related("comunidad", "estado_instalacion").order_by("id_instalacion")
    serializer_class = InstalacionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Instalaciones' # NUEVO
    
class DispositivoViewSet(viewsets.ModelViewSet):
    queryset = Dispositivo.objects.select_related("instalacion").order_by("id_dispositivo")
    serializer_class = DispositivoSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Dispositivos' # NUEVO
    
class RecepcionMedicionView(generics.CreateAPIView):
    serializer_class = MedicionSerializer
    permission_classes = []
    def perform_create(self, serializer):
        dispositivo = self.request.user
        dispositivo_recibido = serializer.validated_data["dispositivo"]
        tipo_medicion = serializer.validated_data["tipo_medicion"]
        valor = serializer.validated_data["valor"]

        if dispositivo_recibido.id_dispositivo != dispositivo.id_dispositivo:
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
        dispositivo.ultima_comunicacion = timezone.now()
        dispositivo.save(
            update_fields=["ultima_comunicacion"]
        )
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

        alerta = Alerta.objects.create(
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
        Evento.objects.create(
            usuario=None,
            instalacion=dispositivo.instalacion,
            tipo="Alerta generada",
            descripcion=(
                f"El sistema generó la alerta "
                f"#{alerta.id_alerta} por tres mediciones "
                f"consecutivas fuera del umbral de "
                f"{tipo_medicion.nombre}."
            ),
        )
        notificar_alerta_a_lideres(alerta)
class TipoMedicionViewSet(viewsets.ModelViewSet):
    queryset = TipoMedicion.objects.all().order_by("id_tipo_medicion")
    serializer_class = TipoMedicionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Catálogos' # NUEVO
    
class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenTrabajoSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # NUEVO
    recurso_nombre = 'Órdenes de Trabajo'
    
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
    def perform_create(self, serializer):
        orden = serializer.save()

        Evento.objects.create(
            usuario=self.request.user,
            instalacion=orden.instalacion,
            tipo="Orden creada y asignada",
            descripcion=(
                f"Se creó la orden #{orden.id_orden_trabajo} "
                f"y se asignó al técnico "
                f"{orden.tecnico.username}."
            ),
        )
    def perform_update(self, serializer):
        orden_anterior = self.get_object()
        estado_anterior = orden_anterior.estado.nombre
        estado_nuevo_obj = serializer.validated_data.get(
            "estado",
            orden_anterior.estado,
        )
        estado_nuevo = estado_nuevo_obj.nombre

        cambios = {}
        evento = None

        if (
            estado_anterior == "Pendiente"
            and estado_nuevo == "En proceso"
            and orden_anterior.fecha_atencion is None
        ):
            cambios["fecha_atencion"] = timezone.now()
            evento = {
                "tipo": "Atención iniciada",
                "descripcion": (
                    f"El técnico {self.request.user.username} "
                    f"inició la atención de la orden "
                    f"#{orden_anterior.id_orden_trabajo}."
                ),
            }

        if (
            estado_nuevo == "Cerrada"
            and orden_anterior.fecha_cierre is None
        ):
            cambios["fecha_cierre"] = timezone.now()
            evento = {
                "tipo": "Orden cerrada",
                "descripcion": (
                    f"Se cerró la orden "
                    f"#{orden_anterior.id_orden_trabajo}."
                ),
            }

        orden_actualizada = serializer.save(**cambios)

        if evento:
            Evento.objects.create(
                usuario=self.request.user,
                instalacion=orden_anterior.instalacion,
                tipo=evento["tipo"],
                descripcion=evento["descripcion"],
            )

        if (
            estado_nuevo == "Cerrada"
            and orden_anterior.alerta is not None
        ):
            estado_alerta_cerrada = EstadoAlerta.objects.filter(
                nombre="Cerrada"
            ).first()

            if (
                estado_alerta_cerrada is not None
                and orden_actualizada.alerta.estado.nombre == "Vigente"
            ):
                alerta = orden_actualizada.alerta
                alerta.estado = estado_alerta_cerrada
                alerta.fecha_cierre = timezone.now()
                alerta.save(
                    update_fields=["estado", "fecha_cierre"]
                )   
class UmbralViewSet(viewsets.ModelViewSet):
    queryset = Umbral.objects.select_related("instalacion", "tipo_medicion").order_by("id_umbral")
    serializer_class = UmbralSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Umbrales' # NUEVO

class AlertaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Alerta.objects.select_related("instalacion", "tipo_medicion", "tipo_alerta", "prioridad", "estado").order_by("-fecha_creacion")
    serializer_class = AlertaSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Alertas' # NUEVO
    
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
    permission_classes = [RoleBasedPermission] # REEMPLAZADO
    recurso_nombre = 'Repuestos' # NUEVO

class RepuestoOrdenTrabajoViewSet(viewsets.ModelViewSet):
    serializer_class = RepuestoOrdenTrabajoSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [RoleBasedPermission] # NUEVO
    recurso_nombre = 'Órdenes de Trabajo' # NUEVO
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

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_resumen(request):
    limite_fuera_linea = timezone.now() - timedelta(hours=24)

    estado_vigente = EstadoAlerta.objects.filter(
        nombre="Vigente"
    ).first()

    estado_en_proceso = EstadoOrdenTrabajo.objects.filter(
        nombre="En proceso"
    ).first()

    instalaciones = Instalacion.objects.select_related(
        "estado_instalacion"
    ).order_by("id_instalacion")

    datos = []

    for instalacion in instalaciones:
        ultima_comunicacion = (
            instalacion.dispositivos
            .order_by("-ultima_comunicacion")
            .values_list("ultima_comunicacion", flat=True)
            .first()
        )

        tiene_alerta = (
            estado_vigente is not None
            and Alerta.objects.filter(
                instalacion=instalacion,
                estado=estado_vigente,
            ).exists()
        )

        en_mantenimiento = (
            estado_en_proceso is not None
            and OrdenTrabajo.objects.filter(
                instalacion=instalacion,
                estado=estado_en_proceso,
            ).exists()
        )

        if en_mantenimiento:
            estado_calculado = "En mantenimiento"
        elif tiene_alerta:
            estado_calculado = "Con alerta"
        elif (
            ultima_comunicacion is None
            or ultima_comunicacion < limite_fuera_linea
        ):
            estado_calculado = "Fuera de línea"
        else:
            estado_calculado = "Normal"

        datos.append(
            {
                "id_instalacion": instalacion.id_instalacion,
                "nombre": instalacion.nombre,
                "ubicacion": instalacion.ubicacion,
                "estado": estado_calculado,
                "ultima_comunicacion": ultima_comunicacion,
            }
        )

    return Response(
        {
            "total_instalaciones": len(datos),
            "normales": sum(
                item["estado"] == "Normal"
                for item in datos
            ),
            "con_alerta": sum(
                item["estado"] == "Con alerta"
                for item in datos
            ),
            "en_mantenimiento": sum(
                item["estado"] == "En mantenimiento"
                for item in datos
            ),
            "fuera_de_linea": sum(
                item["estado"] == "Fuera de línea"
                for item in datos
            ),
            "instalaciones": datos,
        }
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_mediciones_instalacion(request, id_instalacion):
    
    instalacion = get_object_or_404(
        Instalacion,
        id_instalacion=id_instalacion,
    )

    mediciones = Medicion.objects.select_related(
        "dispositivo",
        "tipo_medicion",
    ).filter(
        dispositivo__instalacion=instalacion
    ).order_by("-fecha_hora")

    tipo_medicion = request.query_params.get("tipo_medicion")

    if tipo_medicion:
        mediciones = mediciones.filter(
            tipo_medicion_id=tipo_medicion
        )

    fecha_inicio = request.query_params.get("fecha_inicio")

    if fecha_inicio:
        mediciones = mediciones.filter(
            fecha_hora__date__gte=fecha_inicio
        )

    fecha_fin = request.query_params.get("fecha_fin")

    if fecha_fin:
        mediciones = mediciones.filter(
            fecha_hora__date__lte=fecha_fin
        )

    datos = [
        {
            "id_medicion": medicion.id_medicion,
            "dispositivo": medicion.dispositivo.codigo,
            "tipo_medicion": medicion.tipo_medicion.nombre,
            "unidad": medicion.tipo_medicion.unidad,
            "valor": str(medicion.valor),
            "fecha_hora": medicion.fecha_hora,
            "es_anomala": medicion.es_anomala,
        }
        for medicion in mediciones
    ]

    return Response(
        {
            "id_instalacion": instalacion.id_instalacion,
            "instalacion": instalacion.nombre,
            "total_mediciones": len(datos),
            "mediciones": datos,
        }
    )
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def historial_mantenimientos_instalacion(
    request,
    id_instalacion,
):
    instalacion = get_object_or_404(
        Instalacion,
        id_instalacion=id_instalacion,
    )

    estado_cerrada = EstadoOrdenTrabajo.objects.filter(
        nombre="Cerrada"
    ).first()

    ordenes = OrdenTrabajo.objects.select_related(
        "alerta",
        "tecnico",
        "estado",
    ).prefetch_related(
        "repuestos_utilizados__repuesto"
    ).filter(
        instalacion=instalacion,
        estado=estado_cerrada,
    ).order_by("-fecha_cierre")

    datos = []

    for orden in ordenes:
        repuestos = [
            {
                "id_repuesto": uso.repuesto.id_repuesto,
                "nombre": uso.repuesto.nombre,
                "unidad_medida": uso.repuesto.unidad_medida,
                "cantidad": str(uso.cantidad),
            }
            for uso in orden.repuestos_utilizados.all()
        ]

        datos.append(
            {
                "id_orden_trabajo": orden.id_orden_trabajo,
                "alerta": orden.alerta_id,
                "tecnico": orden.tecnico.username,
                "estado": orden.estado.nombre,
                "descripcion": orden.descripcion,
                "diagnostico": orden.diagnostico,
                "solucion_aplicada": orden.solucion_aplicada,
                "fecha_creacion": orden.fecha_creacion,
                "fecha_atencion": orden.fecha_atencion,
                "fecha_cierre": orden.fecha_cierre,
                "repuestos": repuestos,
            }
        )

    return Response(
        {
            "id_instalacion": instalacion.id_instalacion,
            "instalacion": instalacion.nombre,
            "total_mantenimientos": len(datos),
            "mantenimientos": datos,
        }
    )
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_mediciones_csv(request, id_instalacion):
    instalacion = get_object_or_404(
        Instalacion,
        id_instalacion=id_instalacion,
    )

    mediciones = Medicion.objects.select_related(
        "dispositivo",
        "tipo_medicion",
    ).filter(
        dispositivo__instalacion=instalacion
    ).order_by("-fecha_hora")

    tipo_medicion = request.query_params.get("tipo_medicion")

    if tipo_medicion:
        mediciones = mediciones.filter(
            tipo_medicion_id=tipo_medicion
        )

    fecha_inicio = request.query_params.get("fecha_inicio")

    if fecha_inicio:
        mediciones = mediciones.filter(
            fecha_hora__date__gte=fecha_inicio
        )

    fecha_fin = request.query_params.get("fecha_fin")

    if fecha_fin:
        mediciones = mediciones.filter(
            fecha_hora__date__lte=fecha_fin
        )

    respuesta = HttpResponse(
        content_type="text/csv",
    )
    respuesta["Content-Disposition"] = (
        f'attachment; filename="mediciones_instalacion_'
        f'{instalacion.id_instalacion}.csv"'
    )

    escritor = csv.writer(respuesta,delimiter=";",)

    escritor.writerow(
        [
            "ID medicion",
            "Dispositivo",
            "Tipo de medicion",
            "Unidad",
            "Valor",
            "Fecha y hora",
            "Es anomala",
        ]
    )

    for medicion in mediciones:
        escritor.writerow(
            [
                medicion.id_medicion,
                medicion.dispositivo.codigo,
                medicion.tipo_medicion.nombre,
                medicion.tipo_medicion.unidad,
                str(medicion.valor),
                medicion.fecha_hora,
                "Si" if medicion.es_anomala else "No",
            ]
        )

    return respuesta

def formatear_fecha_local(fecha):
    if fecha is None:
        return ""

    fecha_local = timezone.localtime(fecha)

    return fecha_local.strftime("%Y-%m-%d %H:%M:%S")


def formatear_duracion(fecha_inicio, fecha_fin):
    if fecha_inicio is None or fecha_fin is None:
        return ""

    duracion = fecha_fin - fecha_inicio
    segundos_totales = int(duracion.total_seconds())

    horas, resto = divmod(segundos_totales, 3600)
    minutos, segundos = divmod(resto, 60)

    return f"{horas:02d}:{minutos:02d}:{segundos:02d}"

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exportar_mantenimientos_csv(request, id_instalacion): 
    
    instalacion = get_object_or_404(
        Instalacion,
        id_instalacion=id_instalacion,
    )

    estado_cerrada = EstadoOrdenTrabajo.objects.filter(
        nombre="Cerrada"
    ).first()

    ordenes = OrdenTrabajo.objects.select_related(
        "alerta",
        "tecnico",
        "estado",
    ).prefetch_related(
        "repuestos_utilizados__repuesto"
    ).filter(
        instalacion=instalacion,
        estado=estado_cerrada,
    ).order_by("-fecha_cierre")

    respuesta = HttpResponse(
        content_type="text/csv",
    )
    respuesta["Content-Disposition"] = (
        f'attachment; filename="mantenimientos_instalacion_'
        f'{instalacion.id_instalacion}.csv"'
    )

    escritor = csv.writer(respuesta,  delimiter=";",)

    escritor.writerow(
        [
            "ID orden",
            "Alerta",
            "Tecnico",
            "Estado",
            "Descripcion",
            "Diagnostico",
            "Solucion aplicada",
            "Fecha creacion",
            "Fecha atencion",
            "Fecha cierre",
            "Duracion de atencion",
            "Repuestos utilizados",
        ]
    )

    for orden in ordenes:
        repuestos = "; ".join(
            f"{uso.repuesto.nombre} "
            f"({uso.repuesto.unidad_medida}) x {uso.cantidad}"
            for uso in orden.repuestos_utilizados.all()
        )

        escritor.writerow(
            [
                orden.id_orden_trabajo,
                orden.alerta_id or "",
                orden.tecnico.username,
                orden.estado.nombre,
                orden.descripcion,
                orden.diagnostico or "",
                orden.solucion_aplicada or "",
                formatear_fecha_local(orden.fecha_creacion),
                formatear_fecha_local(orden.fecha_atencion),
                formatear_fecha_local(orden.fecha_cierre),
                formatear_duracion(
                    orden.fecha_atencion,
                    orden.fecha_cierre,
                ),
                repuestos,
            ]
        )


    return respuesta
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def instalaciones_lider_comunitario(request):
    usuario = request.user

    es_lider = (
        usuario.rol is not None
        and "lider" in usuario.rol.nombre.lower()
    )

    if not es_lider:
        raise PermissionDenied(
            "Este endpoint es exclusivo para líderes comunitarios."
        )

    if usuario.comunidad is None:
        raise PermissionDenied(
            "El líder comunitario no tiene una comunidad asignada."
        )

    limite_fuera_linea = timezone.now() - timedelta(hours=24)

    estado_vigente = EstadoAlerta.objects.filter(
        nombre="Vigente"
    ).first()

    estado_en_proceso = EstadoOrdenTrabajo.objects.filter(
        nombre="En proceso"
    ).first()

    instalaciones = Instalacion.objects.select_related(
        "estado_instalacion"
    ).filter(
        comunidad=usuario.comunidad
    ).order_by("id_instalacion")

    datos = []

    for instalacion in instalaciones:
        ultima_comunicacion = (
            instalacion.dispositivos
            .order_by("-ultima_comunicacion")
            .values_list("ultima_comunicacion", flat=True)
            .first()
        )

        tiene_alerta = (
            estado_vigente is not None
            and Alerta.objects.filter(
                instalacion=instalacion,
                estado=estado_vigente,
            ).exists()
        )

        en_mantenimiento = (
            estado_en_proceso is not None
            and OrdenTrabajo.objects.filter(
                instalacion=instalacion,
                estado=estado_en_proceso,
            ).exists()
        )

        if en_mantenimiento:
            estado_calculado = "En mantenimiento"
        elif tiene_alerta:
            estado_calculado = "Con alerta"
        elif (
            ultima_comunicacion is None
            or ultima_comunicacion < limite_fuera_linea
        ):
            estado_calculado = "Fuera de línea"
        else:
            estado_calculado = "Normal"

        datos.append(
            {
                "id_instalacion": instalacion.id_instalacion,
                "nombre": instalacion.nombre,
                "ubicacion": instalacion.ubicacion,
                "capacidad": str(instalacion.capacidad),
                "estado": estado_calculado,
                "ultima_comunicacion": ultima_comunicacion,
            }
        )

    return Response(
        {
            "id_comunidad": usuario.comunidad.id_comunidad,
            "comunidad": usuario.comunidad.nombre,
            "total_instalaciones": len(datos),
            "instalaciones": datos,
        }
    )
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def alertas_lider_comunitario(request):
    usuario = request.user

    es_lider = (
        usuario.rol is not None
        and "lider" in usuario.rol.nombre.lower()
    )

    if not es_lider:
        raise PermissionDenied(
            "Este endpoint es exclusivo para líderes comunitarios."
        )

    if usuario.comunidad is None:
        raise PermissionDenied(
            "El líder comunitario no tiene una comunidad asignada."
        )

    estado_vigente = EstadoAlerta.objects.filter(
        nombre="Vigente"
    ).first()

    if estado_vigente is None:
        return Response(
            {
                "id_comunidad": usuario.comunidad.id_comunidad,
                "comunidad": usuario.comunidad.nombre,
                "total_alertas": 0,
                "alertas": [],
            }
        )

    alertas = Alerta.objects.select_related(
        "instalacion",
        "tipo_medicion",
        "tipo_alerta",
        "prioridad",
        "estado",
    ).filter(
        instalacion__comunidad=usuario.comunidad,
        estado=estado_vigente,
    ).order_by("-fecha_creacion")

    datos = [
        {
            "id_alerta": alerta.id_alerta,
            "instalacion": alerta.instalacion.nombre,
            "tipo_medicion": alerta.tipo_medicion.nombre,
            "tipo_alerta": alerta.tipo_alerta.nombre,
            "prioridad": alerta.prioridad.nombre,
            "mensaje": alerta.mensaje,
            "fecha_creacion": alerta.fecha_creacion,
        }
        for alerta in alertas
    ]

    return Response(
        {
            "id_comunidad": usuario.comunidad.id_comunidad,
            "comunidad": usuario.comunidad.nombre,
            "total_alertas": len(datos),
            "alertas": datos,
        }
    )
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_trabajo_lider_comunitario(request):
    usuario = request.user

    es_lider = (
        usuario.rol is not None
        and "lider" in usuario.rol.nombre.lower()
    )

    if not es_lider:
        raise PermissionDenied(
            "Este endpoint es exclusivo para líderes comunitarios."
        )

    if usuario.comunidad is None:
        raise PermissionDenied(
            "El líder comunitario no tiene una comunidad asignada."
        )

    ordenes = OrdenTrabajo.objects.select_related(
        "instalacion",
        "alerta",
        "tecnico",
        "estado",
    ).filter(
        instalacion__comunidad=usuario.comunidad
    ).order_by("-fecha_creacion")

    datos = [
        {
            "id_orden_trabajo": orden.id_orden_trabajo,
            "instalacion": orden.instalacion.nombre,
            "alerta": orden.alerta_id,
            "tecnico": {
                "id_usuario": orden.tecnico.id_usuario,
                "username": orden.tecnico.username,
                "telefono": orden.tecnico.telefono,
            },
            "estado": orden.estado.nombre,
            "descripcion": orden.descripcion,
            "fecha_creacion": orden.fecha_creacion,
            "fecha_atencion": orden.fecha_atencion,
            "fecha_cierre": orden.fecha_cierre,
        }
        for orden in ordenes
    ]

    return Response(
        {
            "id_comunidad": usuario.comunidad.id_comunidad,
            "comunidad": usuario.comunidad.nombre,
            "total_ordenes": len(datos),
            "ordenes_trabajo": datos,
        }
    )
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ficha_instalacion_tecnico(request, id_instalacion):
    usuario = request.user

    es_tecnico = (
        usuario.rol is not None
        and "tecnico" in usuario.rol.nombre.lower()
    )

    if not es_tecnico:
        raise PermissionDenied(
            "Este endpoint es exclusivo para técnicos."
        )

    orden_asignada = OrdenTrabajo.objects.filter(
        instalacion_id=id_instalacion,
        tecnico=usuario,
    ).exists()

    if not orden_asignada:
        raise PermissionDenied(
            "No tienes una orden asignada para esta instalación."
        )

    instalacion = get_object_or_404(
        Instalacion.objects.select_related(
            "comunidad",
            "estado_instalacion",
        ),
        id_instalacion=id_instalacion,
    )

    return Response(
        {
            "id_instalacion": instalacion.id_instalacion,
            "nombre": instalacion.nombre,
            "ubicacion": instalacion.ubicacion,
            "capacidad": str(instalacion.capacidad),
            "fecha_instalacion": instalacion.fecha_instalacion,
            "estado_instalacion": instalacion.estado_instalacion.nombre,
            "comunidad": instalacion.comunidad.nombre,
        }
    )