import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Roles from './pages/Roles';
import Login from './pages/Login'; 

// Componente para controlar qué se muestra según la URL
const Layout = () => {
    const location = useLocation();
    const esLogin = location.pathname === '/login';

    return (
        <div className={esLogin ? "h-screen w-screen bg-slate-50" : "flex h-screen bg-slate-100 font-sans text-slate-900"}>
            {/* Solo muestra el menú si NO estamos en /login */}
            {!esLogin && <Sidebar />}
            
            <main className={`flex-1 overflow-y-auto ${esLogin ? 'p-0 h-full' : 'p-8'}`}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<div>Dashboard en construcción</div>} />
                    <Route path="/roles" element={<Roles />} />
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