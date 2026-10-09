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
class TipoMedicion(models.Model):
    id_tipo_medicion = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True)
    unidad = models.CharField(max_length=20)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "tipo_medicion"

    def __str__(self):
        return f"{self.nombre} ({self.unidad})"


class Medicion(models.Model):
    id_medicion = models.BigAutoField(primary_key=True)

    dispositivo = models.ForeignKey(
        Dispositivo,
        on_delete=models.PROTECT,
        db_column="id_dispositivo",
        related_name="mediciones",
    )

    tipo_medicion = models.ForeignKey(
        TipoMedicion,
        on_delete=models.PROTECT,
        db_column="id_tipo_medicion",
        related_name="mediciones",
    )

    valor = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    es_anomala = models.BooleanField(default=False)

    class Meta:
        db_table = "medicion"
        ordering = ["-fecha_hora"]

    def __str__(self):
        return f"{self.tipo_medicion}: {self.valor} {self.tipo_medicion.unidad}"

class Umbral(models.Model):
    id_umbral = models.AutoField(primary_key=True)

    instalacion = models.ForeignKey(
        Instalacion,
        on_delete=models.PROTECT,
        db_column="id_instalacion",
        related_name="umbrales",
    )

    tipo_medicion = models.ForeignKey(
        TipoMedicion,
        on_delete=models.PROTECT,
        db_column="id_tipo_medicion",
        related_name="umbrales",
    )

    valor_minimo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    valor_maximo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(
        null=True,
        blank=True,
    )

    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "umbral"
        constraints = [
            models.UniqueConstraint(
                fields=["instalacion", "tipo_medicion", "activo"],
                name="umbral_unico_activo_por_tipo",
            )
        ]

    def __str__(self):
        return (
            f"{self.instalacion} - {self.tipo_medicion}: "
            f"{self.valor_minimo} a {self.valor_maximo}"
        )   

class TipoAlerta(models.Model):
    id_tipo_alerta = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "tipo_alerta"
        verbose_name = "Tipo de alerta"
        verbose_name_plural = "Tipos de alerta"

    def __str__(self):
        return self.nombre


class PrioridadAlerta(models.Model):
    id_prioridad_alerta = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "prioridad_alerta"
        verbose_name = "Prioridad de alerta"
        verbose_name_plural = "Prioridades de alerta"

    def __str__(self):
        return self.nombre


class EstadoAlerta(models.Model):
    id_estado_alerta = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "estado_alerta"
        verbose_name = "Estado de alerta"
        verbose_name_plural = "Estados de alerta"

    def __str__(self):
        return self.nombre


class Alerta(models.Model):
    id_alerta = models.BigAutoField(primary_key=True)

    instalacion = models.ForeignKey(
        Instalacion,
        on_delete=models.PROTECT,
        db_column="id_instalacion",
        related_name="alertas",
    )

    tipo_medicion = models.ForeignKey(
        TipoMedicion,
        on_delete=models.PROTECT,
        db_column="id_tipo_medicion",
        related_name="alertas",
    )

    tipo_alerta = models.ForeignKey(
        TipoAlerta,
        on_delete=models.PROTECT,
        db_column="id_tipo_alerta",
        related_name="alertas",
    )

    prioridad = models.ForeignKey(
        PrioridadAlerta,
        on_delete=models.PROTECT,
        db_column="id_prioridad_alerta",
        related_name="alertas",
    )

    estado = models.ForeignKey(
        EstadoAlerta,
        on_delete=models.PROTECT,
        db_column="id_estado_alerta",
        related_name="alertas",
    )

    mensaje = models.TextField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "alerta"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return (
            f"Alerta #{self.id_alerta} - "
            f"{self.instalacion} - {self.tipo_medicion}"
        )
class EstadoOrdenTrabajo(models.Model):
    id_estado_orden_trabajo = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "estado_orden_trabajo"
        verbose_name = "Estado de orden de trabajo"
        verbose_name_plural = "Estados de órdenes de trabajo"

    def __str__(self):
        return self.nombre


class OrdenTrabajo(models.Model):

    id_orden_trabajo = models.BigAutoField(primary_key=True)

    instalacion = models.ForeignKey(
        Instalacion,
        on_delete=models.PROTECT,
        db_column="id_instalacion",
        related_name="ordenes_trabajo",
    )

    alerta = models.ForeignKey(
        Alerta,
        on_delete=models.PROTECT,
        db_column="id_alerta",
        related_name="ordenes_trabajo",
        null=True,
        blank=True,
    )

    tecnico = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column="id_tecnico",
        related_name="ordenes_asignadas",
    )

    estado = models.ForeignKey(
        EstadoOrdenTrabajo,
        on_delete=models.PROTECT,
        db_column="id_estado_orden_trabajo",
        related_name="ordenes_trabajo",
    )

    descripcion = models.TextField()
    diagnostico = models.TextField(blank=True)
    solucion_aplicada = models.TextField(blank=True)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_atencion = models.DateTimeField(null=True, blank=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "orden_trabajo"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"OT #{self.id_orden_trabajo} - {self.instalacion}"
class Repuesto(models.Model):
    id_repuesto = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.CharField(max_length=255, blank=True)
    unidad_medida = models.CharField(max_length=30, default="unidad")
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = "repuesto"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class RepuestoOrdenTrabajo(models.Model):
    id_repuesto_orden_trabajo = models.BigAutoField(
        primary_key=True,
    )

    orden_trabajo = models.ForeignKey(
        OrdenTrabajo,
        on_delete=models.PROTECT,
        db_column="id_orden_trabajo",
        related_name="repuestos_utilizados",
    )

    repuesto = models.ForeignKey(
        Repuesto,
        on_delete=models.PROTECT,
        db_column="id_repuesto",
        related_name="usos_en_ordenes",
    )

    cantidad = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    class Meta:
        db_table = "repuesto_orden_trabajo"
        constraints = [
            models.UniqueConstraint(
                fields=["orden_trabajo", "repuesto"],
                name="repuesto_unico_por_orden",
            )
        ]

    def __str__(self):
        return (
            f"{self.orden_trabajo} - "
            f"{self.repuesto}: {self.cantidad}"
        )