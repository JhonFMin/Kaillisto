// ==========================================================================
// Traducción de los permisos nativos de Django (app_label + model + acción)
// a etiquetas humanas en español, agrupadas por módulo de negocio.
//
// Por qué existe este archivo: el backend expone ~100 permisos crudos
// (add_dispositivo, view_dispositivoiot, change_umbraladmin, ...) porque
// varios módulos (devices, maintenance, catalogs) usan "proxy models"
// sobre las mismas tablas de `core` para organizar el código Django. Eso
// es correcto a nivel de backend, pero mostrado tal cual en el frontend
// es ilegible y duplica cada entidad 2 veces. Aquí se fusionan esos
// duplicados en un solo "grupo" por entidad de negocio.
// ==========================================================================

export const ACTION_LABELS = {
    view: 'Ver',
    add: 'Crear',
    change: 'Editar',
    delete: 'Eliminar',
};

export const ACTION_ORDER = ['view', 'add', 'change', 'delete'];

export const CATEGORIA_LABELS = {
    operacion: 'Operación diaria',
    catalogos: 'Catálogos del sistema',
    administracion: 'Administración y accesos',
    sistema: 'Sistema y notificaciones',
};

export const CATEGORIA_ORDER = ['operacion', 'catalogos', 'administracion', 'sistema'];

// model_name (tal como lo guarda Django: nombre de clase en minúsculas,
// sin guiones) -> info del grupo de negocio al que pertenece.
const MODEL_INFO = {
    // --- Operación: dispositivos, instalaciones y mediciones IoT ---
    dispositivo: { group: 'dispositivos', label: 'Dispositivos IoT', icon: 'Cpu', categoria: 'operacion' },
    dispositivoiot: { group: 'dispositivos', label: 'Dispositivos IoT', icon: 'Cpu', categoria: 'operacion' },

    instalacion: { group: 'instalaciones', label: 'Instalaciones', icon: 'MapPin', categoria: 'operacion' },
    instalacioniot: { group: 'instalaciones', label: 'Instalaciones', icon: 'MapPin', categoria: 'operacion' },

    medicion: { group: 'mediciones', label: 'Mediciones', icon: 'Activity', categoria: 'operacion' },
    medicioniot: { group: 'mediciones', label: 'Mediciones', icon: 'Activity', categoria: 'operacion' },

    // --- Operación: mantenimiento ---
    ordentrabajo: { group: 'ordenes', label: 'Órdenes de Trabajo', icon: 'Wrench', categoria: 'operacion' },
    ordentrabajoadmin: { group: 'ordenes', label: 'Órdenes de Trabajo', icon: 'Wrench', categoria: 'operacion' },

    repuesto: { group: 'repuestos', label: 'Repuestos', icon: 'Package', categoria: 'operacion' },
    repuestoadmin: { group: 'repuestos', label: 'Repuestos', icon: 'Package', categoria: 'operacion' },
    repuestoordentrabajo: { group: 'repuestos-usados', label: 'Repuestos usados en Órdenes', icon: 'Link2', categoria: 'operacion' },

    alerta: { group: 'alertas', label: 'Alertas', icon: 'Bell', categoria: 'operacion' },
    alertaadmin: { group: 'alertas', label: 'Alertas', icon: 'Bell', categoria: 'operacion' },

    umbral: { group: 'umbrales', label: 'Umbrales de Alerta', icon: 'Gauge', categoria: 'operacion' },
    umbraladmin: { group: 'umbrales', label: 'Umbrales de Alerta', icon: 'Gauge', categoria: 'operacion' },

    // --- Catálogos: listas de valores fijos que alimentan lo anterior ---
    tipomedicion: { group: 'tipos-medicion', label: 'Tipos de Medición', icon: 'Ruler', categoria: 'catalogos' },
    tipomedicioniot: { group: 'tipos-medicion', label: 'Tipos de Medición', icon: 'Ruler', categoria: 'catalogos' },

    tipoalerta: { group: 'tipos-alerta', label: 'Tipos de Alerta', icon: 'Tag', categoria: 'catalogos' },
    prioridadalerta: { group: 'prioridades-alerta', label: 'Prioridades de Alerta', icon: 'ArrowUpDown', categoria: 'catalogos' },

    estadoalerta: { group: 'estados-alerta', label: 'Estados de Alerta', icon: 'CircleDot', categoria: 'catalogos' },
    estadoalertacatalog: { group: 'estados-alerta', label: 'Estados de Alerta', icon: 'CircleDot', categoria: 'catalogos' },

    estadoordentrabajo: { group: 'estados-orden', label: 'Estados de Orden de Trabajo', icon: 'CircleDot', categoria: 'catalogos' },
    estadoordentrabajocatalog: { group: 'estados-orden', label: 'Estados de Orden de Trabajo', icon: 'CircleDot', categoria: 'catalogos' },

    estadoinstalacion: { group: 'estados-instalacion', label: 'Estados de Instalación', icon: 'CircleDot', categoria: 'catalogos' },
    estadoinstalacioncatalog: { group: 'estados-instalacion', label: 'Estados de Instalación', icon: 'CircleDot', categoria: 'catalogos' },

    idioma: { group: 'idiomas', label: 'Idiomas', icon: 'Languages', categoria: 'catalogos' },

    // --- Administración y accesos ---
    usuario: { group: 'usuarios-sistema', label: 'Usuarios del Sistema', icon: 'UserCog', categoria: 'administracion' },
    role: { group: 'roles', label: 'Roles', icon: 'Shield', categoria: 'administracion' },
    userrole: { group: 'asignacion-roles', label: 'Asignación de Roles a Usuarios', icon: 'UserPlus', categoria: 'administracion' },
    comunidad: { group: 'comunidades', label: 'Comunidades', icon: 'Users2', categoria: 'administracion' },

    // --- Sistema: registros internos, no datos de negocio operativo ---
    evento: { group: 'eventos', label: 'Eventos del Sistema', icon: 'ListTree', categoria: 'sistema' },
    notificacion: { group: 'notificaciones', label: 'Notificaciones', icon: 'BellRing', categoria: 'sistema' },
    rol: { group: 'rol-legado', label: 'Catálogo de Rol (interno, no usar)', icon: 'Archive', categoria: 'sistema' },
};

