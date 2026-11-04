import math
from datetime import timedelta
from decimal import Decimal

from django.db import migrations, models
from django.utils import timezone


def add_sensor_history(apps, schema_editor):
    db = schema_editor.connection.alias
    Device = apps.get_model('core', 'Dispositivo')
    Measurement = apps.get_model('core', 'Medicion')
    MeasurementType = apps.get_model('core', 'TipoMedicion')
    devices = Device.objects.using(db).filter(codigo__startswith='SIM-ESP32-').order_by('pk')
    kinds = {item.nombre.lower(): item for item in MeasurementType.objects.using(db).all()}
    selected = []
    for name, fallback in [('voltaje', 12.5), ('corriente', 6.0), ('temperatura', 34.0)]:
        item = next((value for key, value in kinds.items() if name in key), None)
        if item:
            selected.append((name, item, fallback))
    now = timezone.now()
    rows = []
    for device_index, device in enumerate(devices):
        for sample in range(240):  # 30 days at 3-hour intervals, per measurement type.
            at = now - timedelta(hours=(239 - sample) * 3)
            for type_index, (kind, measurement_type, base) in enumerate(selected):
                wave = math.sin((sample + device_index * 7 + type_index * 3) / 8)
                if kind == 'voltaje':
                    value = base + wave * 0.8 + (device_index % 4) * 0.15
                    abnormal = sample % 47 == 0 and device_index % 3 == 0
                    if abnormal:
                        value = 16.2 + device_index * 0.1
                elif kind == 'corriente':
                    value = base + wave * 2.4 + (device_index % 5) * 0.3
                    abnormal = sample % 61 == 0 and device_index % 2 == 0
                    if abnormal:
                        value = 13.8
                else:
                    value = base + wave * 7 + (device_index % 4)
                    abnormal = sample % 73 == 0 and device_index % 4 == 0
                    if abnormal:
                        value = 68.0
                rows.append(Measurement(
                    dispositivo_id=device.pk,
                    tipo_medicion_id=measurement_type.pk,
                    valor=Decimal(f'{value:.2f}'),
                    fecha_hora=at,
                    es_anomala=abnormal,
                ))
    Measurement.objects.using(db).bulk_create(rows, batch_size=1000)


class Migration(migrations.Migration):
    dependencies = [('core', '0017_replace_demo_with_guajira_simulation')]

    operations = [
        migrations.AddField(
            model_name='comunidad', name='municipio',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='comunidad', name='sector',
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name='comunidad', name='referencia',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.RunPython(add_sensor_history, migrations.RunPython.noop),
    ]
