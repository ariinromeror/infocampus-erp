import React from 'react';
import { Menu, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const ROLE_THEMES = {
  director:    'text-indigo-600 bg-indigo-50 border-transparent',
  profesor:    'text-amber-600 bg-amber-50 border-transparent',
  estudiante:  'text-emerald-600 bg-emerald-50 border-transparent',
  tesorero:    'text-teal-600 bg-teal-50 border-transparent',
  coordinador: 'text-violet-600 bg-violet-50 border-transparent',
};

const Header = ({ toggleMobileSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  const currentPath = location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard';
  const roleStyle = ROLE_THEMES[user?.rol] || 'text-slate-600 bg-slate-50 border-transparent';

  return (
    <header className="h-16 sm:h-20 bg-white/70 backdrop-blur-xl sticky top-0 z-40 px-6 sm:px-10 flex items-center justify-between border-none ring-0 outline-none shadow-sm shadow-slate-200/40">
      
      {/* IZQUIERDA: Navegación y Contexto */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none uppercase">
              {user?.nombre || 'Usuario'}
            </h2>
            
            <div className="flex items-center gap-1.5 mt-1 text-slate-400">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${roleStyle}`}>
                {user?.rol || 'Staff'}
              </span>
              <ChevronRight size={10} className="opacity-50" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] truncate max-w-[100px] sm:max-w-none">
                {currentPath}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DERECHA: Utilidades y Perfil */}
      <div className="flex items-center gap-4">
        
        {/* Indicador de Seguridad */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-950 text-white rounded-full">
          <ShieldCheck size={11} className="text-emerald-400" />
          <span className="text-[11px] font-black uppercase tracking-widest">Secure</span>
        </div>

        {/* Separador vertical limpio */}
        <div className="h-6 w-px bg-slate-100 mx-1 hidden sm:block" />

        {/* Avatar Compacto */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 bg-slate-100 ring-1 ring-slate-200 rounded-2xl flex items-center justify-center text-slate-900 font-black text-sm shadow-sm transition-transform hover:scale-105 cursor-pointer">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;