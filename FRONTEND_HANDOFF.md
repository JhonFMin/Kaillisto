# Ka’illisto — estado del frontend

Actualizado: 24 de noviembre de 2026

## Estado de publicación

El último incremento de frontend es `4c9f9f3` (`Personalize user workspace cards and RBAC`), en la rama `frontend`; agrega navegación personal ligada al RBAC y tarjetas para las listas de “Mi espacio”. `77b058e` separó los cascarones; `87f10dd` agregó los resúmenes del líder y propietario; `2d4da31` incluye registro, solicitud con mapa y revisión administrativa. El backend `faf0fa9` aplicó `core.0020` a la rama aislada de Neon. Render sirve los bundles `index-C9RQISxe.js` e `index-CqkV7Rwe.css`. La pestaña `/usuarios` sigue mostrando administración; la elección de espacio está en `/login`.

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

### 9. RBAC y tarjetas en “Mi espacio” (desplegado)

Commit: `4c9f9f3` — `Personalize user workspace cards and RBAC`.

- “Mi espacio” consulta `/api/security/navigation/?workspace=personal`, que arma los permisos a partir de los roles activos de esa persona y excluye el rol `Administrador`. La navegación y los recursos personales muestran únicamente recursos activos, visibles en el menú y permitidos por sus roles; los cambios de RBAC se vuelven a cargar al entrar o cambiar de espacio.
- Una cuenta con acceso administrativo y roles de servicio conserva ambos espacios: la vista administrativa usa sus permisos habituales y la vista personal usa los permisos de sus otros roles. Los listados/tablas del panel administrativo permanecen en el mismo modo lineal.
- Las listas lineales de `/mi-alertas`, `/tecnicos` y los recursos consultables de Mi espacio ahora se presentan como tarjetas con imagen, búsqueda, estado, fecha, ubicación y detalles desplegables. Las órdenes muestran coordenadas de la instalación en mapa; las tarjetas de dispositivos conservan el acceso a mediciones.
- `pnpm run build`: correcto. `pnpm run lint`: termina con advertencias existentes del proyecto; no hay errores. `security.test_portal`: 9 pruebas correctas, incluyendo usuario dual y recurso oculto. `git diff --check`: correcto.
- Render preview `https://kaillisto-pr-3.onrender.com`: HTML, JavaScript y CSS responden HTTP 200. Bundles publicados: `index-C9RQISxe.js` y `index-CqkV7Rwe.css`; el JS contiene el flujo de permisos personales y tarjetas, y el CSS las clases visuales. La sesión de navegador no estuvo disponible desde Codex para inspeccionar una cuenta autenticada; Jhon debe revisar la vista con sus cuentas de roles en el preview.

### 10. Permisos por rol, navegación adaptable y detalle de mediciones (desplegado)

Commits de código: `1383972` — `Scope personal workspace by role and enrich measurements`; `acc9744` — `Let solar owners follow their service orders`.

- El backend calcula permisos y alcance de datos de “Mi espacio” con los roles activos de negocio; ignora el rol Administrador y también el bypass de superusuario en ese espacio. En Administración se mantienen el acceso y las tablas lineales actuales. Los endpoints nuevos y heredados respetan ese contexto, incluidos los cambios de órdenes y las solicitudes.
- Los permisos predeterminados de Técnico de Campo ya no muestran comunidades ni catálogos internos de configuración. La migración `security.0012` ajusta solo una asignación que coincide exactamente con el conjunto anterior de valores predeterminados; conserva los roles personalizados. Al restaurar el estado anterior, la migración devuelve esos permisos.
- El Propietario Solar tiene lectura de órdenes de mantenimiento para consultar el seguimiento de sus viviendas; el alcance se limita a sus instalaciones y no le da permiso para editar o cerrar órdenes. La migración `security.0013` suma esa lectura solo a un rol que conserva exactamente el preset anterior.
- Los paneles de líder comunitario y propietario solar muestran tarjetas y secciones según los recursos autorizados. El acceso a mediciones desde equipos también requiere `view_medicion` en frontend y backend.
- La navegación superior de “Mi espacio” ahora desplaza los recursos en horizontal, ofrece flechas accesibles y un menú “Más recursos”; se adapta a móvil sin reducir las tablas del panel de administración.
- Una tarjeta de medición abre el detalle con código/modelo del dispositivo, lectura y unidad, instalación, barrio/zona, comunidad, nombre del propietario cuando está registrado y mapa con las coordenadas guardadas. No expone correo ni teléfono del propietario.
- Verificación: `pnpm run build` correcto; `pnpm run lint` termina con advertencias existentes y sin errores; `manage.py test` pasó 22 pruebas en SQLite temporal; `manage.py check`, `makemigrations --check --dry-run` y `git diff --check` correctos.
- Preview `https://kaillisto-pr-3.onrender.com`: `/`, `/login`, `/mi-comunidad`, `/mi-vivienda`, `/mediciones` y el manifiesto responden HTTP 200. Bundles publicados: `index-Cn8TkHx0.js` y `index-CLVFjAUC.css` (200); incluyen el detalle de mediciones y estilos de navegación responsive.
- La herramienta de navegador no expuso pestañas para este chat, por eso falta que Jhon compruebe visualmente el espacio autenticado de líder, técnico, propietario y cuenta dual en Render.

## Cuidado con Neon y Render

El preview usa una rama aislada de Neon y `core.0020` ya se aplicó allí. Los previews de Render pueden copiar variables del servicio base al crearse; antes de cualquier migración futura, confirmar de nuevo que `DATABASE_URL` sigue apuntando a la rama de prueba. No imprimir ni pegar credenciales en el chat o en commits.

## Instrucción para continuar en otro chat

> Continua Kaillisto en C:/Users/Jhon/Documents/ChatGPT/Kaillisto, rama frontend; lee FRONTEND_HANDOFF.md y revisa git status/log. PR: https://github.com/JhonFMin/Kaillisto/pull/3. Preview: https://kaillisto-pr-3.onrender.com. No fusiones a main. Los commits de código más recientes son 1383972 y acc9744: Mi espacio aplica los roles de negocio incluso para cuentas admin/superadmin; líder, propietario y técnico ven sus recursos autorizados; la navegación superior se puede desplazar y adapta a móvil; las mediciones muestran dispositivo, zona, comunidad, propietario y mapa al abrir el detalle. Propietario Solar ahora consulta solo sus propias órdenes de mantenimiento. Administración conserva su shell y tablas lineales. Build correcto, lint con advertencias previas, 22 pruebas backend correctas, `check`, revisión de migraciones y `git diff --check` correctos. Preview sirve index-Cn8TkHx0.js e index-CLVFjAUC.css. Las migraciones security.0012 y security.0013 afinan presets integrados sin sobrescribir roles personalizados; Neon del preview es el único entorno de aplicación. La herramienta del navegador no estuvo disponible; Jhon debe iniciar sesión y probar el detalle de mediciones y las vistas de líder/técnico/propietario/cuenta dual. Luego sigue revisión móvil, flujo de repuestos y notificaciones push. Conserva violeta, Inter y tarjetas.
