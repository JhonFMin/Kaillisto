from django.core.management.base import BaseCommand
from security.models import Role

class Command(BaseCommand):
    help = 'Crea los roles iniciales del sistema RBAC sin duplicar ni borrar datos'

    def handle(self, *args, **kwargs):
        # Estos 3 roles son los actores reales definidos en la propuesta
        # del proyecto (ver diagrama de casos de uso y RF-01 a RF-33):
        # Administrador, Técnico de Campo y Líder Comunitario. El ESP32
        # no es un rol de usuario: se autentica aparte (RNF-11) y solo
        # envía mediciones por RecepcionMedicionView.
        roles_iniciales = [
            {
                "name": "Administrador",
                "description": "Acceso total: gestiona usuarios, roles, comunidades, instalaciones, dispositivos, umbrales y asigna órdenes de trabajo a los técnicos."
            },
            {
                "name": "Técnico de Campo",
                "description": "Consulta las órdenes de trabajo que tiene asignadas, la ficha técnica de la instalación, y registra diagnóstico, solución, repuestos usados y el cierre de la orden."
            },
            {
                "name": "Líder Comunitario",
                "description": "Solo lectura: consulta el estado de las instalaciones de su comunidad, recibe las alertas generadas y ve qué técnico fue asignado — no puede crear ni modificar nada."
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