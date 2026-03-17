import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useMora from '../hooks/useMora';
import SelectModal from '../components/SelectModal';
import MoraRow from '../components/MoraRow';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import api from '../../../services/api';

const fmt = n => new Intl.NumberFormat('es-EC', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(n || 0);

const TesoreroMoraPage = () => {
  const navigate = useNavigate();
  const { estudiantes, loading, fetchMora } = useMora();
  const [busqueda, setBusqueda] = useState('');
  const [carreras, setCarreras] = useState([]);
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');

  useEffect(() => { 
    fetchMora(); 
  }, [fetchMora]);

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

  const filtrados = useMemo(() => {
    let result = estudiantes;
    
    if (filtroCarrera) {
      result = result.filter(e => e.carrera_id === parseInt(filtroCarrera));
    }
    
    if (filtroSemestre) {
      result = result.filter(e => e.semestre_actual === parseInt(filtroSemestre));
    }
    
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      result = result.filter(e =>
        (e.nombre || '').toLowerCase().includes(q) ||
        (e.cedula || '').includes(q) ||
        (e.carrera || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [estudiantes, filtroCarrera, filtroSemestre, busqueda]);

  const totalDeuda = estudiantes.reduce((a, e) => a + (e.deuda_total || 0), 0);
  const conConvenio = estudiantes.filter(e => e.convenio_activo).length;
  const sinConvenio = estudiantes.length - conConvenio;

  return (
    <div className="space-y-7 overflow-x-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Lista de <span className="text-indigo-600">Mora</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? 'Cargando...' : `${estudiantes.length} estudiantes con deuda registrada`}
        </p>
      </motion.div>

      {/* Summary KPI strip */}
      {!loading && estudiantes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
        >
          {[
            {
              label: 'Deuda Total',
              value: fmt(totalDeuda),
              cls: 'bg-rose-600 text-white shadow-rose-200',
              sub: 'text-rose-100',
            },
            {
              label: 'En Mora',
              value: sinConvenio,
              cls: 'bg-slate-900 text-white shadow-slate-200',
              sub: 'text-slate-400',
            },
            {
              label: 'Con Convenio',
              value: conConvenio,
              cls: 'bg-teal-600 text-white shadow-teal-200',
              sub: 'text-teal-100',
            },
          ].map(({ label, value, cls, sub }) => (
            <div key={label} className={`rounded-xl p-4 sm:p-5 shadow-lg ${cls}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${sub} mb-1 sm:mb-2`}>{label}</p>
              <p className="text-xl sm:text-3xl font-black italic leading-none">{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto max-h-[60vh] sm:max-h-none"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera</label>
            <SelectModal
              options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
              value={filtroCarrera}
              onChange={setFiltroCarrera}
              placeholder="Todas las carreras"
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

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          titulo="Sin estudiantes en mora"
          subtitulo={busqueda ? 'Intenta con otra búsqueda' : 'No hay deudas pendientes registradas'}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2.5">
            {filtrados.map((est, i) => (
              <MoraRow key={est.id} estudiante={est} isMobile index={i} />
            ))}
          </div>

          {/* Desktop table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="hidden sm:block bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm"
          >
            <table className="w-full min-w-[550px]">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-5 px-7 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Estudiante</th>
                  <th className="py-5 px-7 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Carrera</th>
                  <th className="py-5 px-7 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Deuda</th>
                  <th className="py-5 px-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Materias</th>
                  <th className="py-5 px-7 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="py-5 px-7 w-12" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((est, i) => (
                  <MoraRow key={est.id} estudiante={est} index={i} />
                ))}
              </tbody>
            </table>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default TesoreroMoraPage;
