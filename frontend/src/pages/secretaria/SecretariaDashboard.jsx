import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Users, BookOpen, AlertTriangle, CheckCircle2, TrendingUp, AlertCircle, ClipboardList, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useSecretariaDashboard from './hooks/useSecretariaDashboard';
import StatCard from '../../components/shared/StatCard';
import DashboardHero from '../../components/DashboardHero';

const CHART_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

const SecretariaDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.nombre?.split(' ')[0] || 'Secretaría';
  const { resumen, periodo, loading, error } = useSecretariaDashboard();

  const carreras = resumen?.estudiantes_por_carrera || [];

  const kpis = [
    { label: 'Estudiantes', value: resumen?.total_estudiantes ?? resumen?.estudiantes ?? '—', icon: 'Users', warn: false },
    { label: 'Secciones', value: resumen?.total_secciones ?? resumen?.secciones ?? '—', icon: 'BookOpen', warn: false },
    { label: 'En Mora', value: resumen?.estudiantes_mora ?? '—', icon: 'AlertTriangle', warn: !!resumen?.estudiantes_mora },
    { label: 'Período', value: periodo?.codigo ?? periodo?.nombre ?? '—', icon: 'TrendingUp', warn: false },
  ];

  const acciones = [
    { label: 'Inscribir Estudiante', sub: 'Crear nuevo o inscribir existente', icon: ClipboardList, path: '/secretaria/inscripciones', color: 'bg-indigo-600 text-white' },
  ];

  const directorio = [
    { label: 'Ver Estudiantes', sub: 'Directorio completo', icon: Users, path: '/secretaria/estudiantes', color: 'bg-white border border-slate-200 text-slate-900' },
    { label: 'Ver Secciones', sub: 'Oferta académica', icon: BookOpen, path: '/secretaria/secciones', color: 'bg-white border border-slate-200 text-slate-900' },
  ];

  if (error) return (
    <div className="p-10 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex items-center gap-6">
      <AlertCircle size={36} />
      <p className="text-[10px] font-black uppercase tracking-widest">Error al cargar datos institucionales</p>
    </div>
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6 lg:space-y-8 overflow-x-hidden"
    >
      <motion.div variants={item}>
        <DashboardHero
          badge="Panel de Secretaría"
          greeting={`Hola, ${nombre}`}
          subtitle={`Gestión académica${periodo?.nombre ? ` — ${periodo.nombre}` : ''}`}
        />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map(({ label, value, icon, warn }, i) => (
          <StatCard key={label} titulo={label} valor={value} icon={icon} warn={warn} loading={loading} delay={i * 0.05} />
        ))}
      </motion.div>

      {carreras.length > 0 && (
        <motion.div variants={item} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Distribución de Estudiantes por Carrera</h2>
            <BarChart3 size={18} className="text-slate-400" strokeWidth={1.5} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={carreras}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 10 }} width={28} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, 'Estudiantes']} />
              <Bar dataKey="num_alumnos" radius={[4, 4, 0, 0]}>
                {carreras.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <motion.div variants={item}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4">Acciones Principales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {acciones.map(({ label, sub, icon: Icon, path, color }) => (
            <motion.button
              key={path}
              variants={item}
              onClick={() => navigate(path)}
              className={`${color} rounded-xl p-4 sm:p-6 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200`}
            >
              <Icon size={22} className="mb-3 opacity-80" strokeWidth={1.5} />
              <p className="text-sm font-black uppercase tracking-wider leading-tight">{label}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">{sub}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4">Directorio</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {directorio.map(({ label, sub, icon: Icon, path, color }) => (
            <motion.button
              key={path}
              variants={item}
              onClick={() => navigate(path)}
              className={`${color} rounded-xl p-4 sm:p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200`}
            >
              <Icon size={18} className="mb-2 opacity-60" strokeWidth={1.5} />
              <p className="text-[11px] font-black uppercase tracking-wider leading-tight">{label}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">{sub}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {!loading && !error && resumen && (
        <motion.div variants={item} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-8 py-4 sm:py-5 bg-emerald-50 border border-emerald-100 rounded-xl">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">
            Sistema operativo — {resumen?.total_estudiantes || 0} estudiantes activos
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SecretariaDashboard;
