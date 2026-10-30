from django.core.management.base import BaseCommand
from security.models import Role


class Command(BaseCommand):
    help = (
        "Renombra en la base de datos los roles genéricos 'Empleado' y "
        "'Consulta' (del primer seed) a los nombres reales de la "
        "propuesta: 'Técnico de Campo' y 'Líder Comunitario'. Es seguro "
        "ejecutarlo varias veces: si el rol viejo no existe, no hace "
        "nada; si el rol nuevo ya existe, tampoco duplica nada."
    )

    RENOMBRES = {
        "Empleado": "Técnico de Campo",
        "Consulta": "Líder Comunitario",
    }

    def handle(self, *args, **kwargs):
        for nombre_viejo, nombre_nuevo in self.RENOMBRES.items():
            rol = Role.objects.filter(name=nombre_viejo).first()
            if not rol:
                self.stdout.write(self.style.WARNING(
                    f'[SIN CAMBIOS] No existe un rol llamado "{nombre_viejo}".'
                ))
                continue
            if Role.objects.filter(name=nombre_nuevo).exclude(pk=rol.pk).exists():
                self.stdout.write(self.style.ERROR(
                    f'[CONFLICTO] Ya existe un rol "{nombre_nuevo}" distinto. '
                    f'Revisa manualmente qué hacer con "{nombre_viejo}" (id={rol.pk}).'
                ))
                continue
            rol.name = nombre_nuevo
            rol.save(update_fields=["name"])
            self.stdout.write(self.style.SUCCESS(
                f'[RENOMBRADO] "{nombre_viejo}" -> "{nombre_nuevo}" '
                f'(las asignaciones de usuarios a este rol se conservan).'
            ))
