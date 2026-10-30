import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import RolesPermisos from './pages/RolesPermisos';
import Catalogos from './pages/Catalogos';
import Dispositivos from './pages/Dispositivos';
import Mantenimiento from './pages/Mantenimiento';

// Rutas que son estrictamente públicas: no requieren sesión, y no deben
// disparar NINGUNA petición privada (me/permissions, dashboard_resumen,
// etc.) para renderizarse.
const RUTAS_PUBLICAS = ['/', '/login'];

const Layout = () => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const esPublica = RUTAS_PUBLICAS.includes(location.pathname);

    // Alguien intenta entrar directo a una ruta privada por URL sin
    // sesión -> fuera antes de montar Sidebar o cualquier página privada.
    if (!user && !esPublica) return <Navigate to="/login" replace />;

    // Sesión ya activa intentando ver landing o login -> no tiene sentido,
    // lo mandamos directo a su home.
    if (user && esPublica) return <Navigate to="/dashboard" replace />;

    return (
        <div className={esPublica ? 'min-h-screen w-screen' : 'flex h-screen bg-slate-100 font-sans text-slate-900'}>
            {!esPublica && <Sidebar />}
            <main className={esPublica ? 'w-full' : 'flex-1 overflow-y-auto p-8'}>
                <Routes>
                    {/* Públicas */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />

                    {/* Privadas: cada una refleja el permission_class real
                        del endpoint que consume en el backend. */}
                    <Route path="/dashboard" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
                    <Route
                        path="/dispositivos"
                        element={<ProtectedRoute permission="view_dispositivo"><Dispositivos /></ProtectedRoute>}
                    />
                    <Route
                        path="/mantenimiento"
                        element={<ProtectedRoute permission="view_ordentrabajo"><Mantenimiento /></ProtectedRoute>}
                    />
                    <Route path="/catalogos" element={<ProtectedRoute permission="view_tipomedicion"><Catalogos /></ProtectedRoute>} />                    <Route path="/roles" element={<ProtectedRoute adminOnly><RolesPermisos /></ProtectedRoute>} />
                    {/* Rutas antiguas: quien tenga el link guardado cae en la pantalla unificada */}
                    <Route path="/permisos" element={<Navigate to="/roles" replace />} />
                    <Route path="/usuarios" element={<Navigate to="/roles" replace />} />

                    <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
                </Routes>
            </main>
        </div>
    );
};

export default function App() {
    return (
        <Router>
            <AuthProvider>
                <Layout />
            </AuthProvider>
        </Router>
    );
}
