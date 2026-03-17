import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { academicoService } from '../../../services/academicoService';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981'];

const Skeleton = () => (
  <div className="h-52 bg-slate-50 rounded-2xl animate-pulse" />
);

const Card = ({ title, sub, children, loading, className = '' }) => (
  <div className={`bg-white border border-slate-100 rounded-2xl p-5 shadow-sm ${className}`}>
    <div className="mb-4">
      <h2 className="text-sm font-black italic uppercase tracking-tighter text-slate-900">{title}</h2>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
    {loading ? <Skeleton /> : children}
  </div>
);

const EstadisticasPage = () => {
  const [loading,       setLoading]       = useState(true);
  const [institucional, setInstitucional] = useState(null);
  const [finanzas,      setFinanzas]      = useState(null);
  const [ingresos,      setIngresos]      = useState([]);
  const [periodos,      setPeriodos]      = useState([]);
  const [periodosStats, setPeriodosStats] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [resInst, resFin, resIng, resPer] = await Promise.allSettled([
        academicoService.getStatsInstitucional(),
        academicoService.getStatsFinanzas(),
        academicoService.getTesoreroIngresos(),
        academicoService.getPeriodos(),
      ]);
      if (resInst.status === 'fulfilled') setInstitucional(resInst.value.data?.data || resInst.value.data);
      if (resFin.status  === 'fulfilled') setFinanzas(resFin.value.data?.data || resFin.value.data);
      if (resIng.status  === 'fulfilled') {
        const raw = resIng.value.data?.data || resIng.value.data || [];
        setIngresos(Array.isArray(raw) ? raw : raw?.periodos || []);
      }
      if (resPer.status  === 'fulfilled') {
        const raw = resPer.value.data?.data?.periodos || resPer.value.data?.periodos || [];
        const periodosFinal = raw.slice(0, 6).reverse();
        setPeriodos(periodosFinal);
        const statsResults = await Promise.all(
          periodosFinal.map(p =>
            academicoService.getPeriodoEstadisticas(p.id)
              .then(r => ({ id: p.id, stats: r.data?.data || r.data || {} }))
              .catch(() => ({ id: p.id, stats: {} }))
          )
        );
        setPeriodosStats(Object.fromEntries(statsResults.map(r => [r.id, r.stats])));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Datos para gráfica de carreras
  const carrerasData = (institucional?.estudiantes_por_carrera || []).map(c => ({
    nombre: c.nombre?.length > 20 ? c.nombre.slice(0, 20) + '…' : c.nombre,
    alumnos: c.num_alumnos || 0,
  }));

  // Ingresos por período
  const ingresosData = ingresos.slice(0, 8).map(p => ({
    periodo: p.periodo_codigo || p.codigo || p.nombre?.slice(-6) || '—',
        ingreso: parseFloat(p.ingreso_real ?? p.monto_real ?? p.total_pagado ?? p.monto_total ?? p.ingreso ?? 0),
  })).reverse();

  // KPIs globales para pie chart
  const distribucion = [
    { name: 'Sin mora',  value: (institucional?.total_estudiantes || 0) - (institucional?.estudiantes_mora || 0) },
    { name: 'En Mora',   value: institucional?.estudiantes_mora || 0 },
    { name: 'Becados',   value: institucional?.estudiantes_becados || 0 },
  ].filter(d => d.value > 0);

  // Stats KPI cards
  const stats = [
    { label: 'Total Estudiantes', value: institucional?.total_estudiantes ?? '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Profesores',  value: institucional?.total_profesores  ?? '—', color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Promedio Inst.',    value: institucional?.promedio_institucional != null && institucional.promedio_institucional > 0 ? Number(institucional.promedio_institucional).toFixed(1) : institucional?.promedio_institucional === 0 ? 'Sin notas' : '—', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Cobranza %',        value: finanzas?.tasa_cobranza != null ? `${Number(finanzas.tasa_cobranza).toFixed(1)}%` : '—', color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-7 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
            Estadísticas
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
            Análisis institucional en tiempo real
          </p>
        </div>
        <button onClick={loadData} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-indigo-600">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className={`${loading ? 'animate-pulse' : ''} bg-white border border-slate-100 rounded-2xl p-5 shadow-sm`}>
            <p className={`text-2xl font-black italic truncate ${s.color}`}>{loading ? '—' : s.value}</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Ingresos + Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Ingresos por Período" sub="Histórico de recaudación" loading={loading} className="lg:col-span-2">
          {ingresosData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ingresosData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11, fontWeight: 700 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
                  formatter={v => [`$${Number(v).toLocaleString('es-EC')}`, 'Ingresos']}
                />
                <Line type="monotone" dataKey="ingreso" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
          )}
        </Card>

        <Card title="Estado Financiero" sub="Distribución de estudiantes" loading={loading}>
          {distribucion.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distribucion}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  paddingAngle={3}
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {distribucion.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 700 }} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10, fontWeight: 700 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
          )}
        </Card>
      </div>

      {/* Row 2: Carreras */}
      <Card title="Estudiantes por Carrera" sub="Distribución actual" loading={loading}>
        {carrerasData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(280, carrerasData.length * 52)}>
            <BarChart data={carrerasData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fontWeight: 700 }} width={100} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }}
                formatter={v => [v, 'Estudiantes']}
              />
              <Bar dataKey="alumnos" radius={[0, 6, 6, 0]}>
                {carrerasData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
        )}
      </Card>

      {/* Row 3: Resumen de períodos */}
      {periodos.length > 0 && (
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Períodos Lectivos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {periodos.map(p => (
              <div key={p.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${p.activo ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-black italic uppercase text-slate-900">{p.nombre}</p>
                  {p.activo && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-lg text-[11px] font-black uppercase">Activo</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{p.codigo}</p>
                <div className="flex gap-3 mt-3 text-[10px] text-slate-500">
                  <span>{p.fecha_inicio?.slice(0, 7) || '—'}</span>
                  <span>→</span>
                  <span>{p.fecha_fin?.slice(0, 7) || '—'}</span>
                </div>
                {periodosStats[p.id] && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-black uppercase">
                      {periodosStats[p.id]?.inscritos ?? 0} inscritos
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-black uppercase">
                      {periodosStats[p.id]?.aprobados ?? 0} aprobados
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-black uppercase">
                      {periodosStats[p.id]?.promedio > 0
                        ? `Avg ${Number(periodosStats[p.id].promedio).toFixed(1)}`
                        : 'Sin notas'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstadisticasPage;