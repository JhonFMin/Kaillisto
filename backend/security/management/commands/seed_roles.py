from django.core.management.base import BaseCommand
from security.models import Role

class Command(BaseCommand):
    help = 'Crea los roles iniciales del sistema RBAC sin duplicar ni borrar datos'

    def handle(self, *args, **kwargs):
        roles_iniciales = [
            {
                "name": "Administrador",
                "description": "Acceso total al sistema. Puede gestionar roles, usuarios y configuraciones."
            },
            {
                "name": "Empleado",
                "description": "Acceso limitado a la operación diaria según módulos asignados."
            },
            {
                "name": "Consulta",
                "description": "Acceso de solo lectura. No puede modificar ni eliminar registros."
            }
        ]

        self.stdout.write(self.style.NOTICE('Iniciando carga de roles base...'))

        for rol_data in roles_iniciales:
            # get_or_create busca por el campo 'name'. Si existe, lo devuelve; si no, lo crea con los 'defaults'
            rol, created = Role.objects.get_or_create(
                name=rol_data["name"],
                defaults={'description': rol_data["description"]}
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f'[NUEVO] Rol "{rol.name}" creado correctamente.'))
            else:
                self.stdout.write(self.style.WARNING(f'[EXISTE] Rol "{rol.name}" ya existía en la base de datos. Saltando...'))

        self.stdout.write(self.style.SUCCESS('Proceso de seed finalizado.'))