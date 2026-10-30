import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Kaillisto IoT</h1>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Usuario</label>
                        <input 
                            type="text" 
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                        <input 
                            type="password" 
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white py-2 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
}