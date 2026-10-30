import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/dashboard_resumen/');
                setStats(response.data);
            } catch (err) {
                console.error("Error cargando dashboard:", err);
                setError(true);
            }
        };
        fetchStats();
    }, []);

    if (error) return <p className="text-red-500">Error al cargar datos. Verifica permisos o el backend.</p>;
    if (!stats) return <p className="text-slate-500">Cargando métricas...</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity size={24} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Instalaciones</p><p className="text-2xl font-bold text-slate-800">{stats.total_instalaciones}</p></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Estado Normal</p><p className="text-2xl font-bold text-slate-800">{stats.normales}</p></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={24} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Con Alertas</p><p className="text-2xl font-bold text-slate-800">{stats.con_alerta}</p></div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Clock size={24} /></div>
                    <div><p className="text-sm text-slate-500 font-medium">Mantenimiento</p><p className="text-2xl font-bold text-slate-800">{stats.en_mantenimiento}</p></div>
                </div>
            </div>
        </div>
    );
}