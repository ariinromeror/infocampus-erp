import React from 'react';
import { Menu, Award, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ toggleMobileSidebar }) => {
    const { user } = useAuth();

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
            
            {/* IZQUIERDA: Contexto */}
            <div className="flex items-center gap-4">
                <button onClick={toggleMobileSidebar} className="md:hidden p-2 text-slate-600">
                    <Menu size={24} />
                </button>
                
                <div className="hidden md:block">
                    <h2 className="text-xl font-black text-slate-800 italic tracking-tighter">
                        Hola, {user?.first_name || user?.username}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        {user?.carrera_detalle ? (
                            <>
                                <span className="uppercase tracking-wide text-indigo-600 font-bold">{user.carrera_detalle.nombre}</span>
                                <span className="text-slate-300">•</span>
                                <span>Código: {user.carrera_detalle.codigo}</span>
                            </>
                        ) : (
                            <span>Panel Administrativo</span>
                        )}
                    </div>
                </div>
            </div>

            {/* DERECHA: Badges y Perfil */}
            <div className="flex items-center gap-6">
                
                {/* BADGES INTELIGENTES */}
                <div className="hidden md:flex items-center gap-3">
                    {user?.es_becado && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-black text-emerald-700 uppercase tracking-wide">
                            <Award size={12} />
                            <span>Beca {user.porcentaje_beca}%</span>
                        </div>
                    )}

                    {user?.en_mora ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-black text-amber-700 uppercase tracking-wide animate-pulse">
                            <AlertCircle size={12} />
                            <span>Pago Pendiente</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-wide">
                            <ShieldCheck size={12} />
                            <span>Solvente</span>
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                {/* AVATAR */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-slate-900 leading-none capitalize">{user?.username}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                            {user?.rol}
                        </p>
                    </div>
                    <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 text-sm ring-2 ring-white ring-offset-2 ring-offset-slate-50">
                        {user?.first_name?.charAt(0) || user?.username?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;