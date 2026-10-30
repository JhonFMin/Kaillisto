import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Única puerta de entrada a todo lo privado. Mientras `loading` es true,
 * AuthProvider ya está mostrando la pantalla de carga global (ver
 * AuthContext.jsx), así que aquí no hay nada que renderizar todavía: el
 * contenido privado no debe ni intentar montarse por debajo.
 *
 * - Sin `user` -> nunca se monta `children`, se redirige a /login.
 * - `adminOnly` -> además exige rol Administrador (o superuser).
 * - `roles={['Empleado', 'Administrador']}` -> exige al menos uno de esos
 *   roles. Debe reflejar el mismo permission_class que usa el endpoint en
 *   el backend (ver security/permissions.py) para que el menú y el guard
 *   de ruta nunca prometan algo que la API luego rechaza.
 */
export default function ProtectedRoute({ children, adminOnly = false, roles = null }) {
    const { user, isAdmin, hasRole, loading } = useContext(AuthContext);

    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;
    if (roles && !hasRole(...roles)) return <Navigate to="/dashboard" replace />;

    return children;
}
