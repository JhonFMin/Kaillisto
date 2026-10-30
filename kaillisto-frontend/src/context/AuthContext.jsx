import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedPermisos = localStorage.getItem('permisos');
        
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            setPermisos(storedPermisos ? JSON.parse(storedPermisos) : []);
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/iniciar_sesion/', { username, password });
            
            const userData = {
                id: response.data.id_usuario,
                username: response.data.username,
                es_administrador: response.data.es_administrador
            };
            
            const userPermisos = response.data.permisos || ['ALL']; // Forzamos permisos si es admin

            setUser(userData);
            setPermisos(userPermisos);
            
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('permisos', JSON.stringify(userPermisos));
            
            navigate('/');
            return { success: true };
        } catch (error) {
            console.error("Error en login:", error);
            return { 
                success: false, 
                error: error.response?.data?.detail || 'Error al iniciar sesión' 
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/cerrar_sesion/');
        } catch (error) {
            console.error("Error al cerrar sesión en backend:", error);
        } finally {
            // Limpieza total independiente de si el backend responde o falla
            setUser(null);
            setPermisos([]);
            localStorage.removeItem('user');
            localStorage.removeItem('permisos');
            navigate('/login', { replace: true });
        }
    };

    const hasPermission = (permiso_codename) => {
        if (!user) return false;
        if (user.es_administrador || permisos.includes('ALL')) return true;
        return permisos.includes(permiso_codename);
    };

    return (
        <AuthContext.Provider value={{ user, permisos, login, logout, loading, hasPermission }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};