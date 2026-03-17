import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, GraduationCap, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { academicoService } from '../../../services/academicoService';

const COLORS_APR = '#22c55e';
const COLORS_REP = '#f43f5e';

const RendimientoProfesorPage = () => {
  const { id }   = useParams();
  const navigate  = useNavigate();

  const [loading,  setLoading]  = useState(true);
  const [data,     setData]     = useState(null);
  const [periodos, setPeriodos] = useState([]);
  const [periodo,  setPeriodo]  = useState('');

  const load = async (periodoId = '') => {
    setLoading(true);
    try {
      const [resRend, resPer] = await Promise.allSettled([
        academicoService.getRendimientoProfesor(id, periodoId || undefined),
        academicoService.getPeriodos(),
      ]);
      if (resRend.status === 'fulfilled') setData(resRend.value.data?.data || resRend.value.data);
      if (resPer.status  === 'fulfilled') {
        const p = resPer.value.data?.data?.periodos || resPer.value.data?.periodos || [];
        setPeriodos(p);
        if (!periodoId) {
          const activo = p.find(x => x.activo);
          if (activo) setPeriodo(String(activo.id));
        }
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handlePeriodo = (val) => { setPeriodo(val); load(val); };

  const profesor = data?.profesor;
  const secciones = data?.secciones_actuales || [];
  const historial = data?.historial_periodos || [];

  // Datos para gráfica de aprobados vs reprobados por sección
  const chartData = secciones.map(s => ({
    seccion: s.seccion_codigo || s.materia?.slice(0, 10) || '—',
    aprobados: s.estudiantes_aprobados || 0,
    reprobados: s.estudiantes_reprobados || 0,
    promedio: parseFloat(s.promedio_notas || 0),
  }));

  // Datos de historial para gráfica de promedios
  const historialChart = historial.map(h => ({
    periodo: h.periodo?.slice(-6) || '—',
    promedio: parseFloat(h.promedio_general || 0),
    secciones: h.total_secciones || 0,
  })).reverse();

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!data && !loading) return (
    <div className="text-center py-20">
      <p className="text-slate-400 font-bold">Profesor no encontrado</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 text-sm font-black">← Volver</button>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors text-sm font-bold mb-4">
          <ArrowLeft size={16} /> Profesores
        </button>

        {/* Hero */}
        <div className="bg-slate-900 rounded-3xl p-7 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-violet-600/10 rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 mb-1">Rendimiento Docente</p>
                <h1 className="text-2xl font-black italic tracking-tighter">{profesor?.nombre || '—'}</h1>
                <p className="text-slate-400 text-sm mt-0.5">{profesor?.titulo || ''} {profesor?.especialidad ? `· ${profesor.especialidad}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={periodo}
                onChange={e => handlePeriodo(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase focus:outline-none"
              >
                <option value="">Todos los períodos</option>
                {periodos.map(p => <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.nombre}</option>)}
              </select>
              <button onClick={() => load(periodo)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      {secciones.length > 0 && (() => {
        const totalEst  = secciones.reduce((a, s) => a + (s.total_estudiantes || 0), 0);
        const totalApr  = secciones.reduce((a, s) => a + (s.estudiantes_aprobados || 0), 0);
        const totalRep  = secciones.reduce((a, s) => a + (s.estudiantes_reprobados || 0), 0);
        const promedios = secciones.filter(s => s.promedio_notas).map(s => parseFloat(s.promedio_notas));
        const promGlobal = promedios.length ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(1) : '—';
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Secciones',  value: secciones.length, color: 'text-indigo-600',  bg: 'bg-indigo-50' },
              { label: 'Estudiantes',value: totalEst,          color: 'text-violet-600',  bg: 'bg-violet-50' },
              { label: 'Aprobados',  value: totalApr,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Promedio',   value: promGlobal,        color: 'text-amber-600',   bg: 'bg-amber-50' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <p className={`text-3xl font-black italic ${s.color}`}>{s.value}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Gráfica Aprobados vs Reprobados */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 mb-1">Aprobados vs Reprobados</h2>
          <p className="text-[10px] text-slate-400 mb-5">Por sección en el período seleccionado</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="seccion" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10, fontWeight: 700 }}>{v}</span>} />
              <Bar dataKey="aprobados"  name="Aprobados"  fill={COLORS_APR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="reprobados" name="Reprobados" fill={COLORS_REP} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historial por período */}
      {historialChart.length > 1 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 mb-1">Promedio Histórico</h2>
          <p className="text-[10px] text-slate-400 mb-5">Últimos {historialChart.length} períodos</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={historialChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="periodo" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 700 }} formatter={v => [Number(v).toFixed(1), 'Promedio']} />
              <Bar dataKey="promedio" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                {historialChart.map((_, i) => <Cell key={i} fill={`hsl(${250 + i * 10}, 70%, ${55 + i * 3}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista de secciones */}
      {secciones.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50">
            <h2 className="text-sm font-black italic uppercase tracking-tighter text-slate-900">Detalle por Sección</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {secciones.map((s, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{s.materia}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.seccion_codigo} · {s.carrera}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <div>
                    <p className="text-[11px] font-black uppercase text-slate-400">Alumnos</p>
                    <p className="text-sm font-black text-slate-900">{s.total_estudiantes || 0}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-emerald-500">Apr.</p>
                    <p className="text-sm font-black text-emerald-600">{s.estudiantes_aprobados || 0}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase text-rose-500">Rep.</p>
                    <p className="text-sm font-black text-rose-600">{s.estudiantes_reprobados || 0}</p>
                  </div>
                  {s.promedio_notas != null && (
                    <div>
                      <p className="text-[11px] font-black uppercase text-amber-500">Prom.</p>
                      <p className="text-sm font-black text-amber-600">{Number(s.promedio_notas).toFixed(1)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {secciones.length === 0 && !loading && (
        <div className="bg-white border border-slate-100 rounded-2xl py-16 text-center">
          <div className="flex flex-col items-center gap-2 opacity-30">
            <GraduationCap size={36} />
            <p className="text-xs font-black uppercase">Sin secciones en este período</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RendimientoProfesorPage;