# Ka’illisto — estado del frontend

Actualizado: 23 de noviembre de 2026

## Rama y prueba

- Rama de trabajo: `frontend`, creada desde `main`.
- PR de trabajo: https://github.com/JhonFMin/Kaillisto/pull/3 (borrador; no fusionar todavía).
- Preview temporal de Render: https://kaillisto-pr-3.onrender.com
- El servicio productivo existente sigue en `main`: https://kaillisto.onrender.com
- Los pushes a `frontend` actualizan el preview del PR. Cerrar el PR cuando ya no se necesite el preview; Render lo elimina al cerrar/ fusionar el PR.

## Avances completados

### 1. Base de PWA para Android

Commit: `b8eac53` — `Add Android-installable PWA foundation`.

- Manifiesto con nombre, alcance independiente, iconos PNG 192/512 e identidad de la app.
- Botón de instalación en la página pública y ayuda para instalarla desde Chrome Android.
- Service worker que cachea recursos estáticos y muestra una pantalla sin conexión; excluye API y administración de caché.
- Manejo inicial de eventos push en el service worker. Aún no se suscribe al usuario ni envía notificaciones desde el backend.
- Preview manual de Render activado por `[render preview]` en el título del PR.

### 2. Jornada de técnico de campo

- `/mis-casos` ahora muestra órdenes asignadas como tarjetas adaptables a móvil, con filtros por estado, resumen, diagnóstico, solución y prioridad/alerta.
- El técnico puede iniciar una orden, actualizar diagnóstico/solución y cambiar el estado según sus permisos RBAC existentes.
- Cada tarjeta incluye dirección, barrio, comunidad y coordenadas de la instalación, con enlace para abrir la ruta en Google Maps. Las coordenadas son las guardadas en la instalación.
- Añadidos campos de solo lectura al serializer de órdenes; no requiere migración.
- Corregido un nombre de modelo ausente usado al cambiar superadministración y ajustadas pruebas antiguas que no reflejaban permisos RBAC, protección del último superadministrador, estados sembrados y el reto del login.

Verificación local de este incremento:

- Build de producción de Vite: correcto.
- `security.test_portal.PortalAccessTests`: 8 pruebas correctas en SQLite temporal.
- `git diff --check`: correcto.
- El preview anterior respondió 200 para portada, manifiesto, service worker, offline y los dos iconos. Falta volver a verificar el preview después del último push.

## Pendiente para terminar el frontend

1. **Registro y aprobación de instalaciones:** formularios para propietario solar y líder comunitario con mapa, datos necesarios, revisión administrativa, estados de solicitud y aprobación antes de crear la instalación/comunidad definitiva.
2. **Separación de espacios:** selector visible para “Mi espacio” y “Administración” en el acceso; permitir que una misma persona tenga roles operativos y administrativos sin que el panel administrativo bloquee sus funciones de propietario. Revisar el alcance de datos del backend antes de asumir que ocultar navegación protege datos.
3. **Experiencias por rol:** terminar tarjetas y vistas gráficas de propietario, líder comunitario y técnico; mapas y alertas solo dentro del ámbito del rol; mostrar órdenes, visita y técnico asignado donde corresponda.
4. **Repuestos:** facilitar el registro de repuestos usados desde la orden y añadir existencias/stock solo después de definir el flujo administrativo.
5. **Notificaciones:** bandeja con leído/no leído y enlaces a alertas/órdenes; después implementar suscripción web push real (VAPID, almacenamiento de suscripciones, permisos, bajas y envío desde backend).
6. **Uso con conectividad limitada:** revisar qué datos se pueden guardar localmente sin exponer información de otros usuarios; la PWA actual solo conserva recursos estáticos y una página offline.
7. **Control de calidad:** pruebas móviles, teclado/accesibilidad, estados vacíos/errores, permisos por rol, y revisión de carga en conexiones lentas. No fusionar hasta que Jhon pruebe el preview.
8. **Modelo comercial:** preparar planes o demostración para hogares y comunidades cuando las funciones principales estén estables; no introducir anuncios todavía.

## Cuidado con Neon y Render

No hay migraciones nuevas en los dos incrementos descritos. Los previews de servicio de Render copian las variables del servicio base al crearse, incluida la conexión de base de datos. Antes de ejecutar migraciones, seed o escrituras desde un preview, asignar `DATABASE_URL` a una rama de prueba aislada de Neon y confirmar que el servicio de preview la usa. No imprimir ni pegar credenciales en el chat o en commits.

## Instrucción para continuar en otro chat

> Continúa Ka’illisto en `C:\Users\Jhon\Documents\ChatGPT\Kaillisto`, rama `frontend`; lee `FRONTEND_HANDOFF.md` y revisa `git status`/`git log`. El PR de prueba es https://github.com/JhonFMin/Kaillisto/pull/3 y el preview actual es https://kaillisto-pr-3.onrender.com. No fusiones a `main`. Sigue con registro de propietario/líder comunitario y revisión/aprobación administrativa, validando primero los modelos y APIs existentes. Cada avance grande debe tener pruebas, commit, push y prueba en el preview. Antes de cualquier migración o escritura, apunta el preview a una rama de prueba Neon, nunca a la base productiva. Al cerrar cada avance, actualiza esta nota con lo terminado y lo pendiente.
