import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Wrench } from 'lucide-react';

export default function Mantenimiento() {
    const [ordenes, setOrdenes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrdenes = async () => {
            try {
                const response = await api.get('/ordenes-trabajo/');
                setOrdenes(response.data);
            } catch (error) {
                console.error("Error cargando órdenes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrdenes();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Órdenes de Trabajo</h1>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 text-sm font-medium transition-colors flex items-center gap-2">
                    <Wrench size={16} /> Nueva Orden
                </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                            <th className="p-4 font-medium">ID Orden</th>
                            <th className="p-4 font-medium">Descripción</th>
                            <th className="p-4 font-medium">Fecha Creación</th>
                            <th className="p-4 font-medium">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-slate-800">
                        {loading ? (
                            <tr><td colSpan="4" className="p-4 text-center text-slate-500">Cargando...</td></tr>
                        ) : ordenes.length === 0 ? (
                            <tr><td colSpan="4" className="p-4 text-center text-slate-500">No hay órdenes de trabajo</td></tr>
                        ) : (
                            ordenes.map((orden) => (
                                <tr key={orden.id_orden_trabajo} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-medium">#{orden.id_orden_trabajo}</td>
                                    <td className="p-4 truncate max-w-xs">{orden.descripcion || 'Sin descripción'}</td>
                                    <td className="p-4">{new Date(orden.fecha_creacion).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-semibold">
                                            {typeof orden.estado === 'object' ? orden.estado.nombre : orden.estado}
                                        </span>
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