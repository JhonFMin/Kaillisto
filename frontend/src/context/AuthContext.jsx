import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const refreshPermisos = useCallback(async () => {
        try {
            const res = await api.get('/security/me/permissions/');
            setPermisos(res.data.permisos || []);
            setRoles(res.data.roles || []);
            return res.data;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        // Verifica si ya hay sesión activa en Django (cookie de sesión)
        api.get('/security/me/permissions/')
            .then((res) => {
                setUser({
                    username: res.data.usuario,
                    es_superuser: res.data.es_superuser,
                });
                setPermisos(res.data.permisos || []);
                setRoles(res.data.roles || []);
            })
            .catch(() => {
                // 403/401 = no hay sesión, es normal, no hacer nada
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/iniciar_sesion/', { username, password });
            const userData = {
                id: response.data.id_usuario,
                username: response.data.username,
                es_superuser: response.data.es_administrador,
            };
            setUser(userData);
            await refreshPermisos();
            navigate('/dashboard');
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.detail || 'Usuario o contraseña incorrectos',
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/cerrar_sesion/');
        } catch { /* ignorar */ }
        finally {
            setUser(null);
            setPermisos([]);
            setRoles([]);
            navigate('/login', { replace: true });
        }
    };

    const hasPermission = (codename) => {
        if (!user) return false;
        if (user.es_superuser || permisos.includes('ALL')) return true;
        return permisos.includes(codename);
    };

    const isAdmin = () => {
        if (!user) return false;
        return user.es_superuser || roles.includes('Administrador');
    };

    // Verifica si el usuario tiene AL MENOS UNO de los roles dados.
    // Un superusuario u "Administrador" siempre pasa (igual que el backend,
    // ver security/models.py -> has_effective_role).
    const hasRole = (...nombresRol) => {
        if (!user) return false;
        if (isAdmin()) return true;
        return nombresRol.some((nombre) => roles.includes(nombre));
    };

    return (
        <AuthContext.Provider value={{
            user, permisos, roles, login, logout,
            loading, hasPermission, isAdmin, hasRole, refreshPermisos
        }}>
            {loading ? <PantallaCarga /> : children}
        </AuthContext.Provider>
    );
};

// Pantalla de carga mientras se resuelve la verificación de sesión inicial
// (GET /security/me/permissions/). Antes esto renderizaba "nada" (null),
// lo que en una conexión lenta se ve como una app rota en blanco.
function PantallaCarga() {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Verificando sesión...</p>
            </div>
        </div>
    );
}