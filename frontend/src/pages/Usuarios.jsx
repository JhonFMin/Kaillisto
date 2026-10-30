import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Users, Plus, Trash2 } from 'lucide-react';

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    // { usuarioId, rolId } para el form de asignación
    const [asignando, setAsignando] = useState({ usuarioId: '', rolId: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTodo();
    }, []);

    const fetchTodo = async () => {
        setLoading(true);
        try {
            const [uRes, rRes] = await Promise.all([
                api.get('/security/users/'),
                api.get('/security/roles/'),
            ]);
            setUsuarios(uRes.data);
            setRoles(rRes.data.filter(r => r.is_active));
        } catch {
            setMsg({ tipo: 'err', texto: 'Error al cargar datos.' });
        } finally {
            setLoading(false);
        }
    };

    const asignarRol = async (e) => {
        e.preventDefault();
        if (!asignando.usuarioId || !asignando.rolId) return;
        setSaving(true);
        setMsg(null);
        try {
            await api.post('/security/user-roles/', {
                usuario: parseInt(asignando.usuarioId),
                rol: parseInt(asignando.rolId),
            });
            setMsg({ tipo: 'ok', texto: 'Rol asignado correctamente.' });
            setAsignando({ usuarioId: '', rolId: '' });
            fetchTodo();
        } catch (err) {
            const detail = err.response?.data?.detail
                || err.response?.data?.non_field_errors?.[0]
                || 'Error al asignar el rol.';
            setMsg({ tipo: 'err', texto: detail });
        } finally {
            setSaving(false);
        }
    };

    const quitarRol = async (usuarioId, rolNombre) => {
        if (!window.confirm(`¿Quitar el rol "${rolNombre}" de este usuario?`)) return;
        try {
            // Buscar la asignación por usuario y rol
            const res = await api.get(`/security/user-roles/?usuario=${usuarioId}`);
            const asignacion = res.data.find(a => a.rol_nombre === rolNombre);
            if (!asignacion) return;
            await api.delete(`/security/user-roles/${asignacion.id}/`);
            setMsg({ tipo: 'ok', texto: `Rol "${rolNombre}" retirado.` });
            fetchTodo();
        } catch {
            setMsg({ tipo: 'err', texto: 'Error al retirar el rol.' });
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Usuarios y Roles</h1>

            {msg && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${msg.tipo === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {msg.texto}
                </div>
            )}

            {/* Formulario de asignación */}
            <form onSubmit={asignarRol} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    <Plus size={16} /> Asignar Rol a Usuario
                </h2>
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                            value={asignando.usuarioId}
                            onChange={(e) => setAsignando({ ...asignando, usuarioId: e.target.value })}
                            required
                        >
                            <option value="">— Seleccionar —</option>
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                        <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                            value={asignando.rolId}
                            onChange={(e) => setAsignando({ ...asignando, rolId: e.target.value })}
                            required
                        >
                            <option value="">— Seleccionar —</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? 'Asignando...' : 'Asignar'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Tabla de usuarios */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                        <Users size={16} /> Usuarios del sistema
                    </p>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="p-4 font-medium">Usuario</th>
                            <th className="p-4 font-medium">Email</th>
                            <th className="p-4 font-medium">Roles Asignados</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-800 divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="3" className="p-6 text-center text-slate-400">Cargando...</td></tr>
                        ) : usuarios.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="p-4 font-medium">
                                    {u.username}
                                    {u.is_superuser && (
                                        <span className="ml-2 text-xs bg-slate-800 text-white px-1.5 py-0.5 rounded">super</span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-500">{u.email || '—'}</td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {u.roles_activos.length === 0 ? (
                                            <span className="text-slate-400 text-xs">Sin roles</span>
                                        ) : u.roles_activos.map((r) => (
                                            <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                                {r}
                                                <button
                                                    onClick={() => quitarRol(u.id, r)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Quitar rol"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}