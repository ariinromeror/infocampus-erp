import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, AlertCircle, Loader2, BookOpen, ChevronRight, ChevronDown,
  GraduationCap, Wallet, LayoutList, BookMarked, FolderOpen,
  Zap, ChevronUp,
} from 'lucide-react';
import { z } from 'zod';
import { DEMO_PASSWORD, DEMO_USUARIOS_UNICOS, DEMO_PROFESORES, DEMO_ESTUDIANTES } from '../../constants/demoUsuarios';
import ProjectInfoModal from '../../components/ProjectInfoModal';

const ROLE_PATHS = {
  estudiante: '/estudiante/dashboard',
  profesor: '/profesor/dashboard',
  tesorero: '/tesorero/dashboard',
  director: '/director/dashboard',
  coordinador: '/coordinador/dashboard',
  admin: '/director/dashboard',
  administrativo: '/secretaria/dashboard',
};

const loginSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

const ROL_ICONS = {
  Director: GraduationCap,
  Tesorero: Wallet,
  Coordinador: LayoutList,
  Profesor: BookOpen,
  Estudiante: BookMarked,
  Secretaría: FolderOpen,
};

const ROLES_UNICOS = DEMO_USUARIOS_UNICOS.map((u) => ({
  ...u,
  Icon: ROL_ICONS[u.rol] || BookOpen,
}));

const ROLES_CON_LISTA = [
  { rol: 'Profesor', usuarios: DEMO_PROFESORES, Icon: BookOpen },
  { rol: 'Estudiante', usuarios: DEMO_ESTUDIANTES, Icon: BookMarked },
];

const CAMPUS_IMG = '/campus-bg.jpg';
const CAMPUS_FALLBACK = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80';

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeDemo, setActiveDemo] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [expandedRol, setExpandedRol] = useState(null); // 'Profesor' | 'Estudiante' | null
  const [showForm, setShowForm] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (email, password) => {
    setLoading(true);
    setAuthError("");
    const result = await login(email, password);
    if (result.success) {
      navigate(ROLE_PATHS[result.rol] || '/', { replace: true });
    } else {
      setAuthError(result.error || "Error al entrar.");
      setLoading(false);
    }
  };

  const handleDemoDirect = async (role) => {
    setActiveDemo(role.rol);
    await handleLogin(role.email, DEMO_PASSWORD);
    setActiveDemo(null);
  };

  const handleDemoFromList = async (user) => {
    setActiveDemo(user.email);
    await handleLogin(user.email, DEMO_PASSWORD);
    setActiveDemo(null);
    setExpandedRol(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    if (authError) setAuthError("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const formattedErrors = validation.error.format();
      setErrors({
        email: formattedErrors.email?._errors[0],
        password: formattedErrors.password?._errors[0],
      });
      return;
    }
    setLoading(true);
    setAuthError("");
    const result = await login(formData.email.trim(), formData.password);
    if (result.success) {
      navigate(ROLE_PATHS[result.rol] || '/', { replace: true });
    } else {
      setAuthError(result.error || "Acceso denegado. Verifica tus credenciales.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] relative">
      {/* Background: Ken Burns difuminado */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={imgError ? CAMPUS_FALLBACK : CAMPUS_IMG}
          alt=""
          className="w-full h-full object-cover animate-kenburns login-bg-blur opacity-30"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-[#FCFBF8]/90" />
      </div>

      <div className="relative z-10 min-h-screen overflow-y-auto pb-12">
        <div className="max-w-lg mx-auto px-4 pt-8 lg:pt-16">
          {/* Logo en cuadro azul estilo LinkedIn */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-[#0A66C2] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">InfoCampus</h1>
              <p className="text-slate-500 text-xs">ERP académico y financiero</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-800 mb-1">Portal de Acceso</h2>
          <p className="text-slate-500 text-sm mb-6">Acceso demo por rol</p>

          {/* Grid de roles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {ROLES_UNICOS.map((role) => {
              const Icon = role.Icon;
              return (
                <motion.button
                  key={role.rol}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDemoDirect(role)}
                  disabled={loading}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all disabled:opacity-50 text-left w-full"
                >
                  <Icon className="w-6 h-6 text-slate-500" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-800">{role.rol}</span>
                  {activeDemo === role.rol ? (
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </motion.button>
              );
            })}
            {ROLES_CON_LISTA.map(({ rol, usuarios, Icon }) => {
              const isExpanded = expandedRol === rol;
              return (
                <div key={rol} className="col-span-2 sm:col-span-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setExpandedRol(isExpanded ? null : rol)}
                    disabled={loading}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all disabled:opacity-50 text-left w-full"
                  >
                    <Icon className="w-6 h-6 text-slate-500" strokeWidth={1.5} />
                    <span className="text-sm font-semibold text-slate-800">{rol}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </motion.button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 rounded-xl bg-white border border-slate-200 overflow-hidden"
                      >
                        <div className="max-h-48 overflow-y-auto p-2">
                          {usuarios.map((u) => (
                            <button
                              key={u.email}
                              onClick={() => handleDemoFromList(u)}
                              disabled={loading}
                              className="w-full flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors disabled:opacity-50"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{u.nombre}</p>
                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                              </div>
                              {activeDemo === u.email ? (
                                <Loader2 className="w-4 h-4 text-slate-500 animate-spin flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Formulario colapsable */}
          <div className="mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              {showForm ? 'Ocultar' : '¿Tienes credenciales?'}
              {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {showForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="mt-4 space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.5} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      className="w-full border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 rounded-xl py-3 pl-12 pr-4 text-slate-900 outline-none placeholder:text-slate-400 text-sm"
                      placeholder="correo@infocampus.edu.es"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.email}</p>
                  )}
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.5} />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      className="w-full border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 rounded-xl py-3 pl-12 pr-4 text-slate-900 outline-none placeholder:text-slate-400 text-sm"
                      placeholder="Contraseña"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.password}</p>
                  )}
                  <AnimatePresence>
                    {authError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {authError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Ingresar <ChevronRight size={18} /></>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Botón Ver más sobre esto */}
          <button
            onClick={() => setShowProjectModal(true)}
            className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-medium text-sm transition-colors"
          >
            Ver más sobre este proyecto
          </button>

          {/* Advertencia cold start — discreta */}
          <div className="mt-6 flex items-start gap-2 p-3 rounded-xl bg-slate-800/90 text-slate-100">
            <Zap size={16} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-xs font-semibold">Primera vez que accedes</p>
              <p className="text-[11px] leading-relaxed mt-0.5 opacity-90">
                Esta app está en Render. El primer inicio puede tardar 30-60 s. Las siguientes cargas serán rápidas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ProjectInfoModal isOpen={showProjectModal} onClose={() => setShowProjectModal(false)} />
    </div>
  );
};

export default Login;
