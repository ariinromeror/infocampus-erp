import React from 'react';
import { Menu, Award, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ toggleMobileSidebar }) => {
    const { user } = useAuth();

    return (
        <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10 px-4 sm:px-8 flex items-center justify-between shadow-sm">
            
            {/* IZQUIERDA: Contexto */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <button 
                    onClick={toggleMobileSidebar} 
                    className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                >
                    <Menu size={24} />
                </button>
                
                <div className="hidden sm:block min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 italic tracking-tighter truncate">
                        Hola, {user?.first_name || user?.username}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        {user?.carrera_detalle ? (
                            <>
                                <span className="uppercase tracking-wide text-indigo-600 font-bold truncate">{user.carrera_detalle.nombre}</span>
                                <span className="text-slate-300 hidden md:inline">•</span>
                                <span className="hidden md:inline">Código: {user.carrera_detalle.codigo}</span>
                            </>
                        ) : (
                            <span>Panel Administrativo</span>
                        )}
                    </div>
                </div>

                {/* Versión móvil - más compacta */}
                <div className="sm:hidden min-w-0 flex-1">
                    <h2 className="text-sm font-black text-slate-800 italic truncate">
                        {user?.first_name || user?.username}
                    </h2>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase truncate">
                        {user?.carrera_detalle?.codigo || user?.rol}
                    </p>
                </div>
            </div>

            {/* DERECHA: Badges y Perfil */}
            <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                
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

                {/* Badges móviles - solo íconos */}
                <div className="flex md:hidden items-center gap-2">
                    {user?.es_becado && (
                        <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <Award size={14} className="text-emerald-600" />
                        </div>
                    )}
                    {user?.en_mora && (
                        <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg animate-pulse">
                            <AlertCircle size={14} className="text-amber-600" />
                        </div>
                    )}
                </div>

                <div className="h-6 sm:h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

                {/* AVATAR */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-slate-900 leading-none capitalize">{user?.username}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                            {user?.rol}
                        </p>
                    </div>
                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 text-xs sm:text-sm ring-2 ring-white ring-offset-1 sm:ring-offset-2 ring-offset-slate-50">
                        {user?.first_name?.charAt(0) || user?.username?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;