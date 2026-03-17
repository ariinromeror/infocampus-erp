import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, User, DollarSign, BookOpen, ShieldCheck,
  AlertTriangle, ChevronRight, Loader2,
} from 'lucide-react';
import SelectModal from '../components/SelectModal';
import api from '../../../services/api';

const fmt = n => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const DebtColor = ({ monto }) => {
  const cls =
    monto > 600 ? 'text-indigo-600' :
    monto > 200 ? 'text-amber-600' :
    monto > 0   ? 'text-slate-700' :
                  'text-indigo-600';
  return <span className={`font-black italic text-lg ${cls}`}>{fmt(monto)}</span>;
};

const TesoreroCobrarPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [estudiantes, setEstudiantes] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 200 };
      if (filtroCarrera) params.carrera_id = filtroCarrera;
      if (filtroSemestre) params.semestre = filtroSemestre;
      if (filtroEstado === 'becado') params.es_becado = true;
      
      const [resEst, resCarr] = await Promise.all([
        api.get('/academico/estudiantes', { params }),
        api.get('/academico/carreras'),
      ]);
      
      const estudiantesData = Array.isArray(resEst.data?.data?.estudiantes) ? resEst.data.data.estudiantes : 
                            Array.isArray(resEst.data?.data) ? resEst.data.data : 
                            Array.isArray(resEst.data) ? resEst.data : [];
      
      const carrerasData = Array.isArray(resCarr.data?.data?.carreras) ? resCarr.data.data.carreras : 
                         Array.isArray(resCarr.data?.data) ? resCarr.data.data : 
                         Array.isArray(resCarr.data) ? resCarr.data : [];
      
      setCarreras(carrerasData);
      
      // Aplicar búsqueda local si hay texto
      if (busqueda.trim() && busqueda.length >= 2) {
        const q = busqueda.toLowerCase();
        const filtrados = estudiantesData.filter(e =>
          (e.nombre || '').toLowerCase().includes(q) ||
          (e.cedula || '').includes(q)
        );
        setEstudiantes(filtrados);
      } else {
        setEstudiantes(estudiantesData);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [filtroCarrera, filtroSemestre, filtroEstado, busqueda]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEstudianteClick = (est) => {
    navigate(`/tesorero/estudiante/${est.id}`);
  };

  return (
    <div className="space-y-8 overflow-x-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Buscar <span className="text-indigo-600">Estudiante</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Filtra por carrera, semestre o estado</p>
      </motion.div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto max-h-[60vh] sm:max-h-none"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Carrera */}
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

          {/* Semestre */}
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

          {/* Estado */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Estado</label>
            <SelectModal
              options={[
                { id: '', nombre: 'Todos' },
                { id: 'becado', nombre: 'Becados' },
                { id: 'moroso', nombre: 'En mora' }
              ]}
              value={filtroEstado}
              onChange={setFiltroEstado}
              placeholder="Todos"
              label="Seleccionar Estado"
              valueKey="id"
              labelKey="nombre"
            />
          </div>

          {/* Buscar */}
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

      {/* Resultados */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : estudiantes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <User size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">No se encontraron estudiantes</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2.5">
            {estudiantes.map((est) => (
              <button
                key={est.id}
                onClick={() => handleEstudianteClick(est)}
                className="w-full bg-white border border-slate-100 rounded-2xl p-4 text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 uppercase text-sm truncate">{est.nombre}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{est.cedula}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 truncate">{est.carrera_nombre || '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {est.es_becado && (
                      <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-sm">
                        Beca {est.porcentaje_beca}%
                      </span>
                    )}
                    <ChevronRight size={14} className="text-slate-300 mt-1" />
                  </div>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                  <span>Sem. {est.semestre_actual ?? '—'}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Estudiante</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Carrera</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Semestre</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est) => (
                <tr 
                  key={est.id}
                  onClick={() => handleEstudianteClick(est)}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 uppercase text-sm truncate">{est.nombre}</p>
                        <p className="text-xs text-slate-400">{est.cedula}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-600">{est.carrera_nombre || '—'}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-sm font-semibold text-slate-700">{est.semestre_actual || '—'}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {est.es_becado ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">Becado {est.porcentaje_beca}%</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">Regular</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <ChevronRight size={16} className="text-slate-300 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TesoreroCobrarPage;
