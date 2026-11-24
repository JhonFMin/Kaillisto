from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0020_solicitudvinculacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificacion',
            name='leida_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
