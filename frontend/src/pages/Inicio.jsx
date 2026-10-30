import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield } from 'lucide-react';
import Dashboard from './Dashboard';

export default function Inicio() {
    const { user, roles } = useContext(AuthContext);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Bienvenido, {user?.username}</h1>
                <p className="text-slate-500 text-sm mt-1">Sistema de gestión Kaillisto IoT</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-md">
                <div className="flex items-center gap-3 mb-4">
                    <Shield size={20} className="text-slate-600" />
                    <h2 className="font-semibold text-slate-700">Tus roles activos</h2>
                </div>
                {roles.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Sin roles asignados. Pide a un administrador que te asigne uno
                        para ver más secciones en el menú.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {roles.map((r) => (
                            <span key={r} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                                {r}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* El panel de métricas solo requiere estar autenticado en el
                backend (dashboard_resumen usa IsAuthenticated), así que se
                muestra siempre, con su propio loading/error controlado. */}
            <Dashboard />
        </div>
    );
}
