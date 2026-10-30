import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Shield, Users, Key } from 'lucide-react';

export default function Sidebar() {
    const { user, logout, isAdmin } = useContext(AuthContext);
    const location = useLocation();

    const navItem = (to, Icon, label) => {
        const active = location.pathname === to;
        return (
            <Link
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium
                    ${active
                        ? 'bg-slate-700 text-white'
                        : 'hover:bg-slate-800 hover:text-white text-slate-300'}`}
            >
                <Icon size={18} />
                <span>{label}</span>
            </Link>
        );
    };

    return (
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800">
            <div className="p-6 flex items-center justify-center border-b border-slate-800">
                <h2 className="text-xl font-bold text-white tracking-wider">KAILLISTO</h2>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItem('/', LayoutDashboard, 'Inicio')}

                {isAdmin() && (
                    <>
                        <p className="px-4 pt-4 pb-1 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            Administración
                        </p>
                        {navItem('/roles', Shield, 'Roles')}
                        {navItem('/permisos', Key, 'Permisos por Rol')}
                        {navItem('/usuarios', Users, 'Usuarios y Roles')}
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                <div className="mb-3 px-3 py-2">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Sesión</p>
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