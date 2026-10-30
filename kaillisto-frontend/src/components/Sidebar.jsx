import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, Settings, Activity, Wrench, Shield } from 'lucide-react';
export default function Sidebar() {
    const { user, logout, hasPermission } = useContext(AuthContext);

    return (
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800">
            {/* Logo */}
            <div className="p-6 flex items-center justify-center border-b border-slate-800">
                <h2 className="text-xl font-bold text-white tracking-wider">KAILLISTO</h2>
            </div>
            
            {/* Navegación */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </Link>

                {hasPermission('Dispositivos') && (
                    <Link to="/dispositivos" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                        <Activity size={18} />
                        <span>Dispositivos</span>
                    </Link>
                )}

                {hasPermission('Órdenes de Trabajo') && (
                    <Link to="/mantenimiento" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                        <Wrench size={18} />
                        <span>Mantenimiento</span>
                    </Link>
                )}

                {hasPermission('Catálogos') && (
                    <Link to="/catalogos" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                        <Settings size={18} />
                        <span>Catálogos</span>
                    </Link>
                )}
                {hasPermission('ALL') && (
                     <Link to="/roles" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium">
                        <Shield size={18} />
                        <span>Gestión de Roles</span>
                    </Link>
                )}
            </nav>

            {/* Perfil y Cerrar Sesión */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                <div className="mb-3 px-3 py-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Usuario</p>
                    <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                </div>
                <button 
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium"
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
}