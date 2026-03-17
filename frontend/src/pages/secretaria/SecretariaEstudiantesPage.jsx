import { useState, useEffect, useCallback } from 'react';
import { Users, ChevronLeft, ChevronRight, AlertTriangle, Eye, X } from 'lucide-react';
import useEstudiantes from './hooks/useEstudiantes';
import SearchInput from '../../components/shared/SearchInput';
import EmptyState from '../../components/shared/EmptyState';
import { SkeletonTable } from '../../components/shared/Loader';
import SelectModal from './components/SelectModal';

const LIMIT = 20;

const EstudianteCard = ({ est, isMobile = false }) => {
  const nombre = est.nombre || est.nombre_completo || '—';
  const carrera = est.carrera || est.carrera_nombre || '—';

  if (isMobile) {
    return (
      <div className="w-full bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{nombre}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{est.cedula || '—'}</p>
            <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 truncate">{carrera}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {est.es_becado && (
              <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-sm">
                Beca {est.porcentaje_beca}%
              </span>
            )}
            {est.en_mora && <AlertTriangle size={14} className="text-red-500" />}
          </div>
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-50 text-[10px] font-bold text-slate-400 uppercase">
          <span>Sem. {est.semestre_actual ?? '—'}</span>
          {est.creditos_aprobados != null && <span>{est.creditos_aprobados} créditos</span>}
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-5 px-8">
        <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{nombre}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">{est.cedula || '—'}</p>
      </td>
      <td className="py-5 px-8">
        <p className="text-sm font-bold text-slate-600 truncate max-w-[200px]">{carrera}</p>
      </td>
      <td className="py-5 px-8 text-center">
        <p className="font-black text-slate-900 italic">{est.semestre_actual ?? '—'}</p>
      </td>
      <td className="py-5 px-8 text-center">
        <div className="flex items-center justify-center gap-2">
          {est.es_becado && (
            <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-indigo-500 text-indigo-600">
              Beca {est.porcentaje_beca}%
            </span>
          )}
          {est.en_mora && (
            <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-red-500 text-red-600 flex items-center gap-1">
              <AlertTriangle size={10} /> Mora
            </span>
          )}
          {!est.es_becado && !est.en_mora && (
            <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-slate-200 text-slate-400">
              Activo
            </span>
          )}
        </div>
      </td>
      <td className="py-5 px-8">
        <div className="flex items-center justify-center text-slate-300">
          <Eye size={16} />
        </div>
      </td>
    </tr>
  );
};

const SecretariaEstudiantesPage = () => {
  const { estudiantes, carreras, total, loading, fetchEstudiantes } = useEstudiantes();

  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [carreraId, setCarreraId] = useState('');
  const [semestre, setSemestre] = useState('');
  const [soloBecados, setSoloBecados] = useState(false);

  const cargarDatos = useCallback((p = 1) => {
    fetchEstudiantes({
      page: p,
      limit: LIMIT,
      q: busqueda || undefined,
      carrera_id: carreraId || undefined,
      semestre: semestre || undefined,
      es_becado: soloBecados || undefined,
    });
  }, [fetchEstudiantes, busqueda, carreraId, semestre, soloBecados]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      cargarDatos(1);
    }, 300);
    return () => clearTimeout(t);
  }, [cargarDatos]);

  const totalPages = Math.ceil(total / LIMIT);
  const hayFiltros = busqueda || carreraId || semestre || soloBecados;

  const limpiarFiltros = () => {
    setBusqueda('');
    setCarreraId('');
    setSemestre('');
    setSoloBecados(false);
  };

  const handlePrevPage = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      cargarDatos(newPage);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      cargarDatos(newPage);
    }
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Directorio <span className="text-indigo-600">Estudiantes</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? 'Cargando...' : `${total} estudiantes registrados`}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-3">
        <Eye size={16} className="text-slate-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Solo lectura — Usa Inscripciones para gestionar estudiantes
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Buscar por nombre o cédula..."
            />
          </div>
          <div className="w-full sm:w-56">
            <SelectModal
              options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
              value={carreraId}
              onChange={setCarreraId}
              placeholder="Todas las carreras"
              label="Seleccionar Carrera"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <div className="w-full sm:w-48">
            <SelectModal
              options={[1,2,3,4,5,6,7,8].map(s => ({ id: s, nombre: `Semestre ${s}` }))}
              value={semestre}
              onChange={setSemestre}
              placeholder="Todos los semestres"
              label="Seleccionar Semestre"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <button
            onClick={() => setSoloBecados(!soloBecados)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${
              soloBecados ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Solo becados
          </button>
          {(busqueda || carreraId || semestre || soloBecados) && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-400 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : estudiantes.length === 0 ? (
        <EmptyState icon={Users} titulo="Sin estudiantes encontrados" subtitulo="Intenta ajustar los filtros de búsqueda" />
      ) : (
        <>
          <div className="sm:hidden space-y-3">
            {estudiantes.map((est) => (
              <EstudianteCard key={est.id} est={est} isMobile />
            ))}
          </div>

          <div className="hidden sm:block bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-4 border-slate-900">
                  <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Estudiante</th>
                  <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Carrera</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Sem.</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Estado</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {estudiantes.map((est) => (
                  <EstudianteCard key={est.id} est={est} />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {page} / {totalPages}
              </p>
              <button
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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

export default SecretariaEstudiantesPage;
