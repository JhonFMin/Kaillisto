import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Catalogos() {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTipos = async () => {
            try {
                const response = await api.get('/tipos-medicion/');
                setTipos(response.data);
            } catch (error) {
                console.error("Error cargando catálogos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTipos();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Catálogos del Sistema</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-semibold text-slate-700">Tipos de Medición</h2>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-sm text-slate-600">
                            <th className="p-4 font-medium">ID</th>
                            <th className="p-4 font-medium">Nombre</th>
                            <th className="p-4 font-medium">Unidad</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-800">
                        {loading ? (
                            <tr><td colSpan="3" className="p-4 text-center text-slate-500">Cargando...</td></tr>
                        ) : tipos.length === 0 ? (
                            <tr><td colSpan="3" className="p-4 text-center text-slate-500">No hay catálogos</td></tr>
                        ) : (
                            tipos.map((tipo) => (
                                <tr key={tipo.id_tipo_medicion} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-medium">{tipo.id_tipo_medicion}</td>
                                    <td className="p-4">{tipo.nombre}</td>
                                    <td className="p-4 bg-slate-50 font-mono text-xs">{tipo.unidad}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}