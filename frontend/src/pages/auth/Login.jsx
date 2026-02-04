import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, Loader2, BookOpen } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLocalError('');

        const result = await login(username, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setLocalError(result.message || 'Credenciales incorrectas');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans bg-slate-50">
             
            {/* MITAD IZQUIERDA - DECORACIÓN CON BIBLIOTECA DIFUMINADA */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Imagen de la Biblioteca con Blur */}
                <img 
                    src="/campus-bg.jpg" 
                    alt="Biblioteca Institucional" 
                    className="absolute inset-0 w-full h-full object-cover scale-105 blur-[3px]"
                />
                
                {/* Capa de contraste Indigo/Slate profundo */}
                <div className="absolute inset-0 bg-slate-900/70 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                
                {/* Contenido del lado izquierdo */}
                <div className="relative z-10 w-full flex flex-col justify-center p-16 text-white">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-white/10">
                            <BookOpen className="h-10 w-10 text-indigo-300" />
                        </div>
                    </div>
                    
                    <h1 className="text-6xl font-black mb-4 italic tracking-tighter leading-none">
                        INFO <span className="text-indigo-400">CAMPUS</span>
                    </h1>
                    
                    <p className="text-xl text-slate-300 max-w-md font-light leading-relaxed">
                        Gestiona tu trayectoria académica en un entorno diseñado para la excelencia.
                    </p>
                    
                    {/* Estadísticas con efecto de Cristal Esmerilado (Glassmorphism) */}
                    <div className="grid grid-cols-3 gap-4 mt-12 p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                        <div className="text-center border-r border-white/10">
                            <p className="text-3xl font-black text-white">450+</p>
                            <p className="text-[10px] text-indigo-300 uppercase tracking-[0.2em] font-bold mt-1">Alumnos</p>
                        </div>
                        <div className="text-center border-r border-white/10">
                            <p className="text-3xl font-black text-white">45+</p>
                            <p className="text-[10px] text-indigo-300 uppercase tracking-[0.2em] font-bold mt-1">Docentes</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-black text-white">5</p>
                            <p className="text-[10px] text-indigo-300 uppercase tracking-[0.2em] font-bold mt-1">Carreras</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MITAD DERECHA - FORMULARIO */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white lg:bg-transparent">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-slate-100">
                    
                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Acceso Institucional
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 font-medium">
                             Ingresa tus credenciales para continuar
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div>
                                <label className="text-slate-700 text-[11px] font-black uppercase tracking-widest mb-2 block">Usuario</label>
                                <div className="relative flex items-center">
                                    <User className="w-5 h-5 absolute left-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full text-sm border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 rounded-xl pl-12 pr-4 py-4 outline-none transition-all bg-slate-50/50"
                                        placeholder="usuario.alumno"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-700 text-[11px] font-black uppercase tracking-widest mb-2 block">Contraseña</label>
                                <div className="relative flex items-center">
                                    <Lock className="w-5 h-5 absolute left-4 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        className="w-full text-sm border border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 rounded-xl pl-12 pr-4 py-4 outline-none transition-all bg-slate-50/50"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {localError && (
                            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-xs p-4 rounded-xl shadow-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span className="font-bold">{localError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full flex justify-center items-center py-5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-xs font-black text-white bg-slate-900 hover:bg-indigo-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition-all active:scale-[0.98]
                                ${loading ? 'opacity-80 cursor-not-allowed' : ''}
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    VALIDANDO...
                                </>
                            ) : (
                                'INGRESAR AL PORTAL'
                            )}
                        </button>
                    </form>
                    
                    <div className="pt-6 text-center">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                            © 2026 Sistema de Gestión Académica
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;