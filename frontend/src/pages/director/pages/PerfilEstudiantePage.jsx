import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, DollarSign, BookOpen, FileDown, Award,
  AlertTriangle, CheckCircle, Loader2, GraduationCap,
  TrendingUp, Calendar, CreditCard, Shield,
} from 'lucide-react';
import { academicoService } from '../../../services/academicoService';
import NotifModal from '../components/NotifModal';

const Tab = ({ label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`px-5 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all border-b-2 flex items-center gap-2 ${
      active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'
    }`}
  >
    {label}
    {badge > 0 && (
      <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {badge}
      </span>
    )}
  </button>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-sm font-bold text-slate-900 mt-0.5">{value || '—'}</p>
  </div>
);

const EstadoChip = ({ estado, nota }) => {
  if (estado === 'aprobado' || (nota !== null && nota >= 7))
    return <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">{nota !== null ? nota.toFixed(1) : 'Aprobado'}</span>;
  if (estado === 'reprobado' || (nota !== null && nota < 7))
    return <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 flex-shrink-0">{nota !== null ? nota.toFixed(1) : 'Reprobado'}</span>;
  return <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">Activa</span>;
};

const PerfilEstudiantePage = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [tab,     setTab]     = useState('academico');
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState(null);  // de getEstudiante
  const [cuenta,  setCuenta]  = useState(null);  // de getEstadoCuenta
  const [notif,   setNotif]   = useState({ open: false, titulo: '', mensaje: '', tipo: 'error' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [resEst, resCuenta] = await Promise.allSettled([
          academicoService.getEstudiante(id),
          academicoService.getEstadoCuenta(id),
        ]);
        if (resEst.status    === 'fulfilled') setData(resEst.value.data?.data || resEst.value.data);
        if (resCuenta.status === 'fulfilled') setCuenta(resCuenta.value.data?.data || resCuenta.value.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    if (id) load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-20">
      <p className="text-slate-400 font-bold">Estudiante no encontrado</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 text-sm font-black">← Volver</button>
    </div>
  );

  // ── NORMALIZACIÓN DE CAMPOS ─────────────────────────────────────────────────
  // getEstudiante devuelve: nombre_completo, carrera_detalle:{nombre}, es_becado,
  //   porcentaje_beca, convenio_activo, deuda_total, inscripciones[]
  // getEstadoCuenta devuelve: en_mora, semestre_actual (desde usuarios), creditos_aprobados,
  //   promedio_acumulado, tipo_beca, pagos[], inscripciones[]
  const nombre        = data.nombre_completo || data.nombre || '—';
  const carreraNombre = data.carrera_detalle?.nombre || data.carrera_nombre || data.carrera?.nombre || '—';
  const esBecado      = data.es_becado || cuenta?.es_becado || false;
  const tipoBeca      = data.tipo_beca || cuenta?.tipo_beca || '—';
  const pctBeca       = data.porcentaje_beca || cuenta?.porcentaje_beca || 0;
  const enMora        = cuenta?.en_mora || data.en_mora || false;
  const deuda         = parseFloat(data.deuda_total || cuenta?.deuda_total || 0);
  const semestre      = data.semestre_actual || cuenta?.semestre_actual || null;
  const creditos      = data.creditos_aprobados ?? cuenta?.creditos_aprobados ?? null;
  const promedio      = data.promedio_acumulado ?? cuenta?.promedio_acumulado ?? null;
  const convenio      = data.convenio_activo || cuenta?.convenio_activo || false;
  const fechaConvenio = data.fecha_limite_convenio || cuenta?.fecha_limite_convenio || null;

  // Inscripciones: usar las de getEstudiante (más completas) con fallback a estado-cuenta
  const todasInscripciones = (() => {
    const lista = data.inscripciones?.length ? data.inscripciones : (cuenta?.inscripciones || []);
    return lista;
  })();

  const inscActivas  = todasInscripciones.filter(i => i.estado === 'activo' || i.estado === 'inscrito');
  const inscHistorial = todasInscripciones.filter(i => i.estado === 'aprobado' || i.estado === 'reprobado');

  // Pagos: solo en estado-cuenta
  const pagos = cuenta?.pagos || data.pagos || [];

  // Agrupación de historial por período
  const historialPorPeriodo = inscHistorial.reduce((acc, ins) => {
    const periodo = ins.periodo || ins.periodo_nombre || 'Sin período';
    if (!acc[periodo]) acc[periodo] = [];
    acc[periodo].push(ins);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors text-sm font-bold mb-4">
          <ArrowLeft size={16} /> Estudiantes
        </button>

        {/* Hero */}
        <div className="bg-slate-900 rounded-3xl p-7 text-white relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-indigo-600/10 rounded-full pointer-events-none" />
          <div className="absolute right-20 bottom-0 w-24 h-24 bg-indigo-500/5 rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0 shadow-lg shadow-indigo-900/40">
                {nombre[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter leading-tight">{nombre}</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  {data.cedula || data.username} · {data.email}
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5 uppercase tracking-wide font-bold">{carreraNombre}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {enMora ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/20 text-rose-300 rounded-lg text-[10px] font-black uppercase">
                      <AlertTriangle size={10} /> En Mora
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-black uppercase">
                      <CheckCircle size={10} /> Al Día
                    </span>
                  )}
                  {esBecado && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-lg text-[10px] font-black uppercase">
                      <Award size={10} /> Beca {pctBeca}%
                    </span>
                  )}
                  {convenio && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-500/20 text-violet-300 rounded-lg text-[10px] font-black uppercase">
                      <Shield size={10} /> Convenio
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Acciones PDF */}
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <button
                onClick={() => academicoService.getReporteNotas && academicoService.getReporteNotas(id).catch(() => {})}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors"
              >
                <FileDown size={13} /> Boletín
              </button>
              <button
                onClick={() => academicoService.getEstadoCuenta && academicoService.getEstadoCuenta(id).catch(() => {})}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors"
              >
                <FileDown size={13} /> Estado Cta.
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Semestre',  value: semestre ? `${semestre}°` : '—',                          color: 'text-indigo-600',  bg: 'bg-indigo-50',  icon: GraduationCap },
          { label: 'Créditos',  value: creditos ?? '—',                                           color: 'text-violet-600',  bg: 'bg-violet-50',  icon: Award },
          { label: 'Promedio',  value: promedio ? Number(promedio).toFixed(1) : '—',              color: 'text-amber-600',   bg: 'bg-amber-50',   icon: TrendingUp },
          { label: 'Deuda',     value: `$${deuda.toFixed(2)}`,                                    color: deuda > 0 ? 'text-rose-600' : 'text-emerald-600', bg: deuda > 0 ? 'bg-rose-50' : 'bg-emerald-50', icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-2xl font-black italic ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          <Tab label="Académico"  active={tab === 'academico'}  onClick={() => setTab('academico')}  badge={inscActivas.length} />
          <Tab label="Historial"  active={tab === 'historial'}  onClick={() => setTab('historial')}  badge={inscHistorial.length} />
          <Tab label="Financiero" active={tab === 'financiero'} onClick={() => setTab('financiero')} badge={pagos.length} />
          <Tab label="Perfil"     active={tab === 'perfil'}     onClick={() => setTab('perfil')} />
        </div>

        <div className="p-6">

          {/* ── ACADÉMICO: materias activas del período en curso ── */}
          {tab === 'academico' && (
            <div className="space-y-4">
              {inscActivas.length > 0 ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Materias en Curso — {inscActivas.length} materia{inscActivas.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    {inscActivas.map((ins, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-indigo-50/40 border border-indigo-100/60 rounded-xl">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {ins.materia_nombre || ins.materia?.nombre || ins.materia}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Calendar size={10} className="text-slate-400" />
                            <p className="text-[10px] text-slate-400">{ins.periodo || ins.periodo_nombre || '—'}</p>
                            {ins.seccion && <span className="text-[10px] text-slate-500">· Secc. {ins.seccion}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg flex-shrink-0">
                          Activa
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center opacity-40">
                  <BookOpen size={36} className="mx-auto mb-2" />
                  <p className="text-xs font-black uppercase italic">Sin materias activas en el período actual</p>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORIAL: todas las materias cursadas agrupadas por período ── */}
          {tab === 'historial' && (
            <div className="space-y-5">
              {Object.keys(historialPorPeriodo).length > 0 ? (
                Object.entries(historialPorPeriodo).map(([periodo, inscrs]) => {
                  const promPeriodo = inscrs.filter(i => i.nota_final != null)
                    .reduce((sum, i, _, arr) => sum + parseFloat(i.nota_final) / arr.length, 0);
                  const aprobados  = inscrs.filter(i => i.estado === 'aprobado' || (i.nota_final >= 7)).length;
                  return (
                    <div key={periodo}>
                      {/* Header de período */}
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-indigo-500" />
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">{periodo}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400">
                            {aprobados}/{inscrs.length} aprobadas
                          </span>
                          {promPeriodo > 0 && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${promPeriodo >= 7 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              Prom. {promPeriodo.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {inscrs.map((ins, i) => {
                          const nota = ins.nota_final != null ? parseFloat(ins.nota_final) : null;
                          return (
                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                              <div className="flex-1 min-w-0 mr-3">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {ins.materia_nombre || ins.materia?.nombre || ins.materia}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {ins.seccion && <span className="text-[10px] text-slate-400">Secc. {ins.seccion}</span>}
                                  {ins.materia_codigo && <span className="text-[10px] text-slate-500">{ins.materia_codigo}</span>}
                                  {ins.pagado === false && (
                                    <span className="text-[11px] text-rose-500 font-bold">Sin pago</span>
                                  )}
                                </div>
                              </div>
                              <EstadoChip estado={ins.estado} nota={nota} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center opacity-40">
                  <GraduationCap size={36} className="mx-auto mb-2" />
                  <p className="text-xs font-black uppercase italic">Sin historial académico registrado</p>
                </div>
              )}
            </div>
          )}

          {/* ── FINANCIERO: deuda + todos los pagos ── */}
          {tab === 'financiero' && (
            <div className="space-y-5">
              {/* Resumen deuda */}
              <div className={`p-5 rounded-2xl ${deuda > 0 ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Deuda Total</p>
                <p className={`text-4xl font-black italic ${deuda > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${deuda.toFixed(2)}
                </p>
                {cuenta?.deuda_vencida > 0 && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1">
                    ${parseFloat(cuenta.deuda_vencida).toFixed(2)} vencida
                  </p>
                )}
              </div>

              {/* Beca activa */}
              {esBecado && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                  <Award size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black uppercase text-amber-700">Beca Activa — {pctBeca}%</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">{tipoBeca}</p>
                  </div>
                </div>
              )}

              {/* Convenio */}
              {convenio && (
                <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl flex items-start gap-3">
                  <Shield size={16} className="text-violet-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black uppercase text-violet-700">Convenio de Pago Activo</p>
                    {fechaConvenio && (
                      <p className="text-[10px] text-violet-600 mt-0.5">
                        Vence: {fechaConvenio.toString().slice(0, 10)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Lista completa de pagos */}
              {pagos.length > 0 ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                    Todos los Pagos ({pagos.length})
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {pagos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.estado === 'completado' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            <CreditCard size={13} className={p.estado === 'completado' ? 'text-emerald-600' : 'text-amber-600'} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{p.concepto || 'Pago'}</p>
                            <p className="text-[10px] text-slate-400">
                              {p.fecha_pago?.toString().slice(0, 10) || '—'} · {p.metodo_pago || '—'}
                              {p.referencia && ` · Ref: ${p.referencia}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className={`text-sm font-black ${p.estado === 'completado' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            ${parseFloat(p.monto || 0).toFixed(2)}
                          </p>
                          <p className={`text-[11px] font-bold uppercase ${p.estado === 'completado' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {p.estado}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center opacity-40">
                  <DollarSign size={32} className="mx-auto mb-2" />
                  <p className="text-xs font-black uppercase italic">Sin registros de pago</p>
                </div>
              )}
            </div>
          )}

          {/* ── PERFIL: datos personales ── */}
          {tab === 'perfil' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label="Nombre Completo" value={nombre} />
              <InfoRow label="Cédula"          value={data.cedula || data.username} />
              <InfoRow label="Email"           value={data.email} />
              <InfoRow label="Carrera"         value={carreraNombre} />
              <InfoRow label="Semestre"        value={semestre ? `${semestre}°` : '—'} />
              <InfoRow label="Créditos Aprobados" value={creditos} />
              <InfoRow label="Promedio Acumulado" value={promedio ? Number(promedio).toFixed(2) : '—'} />
              <InfoRow label="Estado"          value={enMora ? 'En Mora' : 'Al Día'} />
              {esBecado && (
                <>
                  <InfoRow label="Tipo de Beca" value={tipoBeca} />
                  <InfoRow label="% Beca"       value={`${pctBeca}%`} />
                </>
              )}
              {convenio && (
                <InfoRow label="Convenio de Pago" value={fechaConvenio ? `Activo hasta ${fechaConvenio.toString().slice(0, 10)}` : 'Activo'} />
              )}
            </div>
          )}

        </div>
      </div>

      <NotifModal
        isOpen={notif.open}
        onClose={() => setNotif({ ...notif, open: false })}
        titulo={notif.titulo}
        mensaje={notif.mensaje}
        tipo={notif.tipo}
      />
    </div>
  );
};

export default PerfilEstudiantePage;