# Ka’illisto — estado del frontend

Actualizado: 23 de noviembre de 2026

## Estado de publicación

El último incremento de frontend es `77b058e` (`Separate personal and admin workspace shells`), en la rama `frontend`; incluye el nuevo cascarón personal separado del panel administrativo. `87f10dd` agregó los resúmenes del líder y propietario; `2d4da31` incluye registro, solicitud con mapa y revisión administrativa. El backend `faf0fa9` aplicó `core.0020` a la rama aislada de Neon. Render sirve los bundles `index-BCZH1lPf.js` e `index-DJnhhGTx.css`. La pestaña `/usuarios` sigue mostrando administración; la elección de espacio está en `/login`.

Jhon pidió aviso antes de comenzar el trabajo de interfaz; ya se le avisó en esta conversación. Falta que pruebe interactivamente el flujo en el preview y nos comparta cualquier ajuste.

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

### 3. Armonía visual de portada y acceso

- Unifica la tipografía de la portada, el login y la plataforma en Inter.
- Reutiliza el fondo oscuro, violeta Ka’illisto (`#af50ff`) y lavanda (`#e1bdff`) del panel administrativo.
- Actualiza el acceso con tarjeta de contraste, campos enfocados visibles, CTA consistente y mejor ajuste móvil.
- No cambia el flujo de autenticación ni pretende limitar el alcance de los datos por un selector visual.

### 4. Elección de espacio al iniciar sesión

- Añade dos opciones visibles: “Mi espacio” y “Administración”. La selección solo decide la pantalla inicial; no altera roles ni permisos.
- Tras entrar, propietarios solares, líderes y técnicos van a su vista de trabajo; quienes tengan acceso administrativo pueden entrar al resumen de gestión.
- Si una persona escoge administración sin tener acceso, conserva su sesión y aterriza en su espacio personal o dashboard.
- La pantalla usa las credenciales y el endpoint de sesión existentes; todavía no crea cuentas ni solicitudes de servicio.
- Las rutas personales se determinan con los roles y permisos de la sesión, sin esperar la carga del menú.

### 5. Backend para registro y solicitudes

- `POST /api/security/register/` crea cuentas activas sin roles de negocio ni privilegios y limita intentos anónimos.
- `GET/POST /api/security/solicitudes-vinculacion/` permite a una persona autenticada registrar un hogar o proyecto comunitario con mapa, capacidad, fecha y datos de ubicación.
- Las solicitudes solo las ve su solicitante; administración y superadministradores pueden revisar todas.
- El endpoint `POST .../{id}/revisar/` exige rol administrador o superadministrador. La aprobación crea la comunidad e instalación cuando es un nuevo sitio; permite vincular un líder a una comunidad existente sin duplicarla. Asigna Líder Comunitario o Propietario Solar en una transacción. El rechazo requiere motivo y deja volver a presentar una nueva solicitud.
- La migración `core.0020_solicitudvinculacion` fue aplicada al preview conectado a la rama aislada de Neon; no se ha aplicado a producción.
- Datos ficticios creados para el smoke test: `codex.preview.test.20261123` y la solicitud “Prueba solar automática faf0fa9”. Se reconocen como prueba y están solo en la rama Neon aislada.

### 6. Alta y revisión desde la interfaz (desplegado)

- Portada y login enlazan a la creación de cuenta. Después de iniciar sesión, las cuentas sin rol ven un onboarding para solicitar un hogar o comunidad.
- Formulario de solicitud con selección de tipo, capacidad, fecha y mapa; permite consultar el estado y volver a enviar solicitudes que requieren corrección.
- Administración tiene una vista para revisar solicitudes, ver la ubicación, aprobar o pedir correcciones y asociar líderes a una comunidad existente.
- No cambia roles o datos hasta que un administrador aprueba la solicitud.

Verificación del incremento anterior (técnico/PWA):

