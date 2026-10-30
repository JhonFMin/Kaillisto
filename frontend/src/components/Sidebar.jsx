import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import {
    LogOut, LayoutDashboard, Shield,
    Package, Cpu, Wrench,
} from 'lucide-react';

/**
 * Menú de navegación 100% reactivo (RBAC visual).
 *
 * No hay ítems "deshabilitados" ni atenuados: cada entrada define quién
 * puede verla (`visible`) a partir de los roles/permisos efectivos que
 * trae AuthContext (recalculados en cada render, porque vienen de
 * useState). Si el usuario pierde un rol -> en el próximo refresh de
 * `/security/me/permissions/` el ítem desaparece solo del array, sin
 * tocar el DOM "a mano" ni dejar nada deshabilitado en pantalla.
 *
 * La condición de cada ítem refleja el permission_class real del
 * endpoint que consume esa página en el backend (ver
 * security/permissions.py), para que el menú nunca ofrezca algo que la
 * API vaya a rechazar con 403:
 *   - Catálogos      -> TipoMedicionViewSet  -> IsAdminRole
 *   - Dispositivos    -> DispositivoViewSet   -> ReadOnlyOrManager (Líder Comunitario/Técnico de Campo/Administrador)
 *   - Mantenimiento   -> OrdenTrabajoViewSet  -> HasRole(['Técnico de Campo','Administrador'])
 *   - Roles y Permisos        -> RoleViewSet / UserRoleViewSet -> IsAdminRole
 *     (unifica lo que antes eran 3 pantallas sueltas: Roles, Permisos
 *     por Rol y Usuarios y Roles — ver pages/RolesPermisos.jsx)
 */
export default function Sidebar() {
    const { user, logout, isAdmin, hasRole } = useContext(AuthContext);
    const location = useLocation();

    const grupos = useMemo(() => ([
        {
            titulo: null,
            items: [
                { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio', visible: true },
            ],
        },
        {
            titulo: 'Operación',
            items: [
                { to: '/dispositivos', icon: Cpu, label: 'Dispositivos', visible: hasRole('Líder Comunitario', 'Técnico de Campo', 'Administrador') },
                { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento', visible: hasRole('Técnico de Campo', 'Administrador') },
                { to: '/catalogos', icon: Package, label: 'Catálogos', visible: isAdmin() },
            ],
        },
        {
            titulo: 'Administración',
            items: [
                { to: '/roles', icon: Shield, label: 'Roles y Permisos', visible: isAdmin() },
            ],
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ]), [user, isAdmin, hasRole]);

    return (
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 border-r border-slate-800">
            <div className="p-6 flex items-center justify-center border-b border-slate-800">
                <h2 className="text-xl font-bold text-white tracking-wider">KAILLISTO</h2>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {grupos.map((grupo, gi) => {
                    const visibles = grupo.items.filter((item) => item.visible);
                    // Un grupo sin ningún ítem visible no deja rastro: ni
                    // título huérfano ni espacio vacío. Esto es lo que
                    // cubre el "estado vacío" cuando el usuario no tiene
                    // ningún rol: solo queda "Inicio".
                    if (visibles.length === 0) return null;

                    return (
                        <div key={gi}>
                            {grupo.titulo && (
                                <p className="px-4 pt-4 pb-1 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    {grupo.titulo}
                                </p>
                            )}
                            {visibles.map(({ to, icon: Icon, label }) => {
                                const active = location.pathname === to;
                                return (
                                    <Link
                                        key={to}
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
                            })}
                        </div>
                    );
                })}
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
