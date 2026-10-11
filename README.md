# KaiLlisto Backend

API REST para el monitoreo de instalaciones solares, recepción de mediciones IoT,
generación de alertas, gestión de órdenes de trabajo e historial de mantenimiento.

## Requisitos

- Python 3.11 o una versión compatible con las dependencias del proyecto.
- Git.
- PowerShell en Windows o una terminal equivalente.

## Instalación en Windows

Clona el repositorio y entra a la carpeta:

```powershell
git clone [https://github.com/JhonFMin/kaillisto-backend.git](https://github.com/JhonFMin/kaillisto-backend.git)
cd kaillisto-backend
```

Crea y activa un entorno virtual:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Instala las dependencias:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Configuración local

Crea un archivo `.env` en la raíz del proyecto. No lo subas a GitHub.

```env
DJANGO_SECRET_KEY=reemplaza-esto-por-una-clave-local-segura
```

El repositorio incluye `.env.example` como referencia. Usa una clave distinta para cada ambiente y no publiques valores secretos.

## Base de datos

El proyecto usa SQLite por defecto. Crea o actualiza las tablas con las migraciones:

```powershell
python manage.py migrate
```

Para crear un usuario administrador local:

```powershell
python manage.py createsuperuser
```

Los registros iniciales, como roles, estados, tipos de medición, prioridades y estados de alerta, deben existir antes de probar los flujos que los utilizan. Se pueden crear desde el administrador de Django o mediante los datos de prueba del proyecto.

## Ejecutar el backend

Inicia el servidor local:

```powershell
python manage.py runserver
```

La API queda disponible en:

```text
http://127.0.0.1:8000/
```

El prefijo `/api/` depende de la configuración de rutas del proyecto.

## Ejecutar comprobaciones y pruebas

Comprueba la configuración de Django:

```powershell
python manage.py check
```

Ejecuta las pruebas automatizadas:

```powershell
python manage.py test
```

Las pruebas de Django usan una base de datos de prueba separada; no utilices datos reales para pruebas destructivas.

## Funcionalidades principales

- Inicio y cierre de sesión.
- Gestión administrativa de comunidades, instalaciones, dispositivos, tipos de medición, umbrales, alertas y repuestos.
- Recepción autenticada de mediciones de dispositivos.
- Detección de mediciones fuera de umbral y generación de alertas.
- Órdenes de trabajo asignadas a técnicos.
- Registro de diagnóstico, solución, estado, fechas y repuestos utilizados.
- Ficha técnica de instalaciones para técnicos con una orden asignada.
- Consultas del líder comunitario limitadas a su comunidad.
- Dashboard e historiales de mediciones y mantenimientos.
- Exportación de historiales a CSV y registro de eventos.

## Endpoints principales

Las rutas exactas están definidas en `core/urls.py` y `config/urls.py`. Entre las rutas principales se encuentran:

| Función | Ruta |
|---|---|
| Iniciar sesión | `/api/auth/login/` |
| Cerrar sesión | `/api/auth/logout/` |
| Recibir mediciones | `/api/mediciones/` |
| Resumen del dashboard | `/api/dashboard/resumen/` |
| Ficha técnica del técnico | `/api/tecnico/instalaciones/{id}/ficha/` |
| Historial de mediciones | `/api/instalaciones/{id}/mediciones/` |
| Historial de mantenimientos | `/api/instalaciones/{id}/mantenimientos/` |
| Instalaciones del líder | `/api/lider/instalaciones/` |
| Alertas del líder | `/api/lider/alertas/` |
| Órdenes visibles para el líder | `/api/lider/ordenes-trabajo/` |

Las rutas administrativas de comunidades, instalaciones, dispositivos, alertas, umbrales, repuestos y órdenes se exponen mediante los viewsets registrados en el router.

## Seguridad y datos

- No subas `.env`, contraseñas, claves de dispositivos, tokens ni la base local `db.sqlite3`.
- El endpoint de mediciones requiere autenticación del dispositivo.
- Las operaciones administrativas requieren permisos de administrador.
- El técnico solo debe consultar sus órdenes y fichas de instalaciones asignadas.
- El líder comunitario solo debe acceder a información de su comunidad.
- `runserver` es para desarrollo local; antes de un despliegue real configura `DEBUG`, `ALLOWED_HOSTS`, HTTPS y los secretos para el entorno de despliegue.