// frontend/src/components/UniversalSidebar.jsx
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SIDEBAR_NAV } from '../config/sidebarNav';

const NavItem = ({ item, onClose }) => (
  <NavLink
    to={item.path}
    onClick={() => window.innerWidth < 1024 && onClose?.()}
    className={({ isActive }) =>
      `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 translate-x-1'
          : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
      }`
    }
  >
    <item.icon
      size={18}
      strokeWidth={1.5}
      className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
    />
    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{item.label}</span>
  </NavLink>
);

const NavSection = ({ section, onClose }) => (
  <div className="my-2 px-2">
    {section.label && (
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 px-3 mb-2">
        {section.label}
      </p>
    )}
    <div className="flex flex-col gap-1">
      {section.items.map(item => (
        <NavItem key={item.path} item={item} onClose={onClose} />
      ))}
    </div>
  </div>
);

const UniversalSidebar = ({ role, isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const config = SIDEBAR_NAV[role];

  if (!config) return null;

  const nombre = user?.nombre?.split(' ').slice(0, 2).join(' ') || '—';

  return (
    <>
      {/* Overlay móvil */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 lg:hidden transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#0f172a] flex flex-col border-r border-white/5
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-72'}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-500/30 flex-shrink-0">
              IC
            </div>
            <span className="font-black italic text-white tracking-tighter uppercase text-lg">
              InfoCampus
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Badge de rol + nombre (solo si showUserName) */}
        {config.showUserName && (
          <div className="px-8 py-4 border-b border-white/5 flex-shrink-0">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
              {config.roleLabel}
            </p>
            <p className="text-sm font-black italic text-white uppercase tracking-tight truncate">
              {nombre}
            </p>
          </div>
        )}

        {/* Navegación */}
        <nav
          className="flex-1 py-6 px-2 flex flex-col overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {config.sections.map((section, i) => (
            <NavSection key={i} section={section} onClose={onClose} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-6 border-t border-white/5 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-2xl transition-all duration-300 group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UniversalSidebar;
