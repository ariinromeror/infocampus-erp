import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, AlertCircle, Loader2, BookOpen, ChevronRight,
  GraduationCap, Wallet, LayoutList, BookMarked, FolderOpen,
} from 'lucide-react';
import { z } from 'zod';

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

const DEMO_ROLES = [
  { label: "Director", email: "director@infocampus.edu.es", Icon: GraduationCap },
  { label: "Tesorero", email: "tesorero@infocampus.edu.es", Icon: Wallet },
  { label: "Coordinador", email: "coordinador@infocampus.edu.es", Icon: LayoutList },
  { label: "Profesor", email: "profesor@infocampus.edu.es", Icon: BookOpen },
  { label: "Estudiante", email: "estudiante@infocampus.edu.es", Icon: BookMarked },
  { label: "Secretaría", email: "secretaria@infocampus.edu.es", Icon: FolderOpen },
];

const DEMO_PASSWORD = "campus2026";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeDemo, setActiveDemo] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    if (authError) setAuthError("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setAuthError("");
    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const formattedErrors = validation.error.format();
      setErrors({
        email: formattedErrors.email?._errors[0],
        password: formattedErrors.password?._errors[0],
      });
      setLoading(false);
      return;
    }
    const result = await login(formData.email.trim(), formData.password);
    if (result.success) {
      const destination = ROLE_PATHS[result.rol] || '/';
      navigate(destination, { replace: true });
    } else {
      setAuthError(result.error || "Acceso denegado. Verifica tus credenciales.");
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setActiveDemo(role.label);
    setErrors({});
    setAuthError("");
    setFormData({ email: role.email, password: DEMO_PASSWORD });
    setLoading(true);
    const result = await login(role.email, DEMO_PASSWORD);
    if (result.success) {
      navigate(ROLE_PATHS[result.rol] || '/', { replace: true });
    } else {
      setAuthError(result.error || "Error al entrar con la cuenta demo.");
      setLoading(false);
    }
    setActiveDemo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 overflow-hidden relative">
      {/* Background: campus image with dark overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/campus-bg.jpg"
          className="w-full h-full object-cover"
          alt=""
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-slate-900/75" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[1000px] flex flex-col lg:flex-row m-4 rounded-xl overflow-hidden bg-white shadow-2xl"
      >
        {/* Left panel: branding */}
        <div className="hidden lg:flex lg:w-5/12 p-12 flex-col justify-between bg-slate-900 relative">
          <div className="absolute inset-0 opacity-30">
            <img src="/campus-bg.jpg" className="w-full h-full object-cover grayscale" alt="" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 bg-white flex items-center justify-center rounded-xl">
                <BookOpen className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">Info Campus</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-3">
              Gestión académica
            </h1>
            <p className="text-slate-400 text-sm">Sistema integrado para instituciones educativas.</p>
          </div>

          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Acceso Demo</p>
            <p className="text-slate-400 text-xs mb-4">
              Explora el sistema como cualquier rol. Un clic para autenticarse.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ROLES.map((role) => {
                const Icon = role.Icon;
                return (
                <motion.button
                  key={role.label}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleDemoLogin(role)}
                  disabled={loading}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-indigo-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{role.label}</p>
                    <p className="text-slate-500 text-[10px] truncate">{role.email}</p>
                  </div>
                  {activeDemo === role.label ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white shrink-0" strokeWidth={1.5} />
                  )}
                </motion.button>
              );})}
            </div>
            <p className="text-slate-500 text-[10px] mt-3">Contraseña: <span className="font-mono text-slate-400">{DEMO_PASSWORD}</span></p>
          </div>
        </div>

        {/* Right panel: form */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-sm mx-auto w-full">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Portal de Acceso</h2>
              <p className="text-slate-500 text-sm mt-1">Introduce tus credenciales</p>
            </header>

            {/* Demo (mobile) */}
            <div className="lg:hidden mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Acceso Demo</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ROLES.map((role) => {
                  const Icon = role.Icon;
                  return (
                  <motion.button
                    key={role.label}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleDemoLogin(role)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <Icon size={14} strokeWidth={1.5} />
                    {activeDemo === role.label ? <Loader2 size={14} className="animate-spin" /> : role.label}
                  </motion.button>
                );})}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.5} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-colors placeholder:text-slate-400 text-sm"
                    placeholder="correo@infocampus.edu.es"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} strokeWidth={1.5} /> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.5} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    className="w-full border border-slate-200 focus:border-indigo-500 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-colors placeholder:text-slate-400 text-sm"
                    placeholder="Contraseña"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} strokeWidth={1.5} /> {errors.password}
                  </p>
                )}
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2"
                  >
                    <AlertCircle size={16} strokeWidth={1.5} />
                    {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <>Ingresar <ChevronRight size={18} strokeWidth={1.5} /></>
                )}
              </button>
            </form>

            <p className="text-slate-400 text-xs text-center mt-6">
              Acceso exclusivo para personal autorizado
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
