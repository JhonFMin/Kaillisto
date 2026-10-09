from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "rol"

    def __str__(self):
        return self.nombre


class Comunidad(models.Model):
    id_comunidad = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    ubicacion = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True)

    class Meta:
        db_table = "comunidad"
        verbose_name_plural = "Comunidades"

    def __str__(self):
        return self.nombre


class Idioma(models.Model):
    id_idioma = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=10, unique=True)
    nombre = models.CharField(max_length=255)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "idioma"

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
    id_usuario = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=150, unique=True)
    documento = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
    )
    telefono = models.CharField(max_length=30, blank=True)

    rol = models.ForeignKey(
        Rol,
        on_delete=models.PROTECT,
        db_column="id_rol",
        null=True,
        blank=True,
        related_name="usuarios",
    )
    comunidad = models.ForeignKey(
        Comunidad,
        on_delete=models.PROTECT,
        db_column="id_comunidad",
        null=True,
        blank=True,
        related_name="usuarios",
    )
    idioma_preferido = models.ForeignKey(
        Idioma,
        on_delete=models.PROTECT,
        db_column="id_idioma_preferido",
        null=True,
        blank=True,
        related_name="usuarios",
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    REQUIRED_FIELDS = ["email"]

    class Meta:
        db_table = "usuario"

    def __str__(self):
        return self.username

class EstadoInstalacion(models.Model):
    id_estado_instalacion = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "estado_instalacion"
        verbose_name = "Estado de instalación"
        verbose_name_plural = "Estados de instalación"

    def __str__(self):
        return self.nombre


class Instalacion(models.Model):
    id_instalacion = models.AutoField(primary_key=True)

    comunidad = models.ForeignKey(
        Comunidad,
        on_delete=models.PROTECT,
        db_column="id_comunidad",
        related_name="instalaciones",
    )

    nombre = models.CharField(max_length=150)
    ubicacion = models.CharField(max_length=255)
    capacidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    fecha_instalacion = models.DateField()

    estado_instalacion = models.ForeignKey(
        EstadoInstalacion,
        on_delete=models.PROTECT,
        db_column="id_estado_instalacion",
        related_name="instalaciones",
    )

    class Meta:
        db_table = "instalacion"
        verbose_name = "Instalación"
        verbose_name_plural = "Instalaciones"

    def __str__(self):
        return self.nombre

class Dispositivo(models.Model):
    id_dispositivo = models.AutoField(primary_key=True)

    instalacion = models.ForeignKey(
        Instalacion,
        on_delete=models.PROTECT,
        db_column="id_instalacion",
        related_name="dispositivos",
    )

    codigo = models.CharField(max_length=100, unique=True)
    modelo = models.CharField(max_length=100)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    ultima_comunicacion = models.DateTimeField(
        null=True,
        blank=True,
    )
    activo = models.BooleanField(default=True)
    api_key_hash = models.CharField(
        max_length=255,
        editable=False,
    )

    class Meta:
        db_table = "dispositivo"

    def __str__(self):
        return self.codigo