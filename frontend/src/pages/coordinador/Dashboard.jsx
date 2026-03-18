import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  Users, BookOpen, Calendar, Award,
  FolderKanban, UserCog, GraduationCap, Clock,
  TrendingUp, AlertTriangle, BarChart3, RefreshCw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useCoordinadorDashboard from './hooks/useCoordinadorDashboard';
import StatCard from '../../components/shared/StatCard';
import { SkeletonGrid } from '../../components/shared/Loader';
import DashboardHero from '../../components/DashboardHero';
import { motionVariants, UI } from '../../constants/uiTokens';

const CHART_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];

const CoordinadorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.nombre?.split(' ')[0] || 'Coordinador';
  const { resumen, loading, error, refetch } = useCoordinadorDashboard();
  const carreras = resumen?.estudiantes_por_carrera ?? [];

  const kpis = [
    { label: 'Estudiantes', valor: resumen?.total_estudiantes ?? '—', icon: Users, color: 'indigo', warn: false },
    { label: 'Profesores', valor: resumen?.total_profesores ?? resumen?.profesores ?? '—', icon: UserCog, color: 'green', warn: false },
    { label: 'Secciones', valor: resumen?.total_secciones ?? resumen?.secciones ?? '—', icon: FolderKanban, color: 'purple', warn: false },
    { label: 'Período', valor: resumen?.periodo ?? '—', icon: TrendingUp, color: 'blue', warn: false },
  ];

  const acciones = [
    { label: 'Gestionar Secciones', sub: 'Crear y editar secciones', icon: FolderKanban, path: '/coordinador/secciones', color: 'bg-indigo-600 text-white' },
    { label: 'Inscribir Estudiantes', sub: 'Matricular en secciones', icon: Users, path: '/coordinador/inscripciones', color: 'bg-indigo-600 text-white' },
  ];

  const directorio = [
    { label: 'Ver Carreras', sub: 'Oferta académica', icon: GraduationCap, path: '/coordinador/carreras', color: 'bg-white border border-slate-200 text-slate-900' },
    { label: 'Ver Materias', sub: 'Listado completo', icon: BookOpen, path: '/coordinador/materias', color: 'bg-white border border-slate-200 text-slate-900' },
    { label: 'Ver Horarios', sub: 'Horario de clases', icon: Clock, path: '/coordinador/horarios', color: 'bg-white border border-slate-200 text-slate-900' },
    { label: 'Ver Profesores', sub: 'Rendimiento docente', icon: UserCog, path: '/coordinador/profesores', color: 'bg-white border border-slate-200 text-slate-900' },
    { label: 'Gestionar Becas', sub: 'Asignar becas', icon: Award, path: '/coordinador/becas', color: 'bg-white border border-slate-200 text-slate-900' },
    { label: 'Ver Períodos', sub: 'Ciclos lectivos', icon: Calendar, path: '/coordinador/periodos', color: 'bg-white border border-slate-200 text-slate-900' },
  ];

  if (error) return (
    <div className={UI.errorContainer}>
      <AlertTriangle size={36} className="flex-shrink-0" />
      <div className="flex-1">
        <p className={UI.errorTitle}>Error al cargar datos</p>
        <p className={UI.errorSubtitle}>En móvil la conexión puede ser lenta. Intenta de nuevo.</p>
      </div>
      <button onClick={refetch} className={UI.btnRetry}>
        <RefreshCw size={16} /> Reintentar
      </button>
    </div>
  );

  return (
    <motion.div
      variants={motionVariants.container}
      initial="hidden"
      animate="show"
      className={UI.spaceContainer}
    >
      <motion.div variants={motionVariants.item}>
        <DashboardHero
          badge="Panel Académico"
          greeting={`Hola, ${nombre}`}
          subtitle={`Panel de Coordinación${resumen?.periodo ? ` — ${resumen.periodo}` : ''}`}
        />
      </motion.div>

      <motion.div variants={motionVariants.item}>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map(({ label, valor, icon, color }, i) => (
              <StatCard key={label} title={label} value={valor} icon={icon} color={color} delay={i * 0.05} />
            ))}
          </div>
        )}
      </motion.div>

      {carreras.length > 0 && (
        <motion.div variants={motionVariants.item} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Distribución por Carrera</h2>
            <BarChart3 size={18} className="text-slate-400 flex-shrink-0" strokeWidth={1.5} />
          </div>
          <div className="min-w-0" style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carreras} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, 'Estudiantes']} />
                <Bar dataKey="num_alumnos" radius={[4, 4, 0, 0]}>
                  {carreras.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <motion.div variants={motionVariants.item}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4">Acciones Principales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {acciones.map(({ label, sub, icon: Icon, path, color }) => (
            <motion.button
              key={path}
              variants={motionVariants.item}
              onClick={() => navigate(path)}
              className={`${color} rounded-xl p-6 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200`}
            >
              <Icon size={22} className="mb-3 opacity-80" strokeWidth={1.5} />
              <p className="text-sm font-black uppercase tracking-wider leading-tight">{label}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">{sub}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={motionVariants.item}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4">Gestión Académica</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {directorio.map(({ label, sub, icon: Icon, path, color }) => (
            <motion.button
              key={path}
              variants={motionVariants.item}
              onClick={() => navigate(path)}
              className={`${color} rounded-xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200`}
            >
              <Icon size={18} className="mb-2 opacity-60" strokeWidth={1.5} />
              <p className="text-xs font-black uppercase tracking-wider leading-tight">{label}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{sub}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CoordinadorDashboard;
