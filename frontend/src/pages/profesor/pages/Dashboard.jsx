import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, BookOpen, Users, TrendingUp, MapPin, Clock, RefreshCw,
} from 'lucide-react';
import useProfesorDashboard from '../hooks/useProfesorDashboard';
import { useAuth } from '../../../context/AuthContext';
import DashboardHero from '../../../components/DashboardHero';
import StatCard from '../../../components/shared/StatCard';
import { SkeletonGrid } from '../../../components/shared/Loader';
import { motionVariants, UI } from '../../../constants/uiTokens';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useProfesorDashboard();
  const nombre = user?.nombre?.split(' ')[0] || 'Profesor';

  const stats = [
    { label: 'Secciones activas', value: loading ? '—' : data?.stats?.secciones_activas ?? '—', icon: BookOpen, sub: 'Asignadas', warn: false },
    { label: 'Total alumnos', value: loading ? '—' : data?.stats?.total_alumnos ?? '—', icon: Users, sub: 'Inscritos', warn: false },
    { label: 'Promedio general', value: loading ? '—' : data?.stats?.rendimiento_promedio != null ? parseFloat(data.stats.rendimiento_promedio).toFixed(1) : '—', icon: TrendingUp, sub: 'Rendimiento', warn: data?.stats?.rendimiento_promedio != null && parseFloat(data.stats.rendimiento_promedio) < 7 },
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
          badge="Panel Docente"
          greeting={`Hola, ${nombre}`}
          subtitle="Panel del período activo"
        />
      </motion.div>

      <motion.div variants={motionVariants.item}>
        {loading ? (
          <SkeletonGrid count={3} />
        ) : (
          <div className={UI.gridKpis}>
            {stats.map(({ label, value, icon, sub, warn }, i) => (
              <StatCard
                key={label}
                title={label}
                value={value}
                sub={sub}
                icon={icon}
                warn={warn}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </motion.div>

      {!loading && data?.mis_clases?.length > 0 && (
        <motion.div variants={motionVariants.item} className="space-y-3">
          <p className={UI.sectionTitle}>Mis Clases</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {data.mis_clases.map((clase, i) => (
              <motion.button
                key={i}
                variants={motionVariants.item}
                onClick={() => navigate(`/profesor/secciones/${clase.id || clase.seccion_id}`)}
                className={`${UI.card} text-left hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">{clase.codigo || clase.materia_codigo}</p>
                    <p className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">{clase.materia}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
                    {clase.periodo}
                  </span>
                </div>
                <div className="space-y-1.5 mb-4">
                  {clase.aula && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{clase.aula}</span>
                    </div>
                  )}
                  {clase.horario && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{clase.horario}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Alumnos inscritos</span>
                  <span className="text-base font-black text-slate-900">
                    {clase.alumnos_inscritos ?? clase.inscritos ?? '—'}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {!loading && !data?.mis_clases?.length && !error && (
        <motion.div variants={motionVariants.item} className={`${UI.card} p-12 text-center`}>
          <p className="text-slate-400 text-sm">Sin datos disponibles</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;
