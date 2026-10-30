import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Wrench } from 'lucide-react';

// Vista estrictamente pública. No consulta /security/me/permissions/ ni
// ningún otro endpoint privado: no debe depender de que haya sesión.
export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
            <header className="border-b border-slate-200 bg-white">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-wider">KAILLISTO</h1>
                    <Link
                        to="/login"
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                    >
                        Iniciar sesión
                    </Link>
                </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full">
                <div className="max-w-2xl">
                    <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                        Monitoreo y mantenimiento de instalaciones solares
                    </h2>
                    <p className="mt-4 text-slate-600 text-lg">
                        Kaillisto centraliza mediciones de dispositivos IoT, alertas y
                        órdenes de trabajo para tus instalaciones comunitarias.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block mt-8 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                    >
                        Ingresar al sistema
                    </Link>
                </div>

                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <Activity className="text-blue-600 mb-3" size={24} />
                        <h3 className="font-semibold text-slate-800">Monitoreo en vivo</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Mediciones y alertas de cada instalación, en tiempo real.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <Wrench className="text-amber-600 mb-3" size={24} />
                        <h3 className="font-semibold text-slate-800">Mantenimiento</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Órdenes de trabajo asignadas a técnicos, con trazabilidad.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <ShieldCheck className="text-emerald-600 mb-3" size={24} />
                        <h3 className="font-semibold text-slate-800">Acceso por roles</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Cada usuario ve solo lo que su rol le permite.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
