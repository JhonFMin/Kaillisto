import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Key, Save } from 'lucide-react';

export default function Permisos() {
    const [roles, setRoles] = useState([]);
    const [rolSeleccionado, setRolSeleccionado] = useState('');
    const [todosPermisos, setTodosPermisos] = useState([]);
    const [asignados, setAsignados] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        api.get('/security/roles/').then(r => setRoles(r.data.filter(r => r.is_active)));
        api.get('/security/permissions/').then(r => setTodosPermisos(r.data));
    }, []);

    const cargarRol = async (rolId) => {
        if (!rolId) return;
        setLoading(true);
        setMsg(null);
        try {
            const res = await api.get(`/security/roles/${rolId}/`);
            setAsignados(new Set(res.data.permissions || []));
        } catch {
            setMsg({ tipo: 'err', texto: 'Error al cargar el rol.' });
        } finally {
            setLoading(false);
        }
    };

    const togglePermiso = (id) => {
        setAsignados(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const guardar = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await api.patch(`/security/roles/${rolSeleccionado}/`, {
                permissions: Array.from(asignados)
            });
            setMsg({ tipo: 'ok', texto: 'Permisos guardados correctamente.' });
        } catch {
            setMsg({ tipo: 'err', texto: 'Error al guardar los permisos.' });
        } finally {
            setSaving(false);
        }
    };

    // Agrupar permisos por app
    const grupos = todosPermisos.reduce((acc, p) => {
        const key = p.app_label;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Permisos por Rol</h1>
                {rolSeleccionado && (
                    <button
                        onClick={guardar}
                        disabled={saving}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
                    >
                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                )}
            </div>

            {msg && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${msg.tipo === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {msg.texto}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Rol</label>
                <select
                    className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={rolSeleccionado}
                    onChange={(e) => { setRolSeleccionado(e.target.value); cargarRol(e.target.value); }}
                >
                    <option value="">— Elige un rol —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>

            {loading && <p className="text-sm text-slate-400">Cargando permisos del rol...</p>}

            {rolSeleccionado && !loading && (
                <div className="space-y-4">
                    {Object.entries(grupos).map(([app, perms]) => (
                        <div key={app} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                <Key size={14} className="text-slate-500" />
                                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{app}</span>
                                <span className="ml-auto text-xs text-slate-400">
                                    {perms.filter(p => asignados.has(p.id)).length}/{perms.length}
                                </span>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {perms.map(p => (
                                    <label key={p.id} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 rounded border-slate-300 accent-slate-800"
                                            checked={asignados.has(p.id)}
                                            onChange={() => togglePermiso(p.id)}
                                        />
                                        <div>
                                            <p className="text-sm text-slate-700">{p.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{p.codename}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}