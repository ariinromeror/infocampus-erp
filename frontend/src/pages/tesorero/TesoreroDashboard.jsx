import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp, AlertTriangle, Users, Percent,
  Search, ArrowRight, RefreshCw, DollarSign,
  ShieldCheck, GraduationCap, Settings, FileText,
  BookOpen,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import useTesoreroDashboard from './hooks/useTesoreroDashboard';
import { SkeletonGrid } from '../../components/shared/Loader';
import DashboardHero from '../../components/DashboardHero';

const fmt = n => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(n || 0);

const MESES = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="font-black italic text-lg text-indigo-400">{fmt(payload[0]?.value)}</p>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-sm transition-all duration-200 ${onClick ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'cursor-default'}`}
  >
    <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
      <Icon size={18} className={color} />
    </div>
    <p className="text-3xl font-black italic tracking-tighter text-slate-900">{value}</p>
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">{label}</p>
    {onClick && <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 mt-2">Ver detalle →</p>}
  </button>
);

const TesoreroDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.nombre?.split(' ')[0] || 'Tesorero';

  const {
    recaudadoTotal, pendienteCobro,
    estudiantesMora, tasaCobranza,
    ingresosMensuales, loading, error, refetch,
  } = useTesoreroDashboard();

  const chartData = ingresosMensuales.length > 0
    ? [...ingresosMensuales]
        .sort((a, b) => a.mes?.localeCompare(b.mes))
        .map(m => ({
          label: m.mes ? MESES[m.mes.split('-')[1]] || m.mes : '—',
          monto: m.monto || 0,
        }))
    : [
        { label: 'Ene', monto: 0 }, { label: 'Feb', monto: 0 },
        { label: 'Mar', monto: 0 }, { label: 'Abr', monto: 0 },
        { label: 'May', monto: 0 }, { label: 'Jun', monto: 0 },
      ];

  const maxMonto = Math.max(...chartData.map(d => d.monto), 1);

  const stats = [
    { label: 'Total Recaudado', value: loading ? '—' : fmt(recaudadoTotal), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', onClick: () => navigate('/tesorero/pagos') },
    { label: 'Pendiente Cobro', value: loading ? '—' : fmt(pendienteCobro), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', onClick: () => navigate('/tesorero/pagos') },
    { label: 'En Mora', value: loading ? '—' : estudiantesMora, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', onClick: () => navigate('/tesorero/mora') },
  ];

  const acciones = [
    { label: 'Buscar Estudiante', sub: 'Cobrar o registrar pago', icon: Search, path: '/tesorero/estudiante', color: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-teal-200' },
    { label: 'Lista de Mora', sub: `${estudiantesMora} pendientes`, icon: AlertTriangle, path: '/tesorero/mora', color: 'bg-white border border-slate-200 text-slate-900 hover:border-teal-300 hover:shadow-md' },
    { label: 'Convenios', sub: 'Gestionar acuerdos', icon: ShieldCheck, path: '/tesorero/convenios', color: 'bg-white border border-slate-200 text-slate-900 hover:border-teal-300 hover:shadow-md' },
    { label: 'Gestión de Becas', sub: 'Administrar becas', icon: GraduationCap, path: '/tesorero/becas', color: 'bg-white border border-slate-200 text-slate-900 hover:border-teal-300 hover:shadow-md' },
    { label: 'Reportes PDF', sub: 'Generar documentos', icon: FileText, path: '/tesorero/reportes', color: 'bg-white border border-slate-200 text-slate-900 hover:border-teal-300 hover:shadow-md' },
    { label: 'Ingresos', sub: 'Por período', icon: BookOpen, path: '/tesorero/ingresos', color: 'bg-white border border-slate-200 text-slate-900 hover:border-teal-300 hover:shadow-md' },
  ];

  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-4">
      <AlertTriangle size={24} />
      <p className="text-sm font-semibold">Error al cargar el dashboard</p>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Header */}
      <DashboardHero
        badge="Panel Financiero"
        greeting={`Hola, ${nombre}`}
        subtitle="Panel del período activo"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, onClick }) => (
          <div key={label} className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <div className={`p-2 ${bg} rounded-xl`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className={`text-4xl font-bold ${color}`}>{value}</p>
            {onClick && !loading && (
              <button onClick={onClick} className="text-xs font-semibold text-indigo-600 mt-2 hover:underline">
                Ver detalle →
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-4">Acciones Rápidas</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {acciones.map(({ label, sub, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 active:scale-95 ${color}`}
            >
              <Icon size={20} className="mb-2 opacity-80" strokeWidth={1.5} />
              <p className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart - 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="lg:col-span-2 bg-slate-900 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Tendencia
              </p>
              <p className="font-black italic uppercase text-white text-xl tracking-tight">
                Ingresos últimos 6 meses
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-teal-500/20 rounded-xl">
              <TrendingUp size={13} className="text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                {fmt(recaudadoTotal)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-48 bg-slate-800 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={28} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v > 0 ? `$${(v / 1000).toFixed(0)}k` : '$0'}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20,184,166,0.08)' }} />
                <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.monto === maxMonto ? '#14b8a6' : '#1e3a47'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Quick actions + cartera - 1 col */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
          className="flex flex-col gap-4"
        >
          {/* Cartera summary */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-5">
              Estado de Cartera
            </p>
            <div className="space-y-4">
              {[
                {
                  label: 'Cobrado',
                  monto: recaudadoTotal,
                  pct: tasaCobranza,
                  color: 'bg-indigo-500',
                  textColor: 'text-indigo-600',
                },
                {
                  label: 'Pendiente',
                  monto: pendienteCobro,
                  pct: Math.max(0, 100 - (tasaCobranza || 0)),
                  color: 'bg-amber-400',
                  textColor: 'text-amber-600',
                },
              ].map(({ label, monto, pct, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {label}
                    </span>
                    <span className={`text-sm font-black italic ${textColor}`}>
                      {fmt(monto)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full ${color}`}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 text-right">
                    {(pct || 0).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Status alert */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`flex items-center gap-4 px-7 py-4 rounded-2xl border ${
                tasaCobranza >= 80
                  ? 'bg-indigo-50 border-teal-100'
                  : 'bg-amber-50 border-amber-100'
              }`}
            >
              {tasaCobranza >= 80
                ? <TrendingUp size={18} className="text-indigo-600 flex-shrink-0" />
                : <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
              }
              <p className={`text-[10px] font-black uppercase tracking-widest ${
                tasaCobranza >= 80 ? 'text-indigo-700' : 'text-amber-700'
              }`}>
                {tasaCobranza >= 80
                  ? `Cartera saludable — ${(tasaCobranza).toFixed(1)}%`
                  : `${estudiantesMora} estudiantes en mora`
                }
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TesoreroDashboard;
