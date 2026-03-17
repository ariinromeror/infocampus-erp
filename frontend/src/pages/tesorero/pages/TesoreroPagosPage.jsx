import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Receipt, ChevronLeft, ChevronRight, SlidersHorizontal, X, Search } from 'lucide-react';
import usePagos from '../hooks/usePagos';
import SelectModal from '../components/SelectModal';
import PagoRow from '../components/PagoRow';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import api from '../../../services/api';

const LIMIT = 15;

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'completado', label: 'Completados' },
  { value: 'pendiente', label: 'Pendientes' },
];

const TesoreroPagosPage = () => {
  const { pagos, total, totalPages, loading, fetchPagos } = usePagos();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carreras, setCarreras] = useState([]);
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');

  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const res = await api.get('/academico/carreras');
        const data = Array.isArray(res.data?.data?.carreras) ? res.data.data.carreras : 
                     Array.isArray(res.data?.data) ? res.data.data : 
                     Array.isArray(res.data) ? res.data : [];
        setCarreras(data);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    fetchCarreras();
  }, []);

  const cargar = useCallback((p = 1, est = estado, carr = filtroCarrera, sem = filtroSemestre) => {
    fetchPagos({ 
      page: p, 
      limit: LIMIT, 
      estado: est || undefined,
      carrera_id: carr || undefined,
      semestre: sem || undefined
    });
  }, [fetchPagos, estado, filtroCarrera, filtroSemestre]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); cargar(1, estado, filtroCarrera, filtroSemestre); }, 250);
    return () => clearTimeout(t);
  }, [estado, filtroCarrera, filtroSemestre, cargar]);

  useEffect(() => { cargar(1); }, []);

  const filtrados = busqueda.trim()
    ? (pagos || []).filter(p =>
        (p.estudiante || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.cedula || '').includes(busqueda)
      )
    : pagos;

  const cambiarPagina = (nuevaPag) => {
    setPage(nuevaPag);
    cargar(nuevaPag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-7 overflow-x-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Historial de <span className="text-indigo-600">Pagos</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? 'Cargando...' : `${total} registros totales`}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto max-h-[60vh] sm:max-h-none"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera</label>
            <SelectModal
              options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
              value={filtroCarrera}
              onChange={setFiltroCarrera}
              placeholder="Todas"
              label="Seleccionar Carrera"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Semestre</label>
            <SelectModal
              options={[{ id: '', nombre: 'Todos' }, ...[1,2,3,4,5,6,7,8,9,10].map(s => ({ id: s, nombre: `Semestre ${s}` }))]}
              value={filtroSemestre}
              onChange={setFiltroSemestre}
              placeholder="Todos"
              label="Seleccionar Semestre"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Estado</label>
            <SelectModal
              options={ESTADOS.map(e => ({ id: e.value, nombre: e.label }))}
              value={estado}
              onChange={setEstado}
              placeholder="Todos"
              label="Seleccionar Estado"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o cédula..."
                className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={7} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Receipt}
          titulo="Sin pagos encontrados"
          subtitulo="Ajusta los filtros de búsqueda"
        />
      ) : (
        <>
          {/* Mobile */}
          <div className="sm:hidden space-y-2.5">
            {filtrados.map((pago, i) => <PagoRow key={pago.id} pago={pago} isMobile index={i} />)}
          </div>

          {/* Desktop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="hidden sm:block bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm"
          >
            <table className="w-full min-w-[550px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  {['Estudiante', 'Concepto', 'Monto', 'Método', 'Fecha', 'Estado'].map(h => (
                    <th key={h} className="py-5 px-7 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((pago, i) => <PagoRow key={pago.id} pago={pago} index={i} />)}
              </tbody>
            </table>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => cambiarPagina(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl
                  text-[10px] font-black uppercase tracking-widest text-slate-500
                  hover:border-teal-300 hover:text-indigo-600
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => cambiarPagina(p)}
                      className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all
                        ${page === p
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-teal-300'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="text-slate-300 font-bold text-sm">···</span>
                )}
              </div>

              <button
                onClick={() => cambiarPagina(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl
                  text-[10px] font-black uppercase tracking-widest text-slate-500
                  hover:border-teal-300 hover:text-indigo-600
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TesoreroPagosPage;