- Build de producción de Vite: correcto.
- `security.test_portal.PortalAccessTests`: 8 pruebas correctas en SQLite temporal.
- `git diff --check`: correcto.
- El preview respondió 200 para portada, manifiesto, service worker, offline y los dos iconos.

Verificación local del selector de espacio:

- `pnpm run build`: correcto.
- `pnpm run lint`: terminó con advertencias existentes del proyecto; no reportó errores nuevos en el selector.
- `git diff --check`: correcto.
- Preview de Render en `/login`, HTML/CSS/JS: 200; el bundle contiene “Mi espacio”, “Administración” y sus estilos. No se hizo una prueba visual interactiva del formulario.

Verificación local del backend de solicitudes:

- `python manage.py test`: 22 pruebas correctas en SQLite temporal; incluye registro, privacidad y revisión residencial/comunitaria.
- `makemigrations --check --dry-run` y `manage.py check`: correctos.
- `git diff --check`: correcto.
- Smoke test sobre Render y Neon aislado: registro `201`, login correcto, solicitud `pendiente` creada y visible para el dueño. La prueba dejó los datos ficticios anotados arriba.

Verificación de publicación de la interfaz de solicitudes:

- `pnpm run build`: correcto.
- `pnpm run lint`: termina con advertencias preexistentes; sin errores nuevos de esta interfaz.
- `git diff --check`: correcto antes del commit.
- `git status`: rama `frontend` sincronizada con `origin/frontend` tras el commit `2d4da31`.
- En Render, `/login`, `/registro`, `/solicitud-vinculacion` y `/solicitudes-revision` devolvieron HTTP 200. El JS (`index-DgdlyH7A.js`) y CSS (`index-DTjXMsjM.css`) nuevos también devolvieron 200; el bundle incluye las pantallas de registro, solicitud y revisión.
- El smoke test API del backend creó una cuenta ficticia y una solicitud pendiente en Neon aislado. La prueba visual e interactiva desde navegador queda para Jhon.

### 7. Espacios visuales para propietario y líder comunitario

Commit: `87f10dd` — `Add role-based solar workspace overviews`.

- `/mi-comunidad` ahora es un resumen visual por tarjetas: comunidad y mapa, instalaciones, equipos con acceso al historial de mediciones, órdenes abiertas con ubicación de visita, alertas recientes y estado/canal de las notificaciones.
- `/mi-vivienda` agrega órdenes abiertas cuando RBAC le da `view_ordentrabajo` y muestra notificaciones de la cuenta. No se cambian los permisos ni el alcance de datos.
- La vista solicita solo recursos permitidos por RBAC; el backend conserva el filtro de datos por comunidad, instalación y usuario.
- Compilación de producción correcta. El bundle principal queda en ~505 KB sin comprimir y Vite muestra su aviso de tamaño; compresión gzip ~153 KB.
- Lint termina sin errores nuevos; conserva advertencias ya presentes en el repositorio. `git diff --check` y 8 pruebas de `security.test_portal` correctas.
- En Render, `/`, `/login`, `/registro`, `/solicitud-vinculacion`, `/solicitudes-revision`, `/mi-vivienda` y `/mi-comunidad` devolvieron HTTP 200; JS y CSS publicados también devolvieron 200 y el bundle contiene el nuevo espacio comunitario, tarjetas de instalaciones, historial de equipos y notificaciones.
- Falta la prueba visual/interactiva con cuentas reales de líder y propietario para confirmar sus datos y permisos en uso.

### 8. Separación de espacio personal y administración

Commit: `77b058e` — `Separate personal and admin workspace shells`.

