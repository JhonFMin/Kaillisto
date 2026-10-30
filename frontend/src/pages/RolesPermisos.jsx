import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { agruparPermisos, ACTION_LABELS, ACTION_ORDER } from '../utils/permisosLabels';
import {
    Shield, Plus, X, Check, Search, Users, Key, Pencil, Save, Trash2,
    UserPlus, AlertCircle, CircleDot, ChevronDown, Loader2,
    Cpu, MapPin, Activity, Wrench, Package, Link2, Bell, Gauge, Ruler, Tag,
    ArrowUpDown, Languages, UserCog, Users2, ListTree, BellRing, Archive, Layers,
} from 'lucide-react';

// Mapa de nombre-de-icono (string, definido en permisosLabels.js) -> componente real.
const ICONOS = {
    Cpu, MapPin, Activity, Wrench, Package, Link2, Bell, Gauge, Ruler, Tag,
    ArrowUpDown, CircleDot, Languages, UserCog, Shield, UserPlus, Users2,
    ListTree, BellRing, Archive, Layers,
};
const Icono = ({ nombre, ...props }) => {
    const Cmp = ICONOS[nombre] || Layers;
    return <Cmp {...props} />;
};

function Badge({ children, tone = 'slate' }) {
    const tones = {
        slate: 'bg-slate-100 text-slate-600',
        green: 'bg-emerald-50 text-emerald-700',
        red: 'bg-rose-50 text-rose-600',
        indigo: 'bg-indigo-50 text-indigo-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function RolesPermisos() {
    const [roles, setRoles] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [permisosCrudos, setPermisosCrudos] = useState([]);
    const [cargandoInicial, setCargandoInicial] = useState(true);

    const [selectedId, setSelectedId] = useState(null);
    const [roleDetail, setRoleDetail] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [tab, setTab] = useState('permisos');
    const [busquedaRoles, setBusquedaRoles] = useState('');

    const [asignados, setAsignados] = useState(new Set());
    const [guardandoPermisos, setGuardandoPermisos] = useState(false);

    const [editandoInfo, setEditandoInfo] = useState(false);
    const [infoForm, setInfoForm] = useState({ name: '', description: '' });
    const [guardandoInfo, setGuardandoInfo] = useState(false);

    const [mostrarNuevoRol, setMostrarNuevoRol] = useState(false);
    const [nuevoRolForm, setNuevoRolForm] = useState({ name: '', description: '' });
    const [creandoRol, setCreandoRol] = useState(false);

    const [usuarioParaAgregar, setUsuarioParaAgregar] = useState('');
    const [agregandoUsuario, setAgregandoUsuario] = useState(false);

    const [msg, setMsg] = useState(null);
    const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg(null), 4000); };

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargandoInicial(true);
        try {
            const [rRes, uRes, pRes] = await Promise.all([
                api.get('/security/roles/'),
                api.get('/security/users/'),
                api.get('/security/permissions/'),
            ]);
            setRoles(rRes.data);
            setUsuarios(uRes.data);
            setPermisosCrudos(pRes.data);
        } catch {
            flash('err', 'No se pudo cargar la información de roles y permisos.');
        } finally {
            setCargandoInicial(false);
        }
    };

    const estructuraPermisos = useMemo(() => agruparPermisos(permisosCrudos), [permisosCrudos]);

    const conteoUsuariosPorRol = useMemo(() => {
        const mapa = {};
        usuarios.forEach((u) => (u.roles_activos || []).forEach((nombre) => {
            mapa[nombre] = (mapa[nombre] || 0) + 1;
        }));
        return mapa;
    }, [usuarios]);

    const rolesFiltrados = useMemo(() => {
        const q = busquedaRoles.trim().toLowerCase();
        if (!q) return roles;
        return roles.filter((r) => r.name.toLowerCase().includes(q));
    }, [roles, busquedaRoles]);

    const seleccionarRol = async (id) => {
        setSelectedId(id);
        setTab('permisos');
        setEditandoInfo(false);
        setCargandoDetalle(true);
        try {
            const res = await api.get(`/security/roles/${id}/`);
            setRoleDetail(res.data);
            setAsignados(new Set(res.data.permissions || []));
            setInfoForm({ name: res.data.name, description: res.data.description || '' });
        } catch {
            flash('err', 'No se pudo cargar el detalle del rol.');
        } finally {
            setCargandoDetalle(false);
        }
    };

    // ---------- Crear rol ----------
    const crearRol = async (e) => {
        e.preventDefault();
        setCreandoRol(true);
        try {
            const res = await api.post('/security/roles/', nuevoRolForm);
            setNuevoRolForm({ name: '', description: '' });
            setMostrarNuevoRol(false);
            flash('ok', `Rol "${res.data.name}" creado.`);
            const rRes = await api.get('/security/roles/');
            setRoles(rRes.data);
            seleccionarRol(res.data.id);
        } catch (err) {
            flash('err', err.response?.data?.name?.[0] || 'Error al crear el rol.');
        } finally {
            setCreandoRol(false);
        }
    };

    // ---------- Activar / inactivar ----------
    const inactivarRol = async () => {
        if (!roleDetail) return;
        if (!window.confirm(`¿Inactivar el rol "${roleDetail.name}"? Los usuarios que lo tengan dejarán de ver sus permisos.`)) return;
        try {
            await api.delete(`/security/roles/${roleDetail.id}/`);
            flash('ok', 'Rol inactivado.');
            await cargarTodo();
            seleccionarRol(roleDetail.id);
        } catch {
            flash('err', 'Error al inactivar el rol.');
        }
    };

    const reactivarRol = async () => {
        if (!roleDetail) return;
        try {
            await api.patch(`/security/roles/${roleDetail.id}/`, { is_active: true });
            flash('ok', 'Rol reactivado.');
            await cargarTodo();
            seleccionarRol(roleDetail.id);
        } catch {
            flash('err', 'Error al reactivar el rol.');
        }
    };

    // ---------- Editar nombre / descripción ----------
    const guardarInfo = async () => {
        setGuardandoInfo(true);
        try {
            const res = await api.patch(`/security/roles/${roleDetail.id}/`, infoForm);
            setRoleDetail((prev) => ({ ...prev, ...res.data }));
            setEditandoInfo(false);
            flash('ok', 'Datos del rol actualizados.');
            setRoles((prev) => prev.map((r) => (r.id === res.data.id ? { ...r, ...res.data } : r)));
        } catch {
            flash('err', 'Error al guardar los cambios.');
        } finally {
            setGuardandoInfo(false);
        }
    };

    // ---------- Permisos ----------
    const hayCambiosPermisos = useMemo(() => {
        if (!roleDetail) return false;
        const original = new Set(roleDetail.permissions || []);
        if (original.size !== asignados.size) return true;
        for (const id of asignados) if (!original.has(id)) return true;
        return false;
    }, [asignados, roleDetail]);

    const idsDeAccion = (grupo, accion) => grupo.acciones[accion] || [];

    const estadoCelda = (grupo, accion) => {
        const ids = idsDeAccion(grupo, accion);
        if (ids.length === 0) return null; // esta acción no existe para este módulo
        const marcados = ids.filter((id) => asignados.has(id)).length;
        if (marcados === 0) return 'vacio';
        if (marcados === ids.length) return 'completo';
        return 'parcial';
    };

    const toggleCelda = (grupo, accion) => {
        const ids = idsDeAccion(grupo, accion);
        if (ids.length === 0) return;
        const estado = estadoCelda(grupo, accion);
        setAsignados((prev) => {
            const next = new Set(prev);
            if (estado === 'completo') ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    };

    const toggleFilaCompleta = (grupo) => {
        const idsFila = Object.values(grupo.acciones).flat();
        const todosMarcados = idsFila.every((id) => asignados.has(id));
        setAsignados((prev) => {
            const next = new Set(prev);
            idsFila.forEach((id) => (todosMarcados ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const marcarTodaLaCategoria = (categoria, marcar) => {
        const ids = categoria.grupos.flatMap((g) => Object.values(g.acciones).flat());
        setAsignados((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => (marcar ? next.add(id) : next.delete(id)));
            return next;
        });
    };

    const guardarPermisos = async () => {
        setGuardandoPermisos(true);
        try {
            const res = await api.patch(`/security/roles/${roleDetail.id}/`, {
                permissions: Array.from(asignados),
            });
            setRoleDetail((prev) => ({ ...prev, ...res.data }));
            flash('ok', 'Permisos guardados correctamente.');
        } catch {
            flash('err', 'Error al guardar los permisos.');
        } finally {
            setGuardandoPermisos(false);
        }
    };

    const descartarCambiosPermisos = () => setAsignados(new Set(roleDetail.permissions || []));

    // ---------- Usuarios del rol ----------
    const usuariosDelRol = useMemo(() => {
        if (!roleDetail) return [];
        return usuarios.filter((u) => (u.roles_activos || []).includes(roleDetail.name));
    }, [usuarios, roleDetail]);

    const usuariosDisponibles = useMemo(() => {
        if (!roleDetail) return [];
        return usuarios.filter((u) => !(u.roles_activos || []).includes(roleDetail.name));
    }, [usuarios, roleDetail]);

    const agregarUsuario = async (e) => {
        e.preventDefault();
        if (!usuarioParaAgregar) return;
        setAgregandoUsuario(true);
        try {
            await api.post('/security/user-roles/', {
                usuario: parseInt(usuarioParaAgregar),
                rol: roleDetail.id,
            });
            flash('ok', 'Usuario agregado al rol.');
            setUsuarioParaAgregar('');
            const uRes = await api.get('/security/users/');
            setUsuarios(uRes.data);
        } catch (err) {
            flash('err', err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al agregar el usuario.');
        } finally {
            setAgregandoUsuario(false);
        }
    };

    const quitarUsuario = async (usuarioId, username) => {
        if (!window.confirm(`¿Quitar el rol "${roleDetail.name}" a ${username}?`)) return;
        try {
            const res = await api.get(`/security/user-roles/?usuario=${usuarioId}`);
            const asignacion = res.data.find((a) => a.rol_nombre === roleDetail.name);
            if (!asignacion) return;
            await api.delete(`/security/user-roles/${asignacion.id}/`);
            flash('ok', `Rol retirado de ${username}.`);
            const uRes = await api.get('/security/users/');
            setUsuarios(uRes.data);
        } catch {
            flash('err', 'Error al quitar el rol.');
        }
    };

    // ==========================================================================

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Roles y Permisos</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Define qué puede ver y hacer cada rol, y quién lo tiene — todo en un solo lugar.
                    </p>
                </div>
            </div>

            {msg && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm border flex items-center gap-2 ${msg.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                    <AlertCircle size={15} /> {msg.texto}
                </div>
            )}

            <div className="flex-1 min-h-0 flex gap-5">
                {/* ---------------- Columna izquierda: lista de roles ---------------- */}
                <aside className="w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 space-y-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busquedaRoles}
                                onChange={(e) => setBusquedaRoles(e.target.value)}
                                placeholder="Buscar rol..."
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        <button
                            onClick={() => { setMostrarNuevoRol(true); setSelectedId(null); setRoleDetail(null); }}
                            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                            <Plus size={15} /> Nuevo rol
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {cargandoInicial ? (
                            <div className="flex justify-center py-10 text-slate-300"><Loader2 className="animate-spin" /></div>
                        ) : rolesFiltrados.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-8">Sin roles que coincidan.</p>
                        ) : rolesFiltrados.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => { seleccionarRol(r.id); setMostrarNuevoRol(false); }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2.5 ${selectedId === r.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                                <Shield size={16} className={`mt-0.5 shrink-0 ${selectedId === r.id ? 'text-white' : r.is_active ? 'text-slate-400' : 'text-slate-300'}`} />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-sm truncate">{r.name}</span>
                                    <span className={`flex items-center gap-1.5 text-xs mt-0.5 ${selectedId === r.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                        <Users size={11} /> {conteoUsuariosPorRol[r.name] || 0}
                                        {!r.is_active && <span className="ml-1 px-1.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-semibold">Inactivo</span>}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* ---------------- Columna derecha: detalle / formulario ---------------- */}
                <section className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {mostrarNuevoRol ? (
                        <FormularioNuevoRol
                            form={nuevoRolForm}
                            setForm={setNuevoRolForm}
                            onSubmit={crearRol}
                            guardando={creandoRol}
                            onCancelar={() => setMostrarNuevoRol(false)}
                        />
                    ) : !selectedId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-slate-400">
                            <Shield size={40} className="mb-3 text-slate-200" />
                            <p className="font-medium text-slate-500">Selecciona un rol de la lista</p>
                            <p className="text-sm mt-1">o crea uno nuevo para configurar sus permisos y usuarios.</p>
                        </div>
                    ) : cargandoDetalle || !roleDetail ? (
                        <div className="flex-1 flex items-center justify-center text-slate-300"><Loader2 className="animate-spin" size={28} /></div>
                    ) : (
                        <>
                            {/* Encabezado del rol */}
                            <div className="px-6 py-5 border-b border-slate-100">
                                {editandoInfo ? (
                                    <div className="space-y-3">
                                        <input
                                            value={infoForm.name}
                                            onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                                            className="w-full text-lg font-bold px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                                        />
                                        <textarea
                                            rows={2}
                                            value={infoForm.description}
                                            onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                                            placeholder="Describe para qué sirve este rol..."
                                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={guardarInfo} disabled={guardandoInfo} className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                                                <Save size={14} /> {guardandoInfo ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button onClick={() => { setEditandoInfo(false); setInfoForm({ name: roleDetail.name, description: roleDetail.description || '' }); }} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100">
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-lg font-bold text-slate-800 truncate">{roleDetail.name}</h2>
                                                <Badge tone={roleDetail.is_active ? 'green' : 'red'}>{roleDetail.is_active ? 'Activo' : 'Inactivo'}</Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">{roleDetail.description || 'Sin descripción.'}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => setEditandoInfo(true)} title="Editar nombre y descripción" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                                <Pencil size={15} />
                                            </button>
                                            {roleDetail.is_active ? (
                                                <button onClick={inactivarRol} title="Inactivar rol" className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                                    <Trash2 size={15} />
                                                </button>
                                            ) : (
                                                <button onClick={reactivarRol} className="text-xs font-medium text-emerald-600 hover:text-emerald-800 px-2">
                                                    Reactivar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Pestañas */}
                                <div className="flex gap-1 mt-4 border-b border-slate-100 -mb-5 pt-1">
                                    <PestañaBtn activo={tab === 'permisos'} onClick={() => setTab('permisos')} icon={Key}>
                                        Permisos
                                    </PestañaBtn>
                                    <PestañaBtn activo={tab === 'usuarios'} onClick={() => setTab('usuarios')} icon={Users}>
                                        Usuarios ({usuariosDelRol.length})
                                    </PestañaBtn>
                                </div>
                            </div>

                            {/* Contenido de la pestaña */}
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                {tab === 'permisos' ? (
                                    <TabPermisos
                                        estructura={estructuraPermisos}
                                        asignados={asignados}
                                        estadoCelda={estadoCelda}
                                        toggleCelda={toggleCelda}
                                        toggleFilaCompleta={toggleFilaCompleta}
                                        marcarTodaLaCategoria={marcarTodaLaCategoria}
                                    />
                                ) : (
                                    <TabUsuarios
                                        usuariosDelRol={usuariosDelRol}
                                        usuariosDisponibles={usuariosDisponibles}
                                        usuarioParaAgregar={usuarioParaAgregar}
                                        setUsuarioParaAgregar={setUsuarioParaAgregar}
                                        agregarUsuario={agregarUsuario}
                                        agregandoUsuario={agregandoUsuario}
                                        quitarUsuario={quitarUsuario}
                                    />
                                )}
                            </div>

                            {/* Barra de guardado flotante (solo pestaña permisos) */}
                            {tab === 'permisos' && hayCambiosPermisos && (
                                <div className="px-6 py-3 border-t border-slate-100 bg-amber-50/60 flex items-center justify-between">
                                    <span className="text-sm text-amber-700 font-medium">Tienes cambios de permisos sin guardar.</span>
                                    <div className="flex gap-2">
                                        <button onClick={descartarCambiosPermisos} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-white">
                                            Descartar
                                        </button>
                                        <button onClick={guardarPermisos} disabled={guardandoPermisos} className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
                                            <Save size={14} /> {guardandoPermisos ? 'Guardando...' : 'Guardar permisos'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

// ============================= Subcomponentes =============================

function PestañaBtn({ activo, onClick, icon: Icon, children }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activo ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
            <Icon size={14} /> {children}
        </button>
    );
}

function FormularioNuevoRol({ form, setForm, onSubmit, guardando, onCancelar }) {
    return (
        <div className="p-6 max-w-md">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus size={17} /> Nuevo rol</h2>
                <button onClick={onCancelar} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                    <input
                        required
                        autoFocus
                        placeholder="Ej: Técnico de Campo"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    <textarea
                        rows={3}
                        placeholder="¿Qué hace alguien con este rol?"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                </div>
                <button
                    type="submit"
                    disabled={guardando}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
                >
                    <Check size={16} /> {guardando ? 'Creando...' : 'Crear rol y continuar'}
                </button>
                <p className="text-xs text-slate-400">Después de crearlo podrás asignarle permisos y usuarios.</p>
            </form>
        </div>
    );
}

function TabPermisos({ estructura, estadoCelda, toggleCelda, toggleFilaCompleta, marcarTodaLaCategoria }) {
    if (estructura.length === 0) return <p className="text-sm text-slate-400">No hay permisos disponibles.</p>;

    return (
        <div className="space-y-6">
            {estructura.map((cat) => {
                return (
                    <div key={cat.categoria}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{cat.categoriaLabel}</h3>
                            <div className="flex gap-3 text-xs">
                                <button onClick={() => marcarTodaLaCategoria(cat, true)} className="text-slate-400 hover:text-slate-700 font-medium">Marcar todo</button>
                                <button onClick={() => marcarTodaLaCategoria(cat, false)} className="text-slate-400 hover:text-slate-700 font-medium">Quitar todo</button>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wide">
                                        <th className="p-3 font-medium">Módulo</th>
                                        {ACTION_ORDER.map((a) => (
                                            <th key={a} className="p-3 font-medium text-center w-20">{ACTION_LABELS[a]}</th>
                                        ))}
                                        <th className="p-3 w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cat.grupos.map((g) => (
                                        <tr key={g.group} className="hover:bg-slate-50/70">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                    <Icono nombre={g.icon} size={15} className="text-slate-400 shrink-0" />
                                                    {g.label}
                                                </div>
                                            </td>
                                            {ACTION_ORDER.map((a) => {
                                                const estado = estadoCelda(g, a);
                                                if (estado === null) return <td key={a} className="p-3 text-center text-slate-200">—</td>;
                                                return (
                                                    <td key={a} className="p-3 text-center">
                                                        <button
                                                            onClick={() => toggleCelda(g, a)}
                                                            title={`${ACTION_LABELS[a]} ${g.label}`}
                                                            className={`h-5 w-5 rounded-md border flex items-center justify-center mx-auto transition-colors
                                                                ${estado === 'completo' ? 'bg-slate-900 border-slate-900 text-white'
                                                                    : estado === 'parcial' ? 'bg-slate-200 border-slate-300 text-slate-600'
                                                                        : 'bg-white border-slate-300 hover:border-slate-400'}`}
                                                        >
                                                            {estado !== 'vacio' && <Check size={12} strokeWidth={3} />}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-center">
                                                <button onClick={() => toggleFilaCompleta(g)} title="Marcar/quitar toda la fila" className="text-slate-300 hover:text-slate-600">
                                                    <ChevronDown size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TabUsuarios({ usuariosDelRol, usuariosDisponibles, usuarioParaAgregar, setUsuarioParaAgregar, agregarUsuario, agregandoUsuario, quitarUsuario }) {
    return (
        <div className="space-y-5">
            <form onSubmit={agregarUsuario} className="flex items-end gap-2">
                <div className="flex-1 max-w-xs">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Agregar usuario a este rol</label>
                    <select
                        value={usuarioParaAgregar}
                        onChange={(e) => setUsuarioParaAgregar(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">— Seleccionar usuario —</option>
                        {usuariosDisponibles.map((u) => (
                            <option key={u.id_usuario} value={u.id_usuario}>{u.username}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={!usuarioParaAgregar || agregandoUsuario}
                    className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-40"
                >
                    <UserPlus size={15} /> {agregandoUsuario ? 'Agregando...' : 'Agregar'}
                </button>
            </form>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {usuariosDelRol.length === 0 ? (
                    <p className="p-5 text-center text-sm text-slate-400">Ningún usuario tiene este rol todavía.</p>
                ) : usuariosDelRol.map((u) => (
                    <div key={u.id_usuario} className="flex items-center justify-between px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                {u.username}
                                {u.is_superuser && <Badge tone="indigo">superusuario</Badge>}
                            </p>
                            <p className="text-xs text-slate-400">{u.email || 'Sin correo registrado'}</p>
                        </div>
                        <button
                            onClick={() => quitarUsuario(u.id_usuario, u.username)}
                            className="text-xs font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1"
                        >
                            <Trash2 size={13} /> Quitar
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
