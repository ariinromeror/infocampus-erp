import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    LogOut, BookOpen, LayoutDashboard, 
    GraduationCap, ClipboardList, Wallet, 
    ChevronRight, Users, Landmark, BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuConfig = {
        estudiante: [
            { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Mis Notas', path: '/notas', icon: GraduationCap },
            { name: 'Horarios', path: '/horarios', icon: BookOpen },
            { name: 'Estado de Cuenta', path: '/estado-cuenta', icon: Wallet },
        ],
        profesor: [
            { name: 'Panel Control', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Mis Secciones', path: '/secciones', icon: ClipboardList },
        ],
        tesorero: [
            { name: 'Caja Principal', path: '/dashboard', icon: Landmark },
            { name: 'Validar Pagos', path: '/validar-pagos', icon: Wallet },
            { name: 'Lista de Mora', path: '/lista-mora', icon: Users },
        ],
        director: [
            { name: 'Global Insight', path: '/dashboard', icon: BarChart3 },
        ],
        coordinador: [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Secciones', path: '/secciones', icon: ClipboardList },
        ],
        administrativo: [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ]
    };

    const menuItems = menuConfig[user?.rol] || [];

    return (
        <aside className="hidden lg:flex flex-col w-72 bg-slate-900 border-r border-slate-800 shadow-2xl z-50">
            <div className="p-8 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3 group-hover:rotate-0 transition-transform">
                        <GraduationCap className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">
                            Campus<span className="text-indigo-500">Elite</span>
                        </h1>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Management System</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Menú Principal</p>
                
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group ${
                                isActive 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 translate-x-1' 
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-white/20' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                    <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                                </div>
                                <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                                    {item.name}
                                </span>
                            </div>
                            {isActive && (
                                <motion.div layoutId="activeDot" className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                            )}
                            {!isActive && (
                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-6 bg-slate-950/40 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-black text-xs uppercase shadow-inner">
                        {user?.username?.substring(0, 2)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-black text-white truncate uppercase italic">{user?.username}</p>
                        <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">{user?.rol}</p>
                    </div>
                </div>

                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-slate-800 text-slate-500 font-black text-[10px] uppercase hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all duration-300 group"
                >
                    <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;