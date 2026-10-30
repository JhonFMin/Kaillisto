import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Dispositivos() {
    const [dispositivos, setDispositivos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDispositivos = async () => {
            try {
                const response = await api.get('/dispositivos/');
                setDispositivos(response.data);
            } catch (error) {
                console.error("Error cargando dispositivos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDispositivos();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Dispositivos</h1>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 text-sm font-medium transition-colors">
                    + Añadir
                </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                            <th className="p-4 font-medium">ID Dispositivo</th>
                            <th className="p-4 font-medium">Última Conexión</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-800">
                        {loading ? (
                            <tr><td colSpan="2" className="p-4 text-center text-slate-500">Cargando...</td></tr>
                        ) : dispositivos.length === 0 ? (
                            <tr><td colSpan="2" className="p-4 text-center text-slate-500">No hay dispositivos registrados</td></tr>
                        ) : (
                            dispositivos.map((disp) => (
                                <tr key={disp.id_dispositivo} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-medium">#{disp.id_dispositivo}</td>
                                    <td className="p-4">
                                        {disp.ultima_comunicacion 
                                            ? new Date(disp.ultima_comunicacion).toLocaleString() 
                                            : <span className="text-slate-400">Sin conexión</span>}
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