function fallbackInfo(model) {
    const label = model.charAt(0).toUpperCase() + model.slice(1);
    return { group: model, label, icon: 'Layers', categoria: 'sistema' };
}

export function parseCodename(codename) {
    const action = codename.split('_')[0];
    const model = codename.slice(action.length + 1);
    return { action, model };
}

/**
 * Recibe la lista cruda de permisos de Django (con id, codename, app_label,
 * model) y la transforma en una estructura agrupada y legible:
 *
 * [ { categoria, categoriaLabel, grupos: [
 *       { group, label, icon, acciones: { view: [ids], add: [ids], ... } }
 * ] } ]
 */
export function agruparPermisos(permisosCrudos) {
    const grupos = {}; // group key -> { label, icon, categoria, acciones: {action: Set(ids)} }

    for (const p of permisosCrudos) {
        const { action, model } = parseCodename(p.codename);
        const info = MODEL_INFO[model] || fallbackInfo(model);

        if (!grupos[info.group]) {
            grupos[info.group] = {
                group: info.group,
                label: info.label,
                icon: info.icon,
                categoria: info.categoria,
                acciones: {},
            };
        }
        if (!grupos[info.group].acciones[action]) grupos[info.group].acciones[action] = [];
        grupos[info.group].acciones[action].push(p.id);
    }

    const porCategoria = {};
    Object.values(grupos).forEach((g) => {
        if (!porCategoria[g.categoria]) porCategoria[g.categoria] = [];
        porCategoria[g.categoria].push(g);
    });

    Object.values(porCategoria).forEach((lista) =>
        lista.sort((a, b) => a.label.localeCompare(b.label, 'es'))
    );

    return CATEGORIA_ORDER
        .filter((cat) => porCategoria[cat]?.length)
        .map((cat) => ({
            categoria: cat,
            categoriaLabel: CATEGORIA_LABELS[cat],
            grupos: porCategoria[cat],
        }));
}

/** Todos los ids de permiso que aparecen en la estructura agrupada. */
export function todosLosIds(estructura) {
    const ids = [];
    estructura.forEach((cat) =>
        cat.grupos.forEach((g) =>
            Object.values(g.acciones).forEach((lista) => ids.push(...lista))
        )
    );
    return ids;
}
