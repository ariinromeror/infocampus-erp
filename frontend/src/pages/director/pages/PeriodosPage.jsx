import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, X, Loader2, BarChart3, AlertTriangle } from 'lucide-react';
import usePeriodos from '../hooks/usePeriodos';
import NotifModal from '../components/NotifModal';

const StatsModal = ({ isOpen, onClose, periodo, stats }) => {
  if (!isOpen) return null;
  const s = stats || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 rounded-lg"><X size={16} /></button>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estadísticas</p>
        <h3 className="text-base font-black italic uppercase text-slate-900 mb-5">{periodo?.nombre}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Inscritos',  value: s.inscritos  ?? 0, color: 'text-slate-800',   bg: 'bg-slate-50' },
            { label: 'Promedio',   value: typeof s.promedio === 'number' ? s.promedio.toFixed(2) : '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Aprobados',  value: s.aprobados  ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Reprobados', value: s.reprobados ?? 0, color: 'text-rose-600',    bg: 'bg-rose-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
          {((s.aprobados ?? 0) + (s.reprobados ?? 0) === 0) && (
            <p className="col-span-2 text-[11px] text-slate-400 text-center italic mt-1">
              Aprobados y reprobados se calculan al cerrar el ciclo
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const PeriodosPage = () => {
  const { periodos: rawPeriodos, periodoActivo, loading, crearPeriodo, cerrarCiclo, getEstadisticas } = usePeriodos();
  // Normalizar — el backend puede devolver array directo o {periodos:[]}
  const periodos = Array.isArray(rawPeriodos)
    ? rawPeriodos
    : (rawPeriodos?.periodos || rawPeriodos?.data || []);

  const [modalCrear,   setModalCrear]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState({ nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '' });
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [closing,      setClosing]      = useState(false);
  const [previewStats, setPreviewStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [notif,        setNotif]        = useState({ open: false, titulo: '', mensaje: '', tipo: 'success' });
  const [statsModal,   setStatsModal]   = useState(null);

  const handleCrear = async () => {
    if (!form.nombre || !form.codigo) return;
    setSaving(true);
    try {
      await crearPeriodo(form);
      setModalCrear(false);
      setForm({ nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '' });
    } catch (e) {
      setNotif({ open: true, titulo: 'Error', mensaje: e.response?.data?.detail || 'No se pudo crear el período', tipo: 'error' });
    } finally { setSaving(false); }
  };

  const handleCerrarIntent = async () => {
    if (!periodoActivo) return;
    setLoadingStats(true);
    try {
      const s = await getEstadisticas(periodoActivo.id);
      setPreviewStats(s);
    } catch { setPreviewStats(null); }
    finally { setLoadingStats(false); setConfirmOpen(true); }
  };

  const handleCerrarConfirm = async () => {
    setClosing(true);
    try {
      const r = await cerrarCiclo();
      const d = r.data;
      setConfirmOpen(false);
      setPreviewStats(null);
      setNotif({ open: true, titulo: 'Ciclo Cerrado', mensaje: `${d.message || 'Listo.'}\n\nAprobados: ${d.aprobados || 0}\nReprobados: ${d.reprobados || 0}`, tipo: 'success' });
    } catch (err) {
      setConfirmOpen(false);
      setNotif({ open: true, titulo: 'Error', mensaje: err.response?.data?.error || err.message, tipo: 'error' });
    } finally { setClosing(false); }
  };

  const handleVerStats = async (periodo) => {
    try { setStatsModal({ periodo, stats: await getEstadisticas(periodo.id) }); }
    catch { setStatsModal({ periodo, stats: {} }); }
  };

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="space-y-7">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
              Períodos
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
              {loading ? 'Cargando...' : `${periodos.length} períodos registrados`}
            </p>
          </div>
          <button onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors flex-shrink-0">
            <Plus size={16} /> Nuevo Período
          </button>
        </div>
      </motion.div>

      {/* Banner período activo */}
      {periodoActivo && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-indigo-950 text-white rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Período Activo</p>
              <p className="text-base font-black italic uppercase">{periodoActivo.nombre} · {periodoActivo.codigo}</p>
            </div>
          </div>
          <button onClick={handleCerrarIntent} disabled={loadingStats}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors disabled:opacity-50">
            {loadingStats ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            Cerrar Ciclo
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-white border border-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : periodos.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl py-20 text-center">
          <div className="flex flex-col items-center gap-3 opacity-30">
            <Calendar size={40} />
            <p className="text-sm font-black uppercase italic">Sin períodos registrados</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodos.map(p => {
            const activo = periodoActivo?.id === p.id;
            const inicio = p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-EC') : '—';
            const fin    = p.fecha_fin    ? new Date(p.fecha_fin).toLocaleDateString('es-EC')    : '—';
            return (
              <div key={p.id} className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${activo ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-black italic uppercase tracking-tighter text-slate-900 truncate">{p.nombre}</p>
                    <p className="text-[10px] font-bold text-indigo-500 mt-0.5 truncate">{p.codigo}</p>
                  </div>
                  {activo && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase rounded-lg border border-indigo-100">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" /> Activo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mb-4">{inicio} → {fin}</p>
                <button onClick={() => handleVerStats(p)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors">
                  <BarChart3 size={12} /> Ver Estadísticas
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !saving && setModalCrear(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900">Nuevo Período</h3>
              <button onClick={() => !saving && setModalCrear(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Primer Semestre 2025" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Código</label>
                <input type="text" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ej: 2025-1" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Fecha Inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Fecha Fin</label>
                  <input type="date" value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => !saving && setModalCrear(false)} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleCrear} disabled={saving || !form.nombre || !form.codigo} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" />Creando...</> : 'Crear Período'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirm cerrar con preview */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !closing && setConfirmOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-8"
          >
            <button onClick={() => !closing && setConfirmOpen(false)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 rounded-xl" disabled={closing}><X size={16} /></button>
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={26} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-black italic uppercase text-center text-slate-900 mb-1">Cerrar Ciclo Lectivo</h3>
            <p className="text-xs text-slate-400 text-center mb-4">Período: <strong className="text-slate-700">{periodoActivo?.nombre}</strong></p>
            {previewStats && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Inscritos',  value: previewStats.inscritos  ?? 0, color: 'text-slate-800',   bg: 'bg-slate-50' },
                  { label: 'Promedio',   value: typeof previewStats.promedio === 'number' ? previewStats.promedio.toFixed(2) : '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Aprobados',  value: previewStats.aprobados  ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Reprobados', value: previewStats.reprobados ?? 0, color: 'text-rose-600',    bg: 'bg-rose-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-slate-500 text-center mb-6">Esta acción es <span className="font-black text-rose-600">irreversible</span>. Se procesarán todas las inscripciones.</p>
            <div className="flex gap-3">
              <button onClick={() => !closing && setConfirmOpen(false)} disabled={closing} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Cancelar</button>
              <button onClick={handleCerrarConfirm} disabled={closing} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {closing ? <><Loader2 size={14} className="animate-spin" />Procesando...</> : 'Cerrar Ciclo'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <StatsModal isOpen={!!statsModal} onClose={() => setStatsModal(null)} periodo={statsModal?.periodo} stats={statsModal?.stats} />
      <NotifModal isOpen={notif.open} onClose={() => setNotif(p => ({ ...p, open: false }))} titulo={notif.titulo} mensaje={notif.mensaje} tipo={notif.tipo} />
    </div>
  );
};

export default PeriodosPage;
