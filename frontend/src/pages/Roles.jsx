import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Shield, Plus, X, Check } from 'lucide-react';

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => { fetchRoles(); }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/security/roles/');
            setRoles(res.data);
        } catch {
            setError('No se pudieron cargar los roles.');
        } finally {
            setLoading(false);
        }
    };

    const crearRol = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/security/roles/', form);
            setForm({ name: '', description: '' });
            setShowForm(false);
            setMsg({ tipo: 'ok', texto: 'Rol creado correctamente.' });
            fetchRoles();
        } catch (err) {
            setMsg({ tipo: 'err', texto: err.response?.data?.name?.[0] || 'Error al crear el rol.' });
        } finally {
            setSaving(false);
        }
    };

    const inactivarRol = async (id, name) => {
        if (!window.confirm(`¿Inactivar el rol "${name}"?`)) return;
        try {
            await api.delete(`/security/roles/${id}/`);
            setMsg({ tipo: 'ok', texto: `Rol "${name}" inactivado.` });
            fetchRoles();
        } catch (err) {
            setMsg({ tipo: 'err', texto: err.response?.data?.detail || 'Error al inactivar.' });
        }
    };

    const reactivarRol = async (id) => {
        try {
            await api.patch(`/security/roles/${id}/`, { is_active: true });
            setMsg({ tipo: 'ok', texto: 'Rol reactivado.' });
            fetchRoles();
        } catch {
            setMsg({ tipo: 'err', texto: 'Error al reactivar el rol.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Roles</h1>
                <button
                    onClick={() => { setShowForm(!showForm); setMsg(null); }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancelar' : 'Nuevo Rol'}
                </button>
            </div>

            {msg && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${msg.tipo === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {msg.texto}
                </div>
            )}

            {showForm && (
                <form onSubmit={crearRol} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                    <h2 className="font-semibold text-slate-700">Nuevo Rol</h2>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                        <input
                            required
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                        <textarea
                            rows={2}
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50"
                    >
                        <Check size={16} /> {saving ? 'Guardando...' : 'Guardar Rol'}
                    </button>
                </form>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-700 text-sm">Roles del sistema</p>
                </div>
                {error && <p className="p-4 text-red-600 text-sm">{error}</p>}
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Descripción</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-800 divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="4" className="p-6 text-center text-slate-400">Cargando...</td></tr>
                        ) : roles.length === 0 ? (
                            <tr><td colSpan="4" className="p-6 text-center text-slate-400">No hay roles registrados.</td></tr>
                        ) : roles.map((rol) => (
                            <tr key={rol.id} className="hover:bg-slate-50">
                                <td className="p-4 font-medium flex items-center gap-2">
                                    <Shield size={15} className={rol.is_active ? 'text-slate-600' : 'text-slate-300'} />
                                    {rol.name}
                                </td>
                                <td className="p-4 text-slate-500 max-w-xs truncate">{rol.description || '—'}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rol.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {rol.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {rol.is_active ? (
                                        <button
                                            onClick={() => inactivarRol(rol.id, rol.name)}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                                        >
                                            Inactivar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => reactivarRol(rol.id)}
                                            className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors"
                                        >
                                            Reactivar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}