import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { motion } from 'framer-motion';
import {
  GraduationCap, AlertCircle, AlertTriangle, Clock,
  TrendingUp, BookOpen, DollarSign, CheckCircle2,
  ChevronRight, RefreshCw,
} from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import StatCard from '../../components/shared/StatCard';
import { SkeletonGrid } from '../../components/shared/Loader';
import { motionVariants, UI } from '../../constants/uiTokens';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [pagos, setPagos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      setLoading(true);
      const [resSummary, resPagos] = await Promise.all([
        api.get(`/estudiante/${user.id}/dashboard-summary`),
        api.get(`/estudiante/${user.id}/pagos`),
      ]);
      setSummary(resSummary.data?.data || null);
      setPagos(resPagos.data?.data?.resumen || null);
    } catch (err) {
      setError(err?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const nombre = user?.nombre?.split(' ')[0] || 'Estudiante';

  // Derivados
  const asistenciaGlobal = summary?.asistencia ?? null;
  const enMora = pagos?.en_mora ?? false;
  const deuda = pagos?.deuda_pendiente ?? 0;
  const vencimiento = pagos?.proximo_vencimiento ?? null;

  // Alertas activas
  const alertas = [];
  if (enMora) alertas.push({ type: 'danger', msg: 'Tienes pagos vencidos. Tu acceso académico puede verse limitado.', action: () => navigate('/estudiante/pagos') });
  if (asistenciaGlobal !== null && asistenciaGlobal < 75) alertas.push({ type: 'warning', msg: `Tu asistencia global es ${parseFloat(asistenciaGlobal).toFixed(1)}%. El mínimo requerido es 75%.`, action: () => navigate('/estudiante/asistencia') });
  alertas.push({ type: 'info', msg: 'Consulta tus evaluaciones upcoming', action: () => navigate('/estudiante/evaluaciones') });

  const kpis = [
    { label: 'Promedio',   value: summary?.promedio ? parseFloat(summary.promedio).toFixed(1) : '—', sub: 'Acumulado',  warn: summary?.promedio && parseFloat(summary.promedio) < 7 },
    { label: 'Asistencia', value: asistenciaGlobal != null ? `${parseFloat(asistenciaGlobal).toFixed(0)}%` : '—', sub: 'Global', warn: asistenciaGlobal !== null && asistenciaGlobal < 75 },
    { label: 'Semestre',   value: summary?.semestre_actual ?? '—', sub: 'Actual',    warn: false },
    { label: 'Créditos',   value: summary?.creditos_aprobados ?? '—', sub: 'Aprobados', warn: false },
  ];

  if (error) return (
    <div className={UI.errorContainer}>
      <AlertTriangle size={36} className="flex-shrink-0" />
      <div className="flex-1">
        <p className={UI.errorTitle}>Error al cargar datos</p>
        <p className={UI.errorSubtitle}>En móvil la conexión puede ser lenta. Intenta de nuevo.</p>
      </div>
      <button onClick={load} className={UI.btnRetry}>
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
          badge="Panel Estudiantil"
          greeting={`Hola, ${nombre}`}
          subtitle="Resumen académico del período activo"
        />
      </motion.div>

      {/* Alertas activas */}
      {!loading && alertas.length > 0 && (
        <motion.div variants={motionVariants.item} className="flex flex-col gap-3">
          {alertas.map((a, i) => (
            <motion.button
              key={i}
              variants={motionVariants.item}
              onClick={a.action}
              className={`w-full flex items-start sm:items-center justify-between gap-4 px-6 py-4 rounded-xl text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${
                a.type === 'danger'  ? 'bg-red-50 border border-red-200 text-red-700' :
                a.type === 'warning'? 'bg-amber-50 border border-amber-200 text-amber-700' :
                                      'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3">
                {a.type === 'danger'  && <AlertCircle   size={18} className="flex-shrink-0 mt-0.5 sm:mt-0" />}
                {a.type === 'warning' && <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 sm:mt-0" />}
                {a.type === 'info'    && <Clock         size={18} className="flex-shrink-0 mt-0.5 sm:mt-0" />}
                <p className="text-[11px] font-black uppercase tracking-wider">{a.msg}</p>
              </div>
              <ChevronRight size={16} className="flex-shrink-0 opacity-60" />
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* KPIs */}
      <motion.div variants={motionVariants.item}>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className={UI.gridKpis}>
            {kpis.map(({ label, value, sub, warn }, i) => (
              <StatCard
                key={label}
                title={label}
                value={value}
                sub={sub}
                icon={label === 'Promedio' ? TrendingUp : label === 'Asistencia' ? CheckCircle2 : label === 'Semestre' ? BookOpen : GraduationCap}
                warn={warn}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Fila central: Evaluaciones pendientes + Widget financiero */}
      <motion.div variants={motionVariants.item} className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Evaluaciones pendientes (3 cols) */}
        <div className={`lg:col-span-3 ${UI.card} overflow-hidden`}>
          <div className="flex items-center justify-between mb-4">
            <p className={UI.sectionTitle}>Próximas Evaluaciones</p>
            <button
              onClick={() => navigate('/estudiante/evaluaciones')}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              Ver todas <ChevronRight size={13} />
            </button>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[11px] font-bold text-slate-500 mb-1">Consulta tus evaluaciones</p>
              <button
                onClick={() => navigate('/estudiante/evaluaciones')}
                className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                Ir a Evaluaciones <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Widget financiero + Beca (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Estado financiero rápido */}
          <motion.button
            variants={motionVariants.item}
            onClick={() => navigate('/estudiante/pagos')}
            className="flex-1 bg-slate-900 rounded-xl p-6 sm:p-7 text-white shadow-sm relative overflow-hidden text-left hover:bg-indigo-900 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 group"
          >
            <DollarSign className="absolute right-[-16px] top-[-16px] size-36 opacity-10 -rotate-12" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-4">
                Estado Financiero
              </p>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
                  <div className="h-4 w-20 bg-white/10 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  <p className={`text-4xl sm:text-5xl font-black italic leading-none truncate ${deuda > 0 ? 'text-red-400' : 'text-white'}`}>
                    {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(deuda)}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mt-2">
                    {deuda > 0 ? 'Pendiente de pago' : 'Al día — sin deuda'}
                  </p>
                  {vencimiento && deuda > 0 && (
                    <p className="text-[10px] font-black text-amber-400 uppercase mt-1">
                      Vence: {vencimiento}
                    </p>
                  )}
                </>
              )}
              <ChevronRight size={16} className="mt-4 opacity-40 group-hover:opacity-80 transition-opacity" />
            </div>
          </motion.button>

          {/* Beca (si aplica) */}
          {!loading && summary?.porcentaje_beca > 0 && (
            <motion.div variants={motionVariants.item} className="bg-indigo-600 rounded-xl p-6 sm:p-7 text-white shadow-sm relative overflow-hidden">
              <GraduationCap className="absolute right-[-16px] top-[-16px] size-36 opacity-10 -rotate-12" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200 mb-3">
                  Beca Activa
                </p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl sm:text-5xl font-black italic">{summary.porcentaje_beca}%</span>
                  <span className="text-[10px] font-black uppercase text-indigo-300 pb-1 leading-tight">
                    Beca<br/>Institucional
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Accesos rápidos móvil */}
          {!loading && !summary?.porcentaje_beca && (
            <motion.button
              variants={motionVariants.item}
              onClick={() => navigate('/estudiante/materias')}
              className={`${UI.card} flex items-center justify-between text-left hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 group`}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black uppercase tracking-wider text-slate-900">Mis Materias</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">Ver inscripciones</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Accesos rápidos — solo visible en mobile como shortcuts */}
      <motion.div variants={motionVariants.item} className="sm:hidden">
        <p className={UI.sectionTitle}>Accesos Rápidos</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { label: 'Mis Notas',    sub: 'Ver calificaciones', icon: TrendingUp,   path: '/estudiante/notas' },
            { label: 'Asistencia',   sub: 'Ver registro',      icon: CheckCircle2, path: '/estudiante/asistencia' },
            { label: 'Pagos',        sub: 'Estado financiero', icon: DollarSign,   path: '/estudiante/pagos' },
            { label: 'Documentos',  sub: 'Descargar',         icon: BookOpen,     path: '/estudiante/documentos' },
          ].map(({ label, sub, icon: Icon, path }) => (
            <motion.button
              key={path}
              variants={motionVariants.item}
              onClick={() => navigate(path)}
              className={`${UI.card} flex items-center gap-3 text-left hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200`}
            >
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-indigo-600" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-900 leading-tight">{label}</p>
                <p className="text-[10px] font-medium text-slate-500 truncate">{sub}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
};

export default Dashboard;
