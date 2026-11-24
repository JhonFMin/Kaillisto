"""Self-service account registration for people requesting solar service."""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle


User = get_user_model()


class RegistrationThrottle(AnonRateThrottle):
    """Limit anonymous account creation attempts per client address."""
    def get_rate(self):
        return "5/hour"


class AccountRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    first_name = serializers.CharField(max_length=150, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, trim_whitespace=True)
    email = serializers.EmailField(max_length=150)
    telefono = serializers.CharField(max_length=30, allow_blank=True, required=False)
    documento = serializers.CharField(max_length=30, allow_blank=True, required=False)
    password = serializers.CharField(write_only=True, trim_whitespace=False, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return value

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Este correo ya está asociado a una cuenta.")
        return normalized

    def validate_documento(self, value):
        value = value.strip()
        if value and User.objects.filter(documento=value).exists():
            raise serializers.ValidationError("Este documento ya está asociado a una cuenta.")
        return value or None

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], User(username=attrs["username"], email=attrs["email"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegistrationThrottle])
def register_account(request):
    """Create a normal account without business roles or privileged access."""
    serializer = AccountRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response({
        "id": user.pk,
        "username": user.username,
        "detail": "Cuenta creada. Inicia sesión para solicitar la vinculación de tu vivienda o comunidad.",
    }, status=201)
