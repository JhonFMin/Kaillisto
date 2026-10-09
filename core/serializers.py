from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Alerta, Medicion, TipoMedicion
from .models import Dispositivo
from .models import Comunidad, EstadoInstalacion, Instalacion, Umbral, OrdenTrabajo, Repuesto, RepuestoOrdenTrabajo
class ComunidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comunidad
        fields = [
            "id_comunidad",
            "nombre",
            "ubicacion",
            "descripcion",
        ]
        read_only_fields = ["id_comunidad"]

class EstadoInstalacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoInstalacion
        fields = [
            "id_estado_instalacion",
            "nombre",
            "descripcion",
        ]
        read_only_fields = ["id_estado_instalacion"]


class InstalacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instalacion
        fields = [
            "id_instalacion",
            "comunidad",
            "nombre",
            "ubicacion",
            "capacidad",
            "fecha_instalacion",
            "estado_instalacion",
        ]
        read_only_fields = ["id_instalacion"]

    def validate_capacidad(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "La capacidad debe ser mayor que cero."
            )
        return value

class DispositivoSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField(
        write_only=True,
        min_length=32,
        max_length=128,
        required=False,
        trim_whitespace=False,
    )

    class Meta:
        model = Dispositivo
        fields = [
            "id_dispositivo",
            "instalacion",
            "codigo",
            "modelo",
            "fecha_registro",
            "ultima_comunicacion",
            "activo",
            "api_key",
        ]
        read_only_fields = [
            "id_dispositivo",
            "fecha_registro",
            "ultima_comunicacion",
        ]

    def validate(self, attrs):
        if self.instance is None and "api_key" not in attrs:
            raise serializers.ValidationError(
                {"api_key": "Debes proporcionar una clave para el dispositivo."}
            )
        return attrs

    def create(self, validated_data):
        api_key = validated_data.pop("api_key")
        validated_data["api_key_hash"] = make_password(api_key)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        api_key = validated_data.pop("api_key", None)

        if api_key is not None:
            validated_data["api_key_hash"] = make_password(api_key)

        return super().update(instance, validated_data)

class MedicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicion
        fields = [
            "id_medicion",
            "dispositivo",
            "tipo_medicion",
            "valor",
            "fecha_hora",
            "es_anomala",
        ]
        read_only_fields = [
            "id_medicion",
            "fecha_hora",
            "es_anomala",
        ]

class TipoMedicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMedicion
        fields = [
            "id_tipo_medicion",
            "nombre",
            "unidad",
            "descripcion",
        ]
        read_only_fields = ["id_tipo_medicion"]     

class UmbralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Umbral
        fields = [
            "id_umbral",
            "instalacion",
            "tipo_medicion",
            "valor_minimo",
            "valor_maximo",
            "fecha_inicio",
            "fecha_fin",
            "activo",
        ]
        read_only_fields = [
            "id_umbral",
            "fecha_inicio",
        ]

    def validate(self, attrs):
        minimo = attrs.get(
            "valor_minimo",
            getattr(self.instance, "valor_minimo", None),
        )
        maximo = attrs.get(
            "valor_maximo",
            getattr(self.instance, "valor_maximo", None),
        )

        if minimo is not None and maximo is not None and minimo >= maximo:
            raise serializers.ValidationError(
                {
                    "valor_maximo": (
                        "El valor máximo debe ser mayor "
                        "que el valor mínimo."
                    )
                }
            )

        return attrs
class AlertaSerializer(serializers.ModelSerializer):
    instalacion_nombre = serializers.CharField(
        source="instalacion.nombre",
        read_only=True,
    )
    tipo_medicion_nombre = serializers.CharField(
        source="tipo_medicion.nombre",
        read_only=True,
    )
    tipo_alerta_nombre = serializers.CharField(
        source="tipo_alerta.nombre",
        read_only=True,
    )
    prioridad_nombre = serializers.CharField(
        source="prioridad.nombre",
        read_only=True,
    )
    estado_nombre = serializers.CharField(
        source="estado.nombre",
        read_only=True,
    )

    class Meta:
        model = Alerta
        fields = [
            "id_alerta",
            "instalacion",
            "instalacion_nombre",
            "tipo_medicion",
            "tipo_medicion_nombre",
            "tipo_alerta",
            "tipo_alerta_nombre",
            "prioridad",
            "prioridad_nombre",
            "estado",
            "estado_nombre",
            "mensaje",
            "fecha_creacion",
            "fecha_cierre",
        ]
        read_only_fields = [
            "id_alerta",
            "fecha_creacion",
            "fecha_cierre",
        ]


class OrdenTrabajoSerializer(serializers.ModelSerializer):
    instalacion_nombre = serializers.CharField(
        source="instalacion.nombre",
        read_only=True,
    )
    alerta_mensaje = serializers.CharField(
        source="alerta.mensaje",
        read_only=True,
    )
    tecnico_nombre = serializers.CharField(
        source="tecnico.username",
        read_only=True,
    )
    estado_nombre = serializers.CharField(
        source="estado.nombre",
        read_only=True,
    )

    class Meta:
        model = OrdenTrabajo
        fields = [
            "id_orden_trabajo",
            "instalacion",
            "instalacion_nombre",
            "alerta",
            "alerta_mensaje",
            "tecnico",
            "tecnico_nombre",
            "estado",
            "estado_nombre",
            "descripcion",
            "diagnostico",
            "solucion_aplicada",
            "fecha_creacion",
            "fecha_atencion",
            "fecha_cierre",
        ]
        read_only_fields = [
            "id_orden_trabajo",
            "fecha_creacion",
        ]
class RepuestoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Repuesto
        fields = [
            "id_repuesto",
            "nombre",
            "descripcion",
            "unidad_medida",
            "activo",
        ]
        read_only_fields = ["id_repuesto"]


class RepuestoOrdenTrabajoSerializer(serializers.ModelSerializer):
    repuesto_nombre = serializers.CharField(
        source="repuesto.nombre",
        read_only=True,
    )
    unidad_medida = serializers.CharField(
        source="repuesto.unidad_medida",
        read_only=True,
    )

    class Meta:
        model = RepuestoOrdenTrabajo
        fields = [
            "id_repuesto_orden_trabajo",
            "orden_trabajo",
            "repuesto",
            "repuesto_nombre",
            "unidad_medida",
            "cantidad",
        ]
        read_only_fields = [
            "id_repuesto_orden_trabajo",
        ]

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "La cantidad debe ser mayor que cero."
            )
        return value