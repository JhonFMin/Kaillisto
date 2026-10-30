# Kaillisto local

Landing oscura, login, RBAC, usuarios, roles, superadmin de Django y vistas por rol.

## Arrancar

Desde esta carpeta, en dos terminales PowerShell:

```powershell
.\.venv\Scripts\python.exe backend/manage.py runserver 127.0.0.1:8001
```

```powershell
npm --prefix frontend run dev
```

Plataforma: http://127.0.0.1:5174 · Django: http://127.0.0.1:8001/admin/

La base SQLite incluida está en `backend/db.sqlite3`.

## Cuentas locales

Contraseña de las cuatro cuentas: `Kaillisto2026!`

| Usuario | Acceso |
|---|---|
| superadmin.local | Panel, Django y promover/revocar superadmin |
| admin.local | Administración del sistema |
| tecnico.local | Órdenes propias, fichas técnicas y repuestos utilizados |
| lider.local | Instalaciones, alertas y técnicos de su comunidad |

Las cuentas y datos anteriores se conservaron. Los datos nuevos llevan el prefijo Demo local. Estas claves son solo para la demostración local.

## Instalación desde cero

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
# Cambiar DJANGO_SECRET_KEY por una clave local.
.\.venv\Scripts\python.exe backend/manage.py migrate
.\.venv\Scripts\python.exe backend/manage.py seed_local --password 'Kaillisto2026!'
npm --prefix frontend ci
```

El seed es repetible y no cambia las contraseñas de cuentas existentes.

## Verificar

```powershell
.\.venv\Scripts\python.exe backend/manage.py test security.test_portal
.\.venv\Scripts\python.exe backend/manage.py check
npm --prefix frontend run build
```

El servidor filtra los datos por comunidad y órdenes asignadas. Sin flujos de excepciones de Little Paws Net. La entrega cubre la base administrativa, no los 33 requisitos IoT completos ni control de existencias; los repuestos utilizados se registran por orden.

## Publicar gratis en Render + Neon

`render.yaml` y `Dockerfile` dejan la app lista para crear como Blueprint en Render. Frontend y backend se sirven desde el mismo dominio. Para evitar que se borren los datos después de 30 días, usa una base PostgreSQL de Neon; no crees la base gratuita de Render para guardar datos permanentes.

1. Sube este proyecto a un repositorio privado de GitHub y conecta ese repositorio a Render. Excluye `.env` y `backend/db.sqlite3`; nunca publiques esos archivos.
2. Crea una base PostgreSQL en Neon y copia su cadena de conexión pooled como `DATABASE_URL`.
3. En Render, crea un Blueprint desde el repositorio. Render generará `DJANGO_SECRET_KEY` y te pedirá el valor de `DATABASE_URL`.
4. Abre la URL `onrender.com` cuando el despliegue termine y crea el primer administrador desde la consola de Render con `python manage.py createsuperuser`.

**Límites gratuitos:** Render duerme el servicio tras 15 minutos sin tráfico y puede tardar cerca de un minuto en despertar. Su plan gratuito asigna 750 horas por espacio de trabajo al mes. Neon Free incluye actualmente 1 GB por proyecto y 100 CU-horas mensuales; su cómputo se suspende cuando está inactivo. Estos topes sirven para una demo/proyecto personal, pero no prometen disponibilidad continua. [Límites gratuitos de Render](https://render.com/docs/free) · [Plan Free de Neon](https://neon.com/blog/neon-free-plan-1-gb-per-project).
