import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Download, TrendingUp, TrendingDown,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import useIngresos from '../hooks/useIngresos';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';

const fmt = n => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(n || 0);

const pctFn = (comp, pend) => {
  const t = (comp || 0) + (pend || 0);
  return t > 0 ? ((comp || 0) / t * 100) : 0;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="font-black italic text-teal-400">{fmt(payload[0]?.value)}</p>
    </div>
  );
};

const DIAS_OPTS = [
  { value: 7,  label: '7 días' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
];

const TesoreroIngresosPage = () => {
  const { periodos, loading, error, fetchIngresos, descargarReporte } = useIngresos();
  const [diasReporte, setDiasReporte] = useState(30);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => { fetchIngresos(); }, [fetchIngresos]);

  const handleDescargar = async () => {
    setDescargando(true);
    await descargarReporte(diasReporte);
    setDescargando(false);
  };

  const totalGeneral = periodos.reduce((a, p) => a + (p.ingresos_totales || 0), 0);
  const chartData = periodos.slice(0, 8).map(p => ({
    label: p.codigo || p.nombre?.substring(0, 8),
    monto: p.ingresos_totales || 0,
    activo: p.activo,
  }));
  const maxMonto = Math.max(...chartData.map(d => d.monto), 1);

  if (error) return (
    <div className="p-10 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-center">
      <AlertCircle size={32} className="mx-auto mb-3" />
      <p className="font-black uppercase tracking-widest text-sm">Error al cargar ingresos</p>
    </div>
  );

  return (
    <div className="space-y-7">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
            Ingresos por <span className="text-indigo-600">Período</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Cargando...' : `${periodos.length} períodos · Total ${fmt(totalGeneral)}`}
          </p>
        </div>

        {/* Download control */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {DIAS_OPTS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDiasReporte(value)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all
                  ${diasReporte === value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-slate-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleDescargar}
            disabled={descargando}
            className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-2xl
              font-black uppercase tracking-widest text-[10px]
              hover:bg-teal-700 disabled:opacity-50 transition-all shadow-lg shadow-teal-200"
          >
            {descargando
              ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generando...</>
              : <><Download size={14} />Descargar PDF</>
            }
          </button>
        </div>
      </motion.div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : periodos.length === 0 ? (
        <EmptyState icon={BarChart3} titulo="Sin períodos registrados" />
      ) : (
        <>
          {/* Bar chart visual */}
          {chartData.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-900 rounded-xl p-7"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-5">
                Comparativo por Período
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={24} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v > 0 ? `$${(v / 1000).toFixed(0)}k` : '$0'}
                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 600 }}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20,184,166,0.07)' }} />
                  <Bar dataKey="monto" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.activo ? '#14b8a6' : entry.monto === maxMonto ? '#0d9488' : '#1e3a47'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2.5">
            {periodos.map((p, i) => {
              const tasa = pctFn(p.pagos_completados, p.pagos_pendientes);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-slate-100 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-sm truncate">{p.nombre || p.codigo}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{p.codigo}</p>
                    </div>
                    {p.activo && (
                      <span className="text-[11px] font-black uppercase px-2.5 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl">
                        Activo
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-semibold">
                    <div>
                      <p className="text-slate-400 uppercase">Recaudado</p>
                      <p className="text-indigo-600 font-black text-lg italic">{fmt(p.ingresos_totales)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase">Tasa</p>
                      <p className={`font-black text-lg ${tasa >= 80 ? 'text-indigo-600' : 'text-amber-500'}`}>
                        {tasa.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Desktop table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden sm:block bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm"
          >
            <table className="w-full min-w-[550px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  {['Período', 'Recaudado', 'Pagos', 'Tasa', 'Estado'].map(h => (
                    <th
                      key={h}
                      className={`py-5 px-7 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400
                        ${h === 'Recaudado' || h === 'Tasa' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodos.map((p, i) => {
                  const tasa = pctFn(p.pagos_completados, p.pagos_pendientes);
                  const buena = parseFloat(tasa) >= 80;
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-slate-50 last:border-0 hover:bg-teal-50/20 transition-colors"
                    >
                      <td className="py-4 px-7">
                        <p className="font-black text-slate-900 uppercase text-[13px] tracking-tight leading-none truncate">
                          {p.nombre || p.codigo}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">{p.codigo}</p>
                      </td>
                      <td className="py-4 px-7 text-right">
                        <p className="font-black italic text-indigo-600 text-lg">{fmt(p.ingresos_totales)}</p>
                      </td>
                      <td className="py-4 px-7">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-teal-700">
                            <CheckCircle2 size={9} />{p.pagos_completados || 0} completados
                          </span>
                          {(p.pagos_pendientes || 0) > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase text-amber-600">
                              <Clock size={9} />{p.pagos_pendientes} pendientes
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-7 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {buena
                            ? <TrendingUp size={13} className="text-teal-500" />
                            : <TrendingDown size={13} className="text-amber-500" />
                          }
                          <span className={`font-black text-sm ${buena ? 'text-indigo-600' : 'text-amber-600'}`}>
                            {tasa.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-7">
                        {p.activo ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400">
                            Cerrado
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default TesoreroIngresosPage;
