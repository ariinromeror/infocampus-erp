import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import {
  Users, DollarSign, TrendingUp, AlertTriangle, BookOpen,
  RefreshCw, ArrowRight, ChevronRight,
  AlertCircle, BarChart3, GraduationCap, Award,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import useDirectorDashboard from '../hooks/useDirectorDashboard';
import { SkeletonGrid } from '../../../components/shared/Loader';
import StatCard from '../../../components/shared/StatCard';
import DashboardHero from '../../../components/DashboardHero';
import ConfirmModal from '../components/ConfirmModal';
import NotifModal   from '../components/NotifModal';
import FichaEstudianteModal from '../components/FichaEstudianteModal';
import { academicoService } from '../../../services/academicoService';
import { motionVariants, UI } from '../../../constants/uiTokens';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { institucional, finanzas, morosos, loading, error, refetch } = useDirectorDashboard();

  const [confirmCerrar, setConfirmCerrar] = useState(false);
  const [closing,       setClosing]       = useState(false);
  const [notif,         setNotif]         = useState({ open: false, titulo: '', mensaje: '', tipo: 'success' });
  const [fichaOpen,     setFichaOpen]     = useState(false);
  const [fichaDetalle,  setFichaDetalle]  = useState(null);
  const [loadingFicha,  setLoadingFicha]  = useState(false);

  const handleCerrarCiclo = async () => {
    setClosing(true);
    try {
      const r = await academicoService.cerrarCiclo();
      const d = r.data;
      setConfirmCerrar(false);
      setNotif({ open: true, titulo: 'Ciclo Cerrado', mensaje: `${d.message}\n\nAprobados: ${d.estadisticas?.aprobados ?? d.aprobados}\nReprobados: ${d.estadisticas?.reprobados ?? d.reprobados}\nTotal: ${d.estadisticas?.total_procesados ?? d.total_procesados}`, tipo: 'success' });
      refetch();
    } catch (err) {
      setConfirmCerrar(false);
      setNotif({ open: true, titulo: 'Error', mensaje: err.response?.data?.error || err.response?.data?.detail || 'Error desconocido', tipo: 'error' });
    } finally {
      setClosing(false);
    }
  };

  const handleVerMoroso = async (estudiante) => {
    setLoadingFicha(true);
    setFichaOpen(true);
    try {
      const r = await academicoService.getEstudiante(estudiante.id);
      setFichaDetalle(r.data?.data || r.data);
    } catch { setFichaDetalle(estudiante); }
    finally { setLoadingFicha(false); }
  };

  // FIX: usa carrera_id del payload para navegación
  const handleBarClick = (data) => {
    if (!data?.activePayload?.[0]) return;
    const carrera = data.activePayload[0].payload;
    navigate('/director/estudiantes', {
      state: { carreraId: carrera.carrera_id || carrera.id, carreraNombre: carrera.nombre },
    });
  };

  const kpis = [
    {
      label: 'Estudiantes',
      value: loading ? '—' : institucional?.total_estudiantes ?? '—',
      icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50',
      onClick: () => navigate('/director/estudiantes'),
    },
    {
      label: 'En Mora',
      value: loading ? '—' : institucional?.estudiantes_mora ?? morosos.length ?? '—',
      sub: 'Acceso bloqueado',
      icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50',
      onClick: () => navigate('/director/mora'),
    },
    {
      label: 'Secciones',
      value: loading ? '—' : institucional?.total_secciones ?? '—',
      icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50',
      onClick: () => navigate('/director/secciones'),
    },
    {
      label: 'Ingresos',
      value: loading ? '—' : finanzas?.ingreso_real != null
        ? `$${Number(finanzas.ingreso_real).toLocaleString('es-EC', { minimumFractionDigits: 0 })}`
        : '—',
      sub: finanzas?.tasa_cobranza != null ? `Cobranza ${Number(finanzas.tasa_cobranza).toFixed(1)}%` : null,
      icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50',
      onClick: () => navigate('/director/ingresos'),
    },
    // ── 3 KPIs NUEVOS ──────────────────────────────────────────
    {
      label: 'Profesores',
      value: loading ? '—' : institucional?.total_profesores ?? '—',
      icon: GraduationCap, color: 'text-violet-600', bg: 'bg-violet-50',
      onClick: () => navigate('/director/profesores'),
    },
    {
      label: 'Promedio',
      value: loading ? '—' : institucional?.promedio_institucional != null && institucional.promedio_institucional > 0
        ? Number(institucional.promedio_institucional).toFixed(1)
        : institucional?.promedio_institucional === 0 ? 'Sin notas' : '—',
      sub: 'Nota institucional',
      icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50',
      onClick: () => navigate('/director/estadisticas'),
    },
    {
      label: 'Materias',
      value: loading ? '—' : institucional?.total_materias ?? '—',
      icon: Award, color: 'text-cyan-600', bg: 'bg-cyan-50',
      onClick: () => navigate('/director/materias'),
    },
    {
      label: 'Becados',
      value: loading ? '—' : institucional?.estudiantes_becados ?? '—',
      icon: Award, color: 'text-pink-600', bg: 'bg-pink-50',
      onClick: () => navigate('/director/becas'),
    },
  ];

  const carreras = institucional?.estudiantes_por_carrera || [];
  const nombre = user?.nombre?.split(' ')[0] || 'Director';

  const heroActions = (
    <>
      <button
        onClick={() => setConfirmCerrar(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-rose-500/20"
      >
        <AlertCircle size={13} /> Cerrar Ciclo
      </button>
      <button onClick={refetch} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
        <RefreshCw size={15} className="text-white" />
      </button>
    </>
  );

  if (error) return (
    <div className={`${UI.errorContainer}`}>
      <AlertCircle size={36} className="flex-shrink-0" />
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
      className={`${UI.spaceContainer} pb-12`}
    >
      <motion.div variants={motionVariants.item}>
        <DashboardHero
          badge="Panel Institucional"
          greeting={`Hola, ${nombre}`}
          subtitle="Vista global — datos en tiempo real"
          actions={heroActions}
        />
      </motion.div>

      {/* KPI Grid */}
      <motion.div variants={motionVariants.item}>
        {loading ? (
          <SkeletonGrid count={8} />
        ) : (
          <div className={UI.gridKpis}>
            {kpis.map((kpi, i) => (
              <StatCard
                key={kpi.label}
                title={kpi.label}
                value={kpi.value}
                sub={kpi.sub}
                icon={kpi.icon}
                onClick={kpi.onClick}
                warn={kpi.label === 'En Mora'}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Chart + Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={motionVariants.item} className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-black italic uppercase tracking-tighter text-slate-900">Distribución por Carrera</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Clic en barra para filtrar</p>
            </div>
            <BarChart3 size={18} className="text-slate-300" />
          </div>
          {loading ? (
            <div className="h-48 bg-slate-50 rounded-2xl animate-pulse" />
          ) : carreras.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, carreras.length * 48)}>
              <BarChart data={carreras} layout="vertical" onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700 }} tickFormatter={v => v > 0 ? v : ''} />
                <YAxis
                  dataKey="nombre"
                  type="category"
                  tick={{ fontSize: 11, fontWeight: 700 }}
                  width={100}
                  tickFormatter={v => v?.length > 18 ? v.slice(0, 18) + '…' : v}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
                  formatter={(v) => [v, 'Estudiantes']}
                />
                <Bar dataKey="num_alumnos" radius={[0, 6, 6, 0]}>
                  {carreras.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-slate-400">Sin datos</p>
            </div>
          )}
        </motion.div>

        <motion.div variants={motionVariants.item} className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400 px-1">Acceso Rápido</p>
          {[
            { label: 'Estudiantes',   sub: `${institucional?.total_estudiantes || 0} registrados`, path: '/director/estudiantes', color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Estadísticas',  sub: 'Gráficas institucionales', path: '/director/estadisticas', color: 'bg-violet-50 text-violet-600' },
            { label: 'Cobrar',        sub: 'Registrar pagos', path: '/director/cobrar', color: 'bg-teal-50 text-teal-600' },
            { label: 'Reportes',      sub: 'PDFs ejecutivos', path: '/director/reportes', color: 'bg-rose-50 text-rose-600' },
            { label: 'Configuración', sub: 'Reglas del sistema', path: '/director/configuracion', color: 'bg-slate-100 text-slate-600' },
          ].map(({ label, sub, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="w-full flex items-center justify-between px-5 py-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all text-left group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center text-sm font-black`}>
                  {label[0]}
                </div>
                <div>
                  <p className="text-sm font-black italic uppercase tracking-tight text-slate-900">{label}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">{sub}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          ))}
        </motion.div>
      </div>

      {/* Morosos */}
      {morosos.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
            <div>
              <h2 className="text-base font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-500" /> Estudiantes en Mora
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">{morosos.length} estudiantes</p>
            </div>
            <button onClick={() => navigate('/director/mora')} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors">
              Ver todos →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 py-3">Estudiante</th>
                  <th className="text-right text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 py-3 hidden sm:table-cell">Deuda</th>
                  <th className="text-right text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {morosos.slice(0, 6).map((m, i) => (
                  <tr key={m.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 font-black text-sm flex-shrink-0">
                          {(m.nombre_completo || m.nombre)?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 uppercase italic truncate max-w-[160px]">{m.nombre_completo || m.nombre}</p>
                          <p className="text-[10px] text-slate-400">{m.cedula}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right hidden sm:table-cell">
                      <span className="text-sm font-black text-rose-600">${parseFloat(m.deuda_total || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleVerMoroso(m)} className="p-2 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-xl transition-all">
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmCerrar}
        onClose={() => !closing && setConfirmCerrar(false)}
        onConfirm={handleCerrarCiclo}
        loading={closing}
        titulo="Cerrar Ciclo Lectivo"
        mensaje="Esta acción marcará inscripciones como aprobado/reprobado y desactivará el período. Irreversible."
        confirmText="Cerrar Ciclo"
        danger
      />
      <NotifModal isOpen={notif.open} onClose={() => setNotif({ ...notif, open: false })} titulo={notif.titulo} mensaje={notif.mensaje} tipo={notif.tipo} />
      <FichaEstudianteModal
        isOpen={fichaOpen}
        onClose={() => { setFichaOpen(false); setFichaDetalle(null); }}
        detalle={fichaDetalle}
      />
    </motion.div>
  );
};

export default Dashboard;