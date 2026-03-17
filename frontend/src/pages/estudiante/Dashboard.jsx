import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  GraduationCap, AlertCircle, AlertTriangle, Clock,
  TrendingUp, BookOpen, DollarSign, CheckCircle2,
  ChevronRight, Wifi, ClipboardList
} from 'lucide-react';

const TIPO_LABEL = {
  parcial_1: 'Parcial 1',
  parcial_2: 'Parcial 2',
  talleres: 'Talleres',
  examen_final: 'Examen Final',
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [pagos, setPagos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [resSummary, resPagos] = await Promise.all([
          api.get(`/estudiante/${user.id}/dashboard-summary`),
          api.get(`/estudiante/${user.id}/pagos`),
        ]);
        setSummary(resSummary.data?.data || null);
        setPagos(resPagos.data?.data?.resumen || null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

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
    <div className="p-10 bg-red-50 border border-red-100 rounded-2xl text-red-600 flex items-center gap-6">
      <AlertCircle size={36} />
      <p className="text-[10px] font-black uppercase tracking-widest">Error al cargar tus datos</p>
    </div>
  );

  return (
    <div className="space-y-8 overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Hola, <span className="text-indigo-600">{nombre}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen académico del período activo
        </p>
      </div>

      {/* Alertas activas */}
      {!loading && alertas.length > 0 && (
        <div className="flex flex-col gap-3">
          {alertas.map((a, i) => (
            <button
              key={i}
              onClick={a.action}
              className={`w-full flex items-start sm:items-center justify-between gap-4 px-6 py-4 rounded-2xl text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
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
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, warn }) => (
          <div
            key={label}
            className={`rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border ${
              loading ? 'animate-pulse bg-slate-50 border-slate-100' :
              warn ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
            <p className={`text-3xl sm:text-5xl font-black italic leading-tight ${warn ? 'text-amber-600' : 'text-slate-900'}`}>
              {loading ? '—' : value}
            </p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* Fila central: Evaluaciones pendientes + Widget financiero */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Evaluaciones pendientes (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <ClipboardIcon />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Próximas Evaluaciones</p>
            </div>
            <button
              onClick={() => navigate('/estudiante/evaluaciones')}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              Ver todas <ChevronRight size={13} />
            </button>
          </div>

          <div className="p-8 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic mb-3">Consulta tus evaluaciones</p>
            <button
              onClick={() => navigate('/estudiante/evaluaciones')}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              Ir a Evaluaciones <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Widget financiero + Beca (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Estado financiero rápido */}
          <button
            onClick={() => navigate('/estudiante/pagos')}
            className="flex-1 bg-slate-900 rounded-2xl p-7 text-white shadow-2xl relative overflow-hidden text-left hover:bg-indigo-900 transition-colors group"
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
          </button>

          {/* Beca (si aplica) */}
          {!loading && summary?.porcentaje_beca > 0 && (
            <div className="bg-indigo-600 rounded-2xl p-7 text-white shadow-xl relative overflow-hidden">
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
            </div>
          )}

          {/* Accesos rápidos móvil */}
          {!loading && !summary?.porcentaje_beca && (
            <button
              onClick={() => navigate('/estudiante/materias')}
              className="flex items-center justify-between px-7 py-5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4">
                <BookOpen size={20} className="text-indigo-500" />
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Mis Materias</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ver inscripciones</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Accesos rápidos — solo visible en mobile como shortcuts */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {[
          { label: 'Mis Notas',    icon: TrendingUp,   path: '/estudiante/notas' },
          { label: 'Asistencia',   icon: CheckCircle2, path: '/estudiante/asistencia' },
          { label: 'Pagos',        icon: DollarSign,   path: '/estudiante/pagos' },
          { label: 'Documentos',   icon: BookOpen,     path: '/estudiante/documentos' },
        ].map(({ label, icon: Icon, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex items-center gap-3 px-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Icon size={18} className="text-indigo-500 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">{label}</span>
          </button>
        ))}
      </div>

    </div>
  );
};

// Inline icon helper para no importar extra
const ClipboardIcon = () => (
  <div className="p-2 bg-slate-900 text-white rounded-xl">
    <Clock size={14} />
  </div>
);

export default Dashboard;
