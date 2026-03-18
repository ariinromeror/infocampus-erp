import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, AlertCircle, Loader2, BookOpen, ChevronRight,
  GraduationCap, Wallet, LayoutList, BookMarked, FolderOpen,
  Info, Zap, Copy, LogIn,
} from 'lucide-react';
import { z } from 'zod';
import { DEMO_CREDENCIALES, DEMO_PASSWORD } from '../../constants/demoCredenciales';

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

const ROL_ICONS = { Director: GraduationCap, Tesorero: Wallet, Coordinador: LayoutList, Profesor: BookOpen, Estudiante: BookMarked, Secretaría: FolderOpen };
const DEMO_ROLES = DEMO_CREDENCIALES.map(({ rol, email }) => ({
  label: rol,
  email,
  Icon: ROL_ICONS[rol] || BookOpen,
}));

const CAMPUS_IMG = '/campus-bg.jpg';
const CAMPUS_FALLBACK = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80';

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeDemo, setActiveDemo] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [copiedRol, setCopiedRol] = useState(null);

  const usarCredencial = (c) => {
    setFormData({ email: c.email, password: c.password });
    setErrors({});
    setAuthError("");
  };

  const copiarCredencial = async (c) => {
    try {
      await navigator.clipboard.writeText(`${c.email}\n${c.password}`);
      setCopiedRol(c.rol);
      setTimeout(() => setCopiedRol(null), 1500);
    } catch (e) {
      console.warn('Clipboard no disponible');
    }
  };

  const entrarConCredencial = async (c) => {
    usarCredencial(c);
    setActiveDemo(c.rol);
    setLoading(true);
    setErrors({});
    setAuthError("");
    const result = await login(c.email, c.password);
    if (result.success) {
      navigate(ROLE_PATHS[result.rol] || '/', { replace: true });
    } else {
      setAuthError(result.error || "Error al entrar.");
      setLoading(false);
    }
    setActiveDemo(null);
  };

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
    <div className="min-h-screen bg-slate-900 relative">
      {/* Background: Ken Burns difuminado + overlay gradiente */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={imgError ? CAMPUS_FALLBACK : CAMPUS_IMG}
          alt=""
          className="w-full h-full object-cover animate-kenburns login-bg-blur"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/70 to-indigo-900/50" />
      </div>

      {/* Badge Demo InfoCampus - fixed */}
      <div className="fixed top-4 left-4 z-30">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-500/90 text-white text-xs font-black uppercase tracking-widest shadow-xl backdrop-blur-md">
          <BookOpen size={16} strokeWidth={2.5} />
          Demo InfoCampus
        </span>
      </div>

      {/* MOBILE: Scroll layout - app-like */}
      <div className="lg:hidden min-h-screen overflow-y-auto pb-8">
        <section className="min-h-[20vh]" aria-hidden="true" />

        {/* Demo + Form card - glassmorphism + marca integrada */}
        <section className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4 }}
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/30 bg-gradient-to-b from-white to-slate-50/80"
          >
            <div className="p-6 sm:p-8">
              {/* Logo + marca integrada */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-200/50">
                  <BookOpen className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900">InfoCampus</h1>
                  <p className="text-slate-500 text-xs">ERP académico y financiero</p>
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1">Portal de Acceso</h2>
              <p className="text-slate-500 text-sm mb-6">Acceso demo o credenciales propias</p>

              {/* Demo buttons */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Acceso rápido por rol</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {DEMO_ROLES.map((role) => {
                  const Icon = role.Icon;
                  return (
                    <motion.button
                      key={role.label}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleDemoLogin(role)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-50 transition-colors border border-indigo-100"
                    >
                      <Icon size={16} strokeWidth={1.5} />
                      {activeDemo === role.label ? <Loader2 size={16} className="animate-spin" /> : role.label}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Credenciales demo — clic para usar</p>
              <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto max-h-48 overflow-y-auto">
                {DEMO_CREDENCIALES.map((c) => (
                  <div
                    key={c.rol}
                    onClick={() => usarCredencial(c)}
                    className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 w-20 flex-shrink-0">{c.rol}</span>
                      <span className="text-[11px] text-slate-600 truncate font-mono">{c.email}</span>
                      <span className="text-[11px] text-indigo-600 font-mono flex-shrink-0">{c.password}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copiarCredencial(c); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                        title="Copiar"
                      >
                        {copiedRol === c.rol ? (
                          <span className="text-[10px] text-emerald-600 font-bold">OK</span>
                        ) : (
                          <Copy size={14} strokeWidth={2} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); entrarConCredencial(c); }}
                        disabled={loading}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        title="Entrar"
                      >
                        {activeDemo === c.rol ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} strokeWidth={2} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.5} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-colors placeholder:text-slate-400 text-sm"
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
                    className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-colors placeholder:text-slate-400 text-sm"
                    placeholder="Contraseña"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12} /> {errors.password}</p>
                )}
                <AnimatePresence>
                  {authError && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                      <AlertCircle size={16} /> {authError}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:from-indigo-400 disabled:to-indigo-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-indigo-500/25"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Ingresar <ChevronRight size={20} /></>}
                </button>
              </form>
            </div>
          </motion.div>
        </section>

        {/* ¿Qué es InfoCampus? */}
        <section className="px-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/30"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1">
              <Info size={14} /> ¿Qué es InfoCampus?
            </p>
            <p className="text-slate-700 text-sm leading-relaxed mb-3">
              Sistema de gestión académica y financiera para universidades e institutos. Inscripciones, notas, pagos, becas y reportes en un solo lugar.
            </p>
            <ul className="text-slate-600 text-xs space-y-1.5">
              <li>• 6 roles: Director, Coordinador, Profesor, Estudiante, Tesorero, Secretaría</li>
              <li>• Stack: FastAPI, React 19, PostgreSQL, JWT, RBAC</li>
              <li>• Informes PDF, chatbot IA, lógica financiera (mora, becas)</li>
            </ul>
          </motion.div>
        </section>

        {/* Cold start reminder */}
        <section className="px-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30"
          >
            <Zap size={20} className="text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-amber-800 font-semibold text-sm">Primera vez que accedes</p>
              <p className="text-amber-700/90 text-xs leading-relaxed mt-0.5">
                Esta app está alojada en Render. El primer inicio de sesión puede tardar 30-60 segundos mientras los servidores se activan. Es normal; las siguientes cargas serán rápidas.
              </p>
            </div>
          </motion.div>
        </section>
      </div>

      {/* DESKTOP: Centered card */}
      <div className="hidden lg:flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-[1000px] flex flex-col lg:flex-row rounded-3xl overflow-hidden bg-white/90 backdrop-blur-xl shadow-2xl border border-white/30 bg-gradient-to-b from-white to-slate-50/90"
      >
        {/* Left panel: branding */}
        <div className="hidden lg:flex lg:w-5/12 p-12 flex-col justify-between bg-slate-900/95 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src={imgError ? CAMPUS_FALLBACK : CAMPUS_IMG} className="w-full h-full object-cover grayscale login-bg-blur" alt="" onError={() => setImgError(true)} />
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-4 mb-2">Credenciales — clic para usar</p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {DEMO_CREDENCIALES.map((c) => (
                <div
                  key={c.rol}
                  onClick={() => usarCredencial(c)}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0 grid grid-cols-[70px_1fr_auto] gap-x-3 text-[10px] font-mono">
                    <span className="text-slate-300 font-semibold">{c.rol}</span>
                    <span className="text-slate-400 truncate">{c.email}</span>
                    <span className="text-indigo-300">{c.password}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copiarCredencial(c); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copiar"
                    >
                      {copiedRol === c.rol ? <span className="text-[9px] text-emerald-400 font-bold">OK</span> : <Copy size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); entrarConCredencial(c); }}
                      disabled={loading}
                      className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/30 disabled:opacity-50 transition-colors"
                      title="Entrar"
                    >
                      {activeDemo === c.rol ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ¿Qué es InfoCampus? */}
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <Info size={12} /> ¿Qué es InfoCampus?
            </p>
            <p className="text-slate-400 text-xs leading-relaxed mb-2">
              Sistema de gestión académica y financiera para universidades e institutos. Inscripciones, notas, pagos, becas y reportes en un solo lugar.
            </p>
            <ul className="text-slate-500 text-[10px] space-y-1">
              <li>• 6 roles: Director, Coordinador, Profesor, Estudiante, Tesorero, Secretaría</li>
              <li>• Stack: FastAPI, React 19, PostgreSQL, JWT, RBAC</li>
              <li>• Informes PDF, chatbot IA, lógica financiera (mora, becas)</li>
            </ul>
          </div>
        </div>

        {/* Right panel: form + logo integrado */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            {/* Logo + marca integrada - desktop */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-200/50">
                <BookOpen className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">InfoCampus</h1>
                <p className="text-slate-500 text-xs">ERP académico y financiero</p>
              </div>
            </div>
            <header className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Portal de Acceso</h2>
              <p className="text-slate-500 text-sm mt-1">Introduce tus credenciales</p>
            </header>

            {/* Demo (mobile) - hidden on desktop, demo is on left panel */}
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
              <p className="text-slate-500 text-[10px] mt-2">Contraseña: <span className="font-mono">{DEMO_PASSWORD}</span></p>
              <button
                onClick={() => setVerCredenciales(!verCredenciales)}
                className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold transition-colors"
              >
                {verCredenciales ? <EyeOff size={16} /> : <Eye size={16} />}
                {verCredenciales ? 'Ocultar credenciales' : 'Ver todas las credenciales'}
              </button>
              {verCredenciales && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50 border-2 border-slate-200 overflow-x-auto">
                  <div className="min-w-[280px] space-y-2 text-[11px] font-mono">
                    <div className="grid grid-cols-[70px_1fr_auto] gap-x-3 gap-y-1 text-slate-500 font-semibold border-b border-slate-200 pb-2">
                      <span>Rol</span>
                      <span>Email</span>
                      <span>Contraseña</span>
                    </div>
                    {DEMO_CREDENCIALES.map((c) => (
                      <div key={c.rol} className="grid grid-cols-[70px_1fr_auto] gap-x-3 gap-y-1 text-slate-700">
                        <span className="font-medium">{c.rol}</span>
                        <span className="truncate">{c.email}</span>
                        <span className="text-indigo-600">{c.password}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-colors placeholder:text-slate-400 text-sm"
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
                    className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-colors placeholder:text-slate-400 text-sm"
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
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:from-indigo-400 disabled:to-indigo-400 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
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

            {/* Cold start reminder - desktop */}
            <div className="flex items-start gap-3 mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <Zap size={18} className="text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-amber-800 font-semibold text-xs">Primera vez que accedes</p>
                <p className="text-amber-700/90 text-[11px] leading-relaxed mt-0.5">
                  Esta app está en Render. El primer inicio puede tardar 30-60 s mientras los servidores se activan. Las siguientes cargas serán rápidas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export default Login;
