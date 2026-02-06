import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, CreditCard, ExternalLink, LogOut } from 'lucide-react';

const BlockedScreen = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-6 sm:px-6 font-sans">
            <div className="max-w-lg w-full bg-slate-800 border-t-4 sm:border-t-8 border-red-600 rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 text-center transition-all duration-500 animate-in fade-in zoom-in">
                
                {/* Icono de Alerta */}
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-red-600/10 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                    <ShieldAlert className="text-red-500 w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
                </div>

                {/* Texto de Bloqueo */}
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 uppercase">
                    Acceso Restringido
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mb-5 sm:mb-6 px-2">
                    Estimado(a) <span className="text-white font-bold">{user?.first_name} {user?.last_name}</span>, detectamos un inconveniente con tu estado de cuenta.
                </p>

                {/* Cuadro de Información */}
                <div className="bg-slate-900/50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-700 text-left">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="bg-red-600 p-2 rounded-lg flex-shrink-0">
                            <CreditCard className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-white font-bold text-xs sm:text-sm">Estado Administrativo: MORA</h3>
                            <p className="text-slate-500 text-[11px] sm:text-xs mt-1">
                                Según nuestros registros del **Golden Dataset**, posees facturas pendientes. Por favor, regulariza tu situación en Tesorería para habilitar tus módulos académicos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    <button 
                        onClick={() => window.location.href = 'https://pagos.infocampus.com'}
                        className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all active:scale-95 text-sm"
                    >
                        PAGAR EN LÍNEA <ExternalLink size={16} />
                    </button>
                    
                    <button 
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all text-sm"
                    >
                        CERRAR SESIÓN <LogOut size={16} />
                    </button>
                </div>

                {/* Footer Institucional */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-700/50">
                    <p className="text-[10px] text-slate-500 tracking-[2px] uppercase">
                        Departamento de Tesorería | Info Campus © 2026
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BlockedScreen;