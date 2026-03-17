import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { History, Search, RefreshCw, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';
import { SkeletonTable } from '../../../components/shared/Loader';

const PER_PAGE = 20;

const exportarCSV = (lista) => {
  const headers = ['Estudiante', 'Nota Anterior', 'Nota Nueva', 'Modificado Por', 'Motivo', 'Fecha'];
  const rows = lista.map(r => [
    r.estudiante_nombre || '',
    r.nota_anterior ?? '',
    r.nota_nueva ?? '',
    r.modificado_por_nombre || r.modificado_por || '',
    r.motivo || '',
    r.fecha_modificacion?.slice(0, 16)?.replace('T', ' ') || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `auditoria_notas_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const AuditoriaNotasPage = () => {
  const [loading,  setLoading]  = useState(true);
  const [historial,setHistorial]= useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [page,     setPage]     = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res  = await academicoService.getHistorialNotas?.();
      const data = res?.data?.data || res?.data || [];
      setHistorial(Array.isArray(data) ? data : []);
    } catch {
      // El endpoint puede no existir aún — mostrar estado vacío limpio
      setHistorial([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return historial;
    const q = busqueda.toLowerCase();
    return historial.filter(r =>
      (r.estudiante_nombre || '').toLowerCase().includes(q) ||
      (r.motivo || '').toLowerCase().includes(q) ||
      (r.modificado_por_nombre || '').toLowerCase().includes(q)
    );
  }, [historial, busqueda]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PER_PAGE));
  const pagina     = filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const DeltaBadge = ({ anterior, nueva }) => {
    if (anterior == null || nueva == null) return <span className="text-slate-400">—</span>;
    const a   = parseFloat(anterior);
    const n   = parseFloat(nueva);
    const dif = (n - a).toFixed(1);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-500">{a.toFixed(1)}</span>
        <span className="text-slate-300">→</span>
        <span className={`text-sm font-black ${n >= a ? 'text-emerald-600' : 'text-rose-600'}`}>{n.toFixed(1)}</span>
        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-lg ${n >= a ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {n >= a ? '+' : ''}{dif}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-7 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
              Auditoría
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
              Historial de correcciones de notas · {filtrados.length} registros
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => exportarCSV(filtrados)}
              disabled={filtrados.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40"
            >
              <FileDown size={14} /> CSV
            </button>
            <button onClick={load} className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-indigo-600">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPage(1); }}
          placeholder="Buscar por estudiante, motivo o usuario..."
          className="w-full pl-11 pr-5 py-3.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : pagina.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl py-20 text-center">
          <div className="flex flex-col items-center gap-3 opacity-30">
            <History size={40} />
            <p className="text-sm font-black italic uppercase">Sin registros de auditoría</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Aquí aparecerán los cambios de notas cuando el Director o Coordinador corrija una nota desde la sección de Notas.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          {/* Header tabla */}
          <div className="hidden sm:grid grid-cols-[2fr_2fr_1.5fr_2fr_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
            {['Estudiante', 'Nota', 'Corregido por', 'Motivo', 'Fecha'].map(h => (
              <p key={h} className="text-[11px] font-black uppercase tracking-widest text-slate-400">{h}</p>
            ))}
          </div>

          <div className="divide-y divide-slate-50">
            {pagina.map((r, i) => (
              <div key={r.id || i} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                {/* Mobile */}
                <div className="sm:hidden space-y-2">
                  <p className="text-sm font-black italic uppercase text-slate-900">{r.estudiante_nombre || '—'}</p>
                  <DeltaBadge anterior={r.nota_anterior} nueva={r.nota_nueva} />
                  <p className="text-[10px] text-slate-400">{r.motivo || '—'}</p>
                  <p className="text-[11px] text-slate-500">{r.fecha_modificacion?.slice(0, 16)?.replace('T', ' ') || '—'}</p>
                </div>
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[2fr_2fr_1.5fr_2fr_1fr] gap-4 items-center">
                  <p className="text-sm font-black italic uppercase text-slate-900 truncate">{r.estudiante_nombre || '—'}</p>
                  <DeltaBadge anterior={r.nota_anterior} nueva={r.nota_nueva} />
                  <p className="text-sm text-slate-600 truncate">{r.modificado_por_nombre || r.modificado_por || '—'}</p>
                  <p className="text-sm text-slate-500 truncate">{r.motivo || '—'}</p>
                  <p className="text-[10px] text-slate-400">{r.fecha_modificacion?.slice(0, 16)?.replace('T', ' ') || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors disabled:opacity-30">
            <ChevronLeft size={16} className="text-slate-600" />
          </button>
          <span className="text-sm font-black text-slate-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors disabled:opacity-30">
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      )}

      {/* Info box sobre el endpoint */}
      {historial.length === 0 && !loading && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-sm font-black italic text-indigo-700 mb-2">¿Sin datos?</p>
          <p className="text-xs text-indigo-600">
            Esta página requiere el endpoint <code className="font-mono bg-indigo-100 px-1.5 py-0.5 rounded">GET /academico/historial-notas</code> en el backend.
            La tabla <code className="font-mono bg-indigo-100 px-1.5 py-0.5 rounded">historial_notas</code> se crea automáticamente con la primera corrección de nota.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditoriaNotasPage;
