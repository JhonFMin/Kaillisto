from rest_framework import serializers
from django.contrib.auth.hashers import make_password

from .models import Dispositivo
from .models import Comunidad, EstadoInstalacion, Instalacion

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