- “Mi espacio” ya tiene encabezado y navegación superior propios, sin menú lateral ni recursos administrativos. Conserva las rutas y componentes personales según rol/permisos.
- “Administración” conserva su barra lateral, rutas y resumen. Un usuario con ambos accesos puede cambiar de un modo al otro; no se alteran los permisos RBAC.
- La preferencia visual se guarda por separado: claro como valor inicial para el espacio personal y oscuro para administración; ambos conservan Inter y el violeta Ka’illisto.
- Para una cuenta administrativa sin rol de hogar, comunidad o técnico, “Mi espacio” abre la solicitud de vinculación.
- `pnpm run build`, `pnpm run lint` y `git diff --check` pasan; el lint conserva advertencias preexistentes. Las 8 pruebas `security.test_portal` también pasan. Falta comprobar visualmente el nuevo diseño con una cuenta administrativa y una cuenta dual.
- Render entrega JS/CSS nuevos con HTTP 200 y contienen las clases del espacio personal. `/login`, `/dashboard`, `/mi-vivienda`, `/mi-comunidad`, `/usuarios`, `/roles`, `/registro`, `/solicitud-vinculacion` y `/solicitudes-revision` respondieron HTTP 200.

## Pendiente para terminar el frontend

1. **Registro y aprobación de instalaciones:** Jhon debe recorrer registro, solicitud y revisión en el preview; corregir cualquier problema que encuentre.
2. **Separación de espacios:** el selector y los cascarones diferentes están implementados; probar con una cuenta dual que alternar entre “Mi espacio” y “Administración” conserva la sesión y limita cada menú a su función.
3. **Experiencias por rol:** probar en preview los espacios de propietario, líder y técnico con cuentas reales de prueba. El líder y propietario ya tienen resúmenes con tarjetas; queda seguir afinando la vista del técnico y confirmar que mapas, órdenes y alertas se muestran dentro de su ámbito.
4. **Repuestos:** facilitar el registro de repuestos usados desde la orden y añadir existencias/stock solo después de definir el flujo administrativo.
5. **Notificaciones:** bandeja con leído/no leído y enlaces a alertas/órdenes; después implementar suscripción web push real (VAPID, almacenamiento de suscripciones, permisos, bajas y envío desde backend).
6. **Uso con conectividad limitada:** revisar qué datos se pueden guardar localmente sin exponer información de otros usuarios; la PWA actual solo conserva recursos estáticos y una página offline.
7. **Control de calidad:** pruebas móviles, teclado/accesibilidad, estados vacíos/errores, permisos por rol, y revisión de carga en conexiones lentas. No fusionar hasta que Jhon pruebe el preview.
8. **Modelo comercial:** preparar planes o demostración para hogares y comunidades cuando las funciones principales estén estables; no introducir anuncios todavía.

## Cuidado con Neon y Render

El preview usa una rama aislada de Neon y `core.0020` ya se aplicó allí. Los previews de Render pueden copiar variables del servicio base al crearse; antes de cualquier migración futura, confirmar de nuevo que `DATABASE_URL` sigue apuntando a la rama de prueba. No imprimir ni pegar credenciales en el chat o en commits.

## Instrucción para continuar en otro chat

> Continua Kaillisto en C:/Users/Jhon/Documents/ChatGPT/Kaillisto, rama frontend; lee FRONTEND_HANDOFF.md y revisa git status/log. PR: https://github.com/JhonFMin/Kaillisto/pull/3. Preview: https://kaillisto-pr-3.onrender.com. No fusiones a main. Separación de cascarones en 77b058e; resúmenes de líder/propietario en 87f10dd; registro y solicitudes en 2d4da31. Backend de solicitudes en faf0fa9; core.0020 aplicada a Neon aislado. Build y 8 pruebas de seguridad pasan; lint conserva advertencias previas. Render sirve index-BCZH1lPf.js e index-DJnhhGTx.css; rutas públicas/admin respondieron 200. Jhon aún debe probar visualmente con cuenta dual y revisar el look de la página comercial; incorporar referencia visual si la comparte. Después sigue prueba móvil, repuestos y notificaciones push. Avisa antes de cada incremento visual; conserva violeta, Inter y tarjetas.
