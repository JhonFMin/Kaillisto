import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * - Sin `user` -> redirige a /login.
 * - `adminOnly` -> exige rol Administrador real (o superuser). Se usa SOLO
 *   para páginas de gestión de roles/usuarios: eso no se abre por permiso
 *   suelto, es intencional (mismo criterio que IsAdminRole en el backend).
 * - `permission="view_x"` -> exige ese permiso efectivo (lo que de verdad
 *   esté marcado en Roles y Permisos). Así la ruta refleja TienePermisoAsignado
 *   del backend en vez de un nombre de rol fijo.
 */
export default function ProtectedRoute({ children, adminOnly = false, roles = null, permission = null }) {
    const { user, isAdmin, hasRole, hasPermission, loading } = useContext(AuthContext);

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;
    if (roles && !hasRole(...roles)) return <Navigate to="/dashboard" replace />;
    if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />;

    return children;
}