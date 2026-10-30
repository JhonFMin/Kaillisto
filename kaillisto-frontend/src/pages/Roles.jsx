import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Shield, Plus, Trash2 } from 'lucide-react';

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            // Petición directa a tu backend de Django
            const response = await api.get('/security/roles/');
            setRoles(response.data);
        } catch (err) {
            console.error("Error cargando roles:", err);
            setError("No se pudieron cargar los roles desde el backend. Verifica tu sesión.");
        } finally {
            setLoading(false);
        }
    };

    const inactivarRol = async (id) => {
        if (!window.confirm("¿Seguro que deseas inactivar este rol?")) return;
        try {
            await api.delete(`/security/roles/${id}/`);
            fetchRoles(); 
        } catch (err) {
            console.error("Error inactivando rol:", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Roles y Permisos</h1>
            </div>

            {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <p className="font-semibold text-slate-700">Roles del Sistema (Cargados desde Django)</p>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-sm text-slate-600">
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Descripción</th>
                            <th className="p-4 font-medium">Estado</th>
                            <th className="p-4 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-800">
                        {loading ? (
                            <tr><td colSpan="4" className="p-4 text-center text-slate-500">Cargando datos del servidor...</td></tr>
                        ) : roles.length === 0 ? (
                            <tr><td colSpan="4" className="p-4 text-center text-slate-500">No hay roles registrados</td></tr>
                        ) : (
                            roles.map((rol) => (
                                <tr key={rol.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-medium flex items-center gap-2">
                                        <Shield size={16} className={rol.is_active ? "text-slate-700" : "text-slate-400"} />
                                        {rol.name}
                                    </td>
                                    <td className="p-4 truncate max-w-xs">{rol.description}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rol.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {rol.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {rol.is_active && (
                                            <button 
                                                onClick={() => inactivarRol(rol.id)}
                                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                                title="Inactivar Rol"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}