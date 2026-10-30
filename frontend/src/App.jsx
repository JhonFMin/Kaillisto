import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Roles from './pages/Roles';
import Permisos from './pages/Permisos';
import Usuarios from './pages/Usuarios';

const Layout = () => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const esLogin = location.pathname === '/login';

    if (!user && !esLogin) return <Navigate to="/login" replace />;

    return (
        <div className={esLogin ? 'h-screen w-screen bg-slate-50' : 'flex h-screen bg-slate-100 font-sans text-slate-900'}>
            {!esLogin && <Sidebar />}
            <main className={`flex-1 overflow-y-auto ${esLogin ? 'p-0 h-full' : 'p-8'}`}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Inicio /></ProtectedRoute>} />
                    <Route path="/roles" element={<ProtectedRoute adminOnly><Roles /></ProtectedRoute>} />
                    <Route path="/permisos" element={<ProtectedRoute adminOnly><Permisos /></ProtectedRoute>} />
                    <Route path="/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
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