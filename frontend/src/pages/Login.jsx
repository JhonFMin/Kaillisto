import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(username, password);
        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Kaillisto IoT</h1>
                    <p className="text-sm text-slate-500 mt-1">Inicia sesión para continuar</p>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                        <input
                            type="text"
                            required
                            autoComplete="username"
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}