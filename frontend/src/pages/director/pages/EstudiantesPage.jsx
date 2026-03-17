import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, Award, X, FileDown } from 'lucide-react';
import useEstudiantes from '../hooks/useEstudiantes';
import EstudianteRow from '../components/EstudianteRow';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import { academicoService } from '../../../services/academicoService';

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8];

const exportarCSV = (lista) => {
  const headers = ['Nombre', 'Cédula', 'Email', 'Carrera', 'Semestre', 'Becado', '% Beca', 'En Mora'];
  const rows = lista.map(e => [
    e.nombre || e.nombre_completo || '',
    e.cedula || '',
    e.email || '',
    e.carrera || e.carrera_nombre || '',
    e.semestre_actual || '',
    e.es_becado ? 'Sí' : 'No',
    e.porcentaje_beca || 0,
    e.en_mora ? 'Sí' : 'No',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `estudiantes_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const EstudiantesPage = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { estudiantes, loading, error, fetchEstudiantes } = useEstudiantes();

  const [carreras,       setCarreras]       = useState([]);
  const [filtroCarrera,  setFiltroCarrera]  = useState(location.state?.carreraId ? String(location.state.carreraId) : '');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [soloMora,       setSoloMora]       = useState(location.state?.soloMora || false);
  const [soloBeca,       setSoloBeca]       = useState(false);
  const [busqueda,       setBusqueda]       = useState('');

  useEffect(() => {
    academicoService.getCarreras()
      .then(r => { const d = r.data; setCarreras(d?.data?.carreras || d?.data || d || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (filtroCarrera)  params.carrera_id = filtroCarrera;
    if (filtroSemestre) params.semestre   = filtroSemestre;
    fetchEstudiantes(params);
  }, [filtroCarrera, filtroSemestre, fetchEstudiantes]);

  const filtrados = useMemo(() => {
    let list = estudiantes || [];
    if (soloMora)  list = list.filter(e => e.en_mora);
    if (soloBeca)  list = list.filter(e => e.es_becado);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(e =>
        (e.nombre || e.nombre_completo || '').toLowerCase().includes(q) ||
        (e.cedula || '').includes(q) ||
        (e.carrera_nombre || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [estudiantes, soloMora, soloBeca, busqueda]);

  const handleVerDetalle = async (est) => {
    navigate(`/director/estudiantes/${est.id}`);
  };

  const hayFiltros = filtroCarrera || filtroSemestre || soloMora || soloBeca;
  const limpiar = () => { setFiltroCarrera(''); setFiltroSemestre(''); setSoloMora(false); setSoloBeca(false); setBusqueda(''); };

  const moraCount = useMemo(() => estudiantes.filter(e => e.en_mora).length, [estudiantes]);
  const becaCount = useMemo(() => estudiantes.filter(e => e.es_becado).length, [estudiantes]);

  return (
    <div className="space-y-7">
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 text-sm text-rose-700 font-bold">
          Error al cargar estudiantes: {error}
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
              Estudiantes
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
              {loading ? 'Cargando...' : `${filtrados.length} de ${estudiantes.length} estudiantes`}
            </p>
          </div>
          <button
            onClick={() => exportarCSV(filtrados)}
            disabled={loading || filtrados.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-40 flex-shrink-0"
          >
            <FileDown size={14} /> CSV
          </button>
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Filtrar por</p>
        <div className="flex flex-wrap gap-3">
          <select
            value={filtroCarrera}
            onChange={e => { setFiltroCarrera(e.target.value); setFiltroSemestre(''); }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todas las carreras</option>
            {Array.isArray(carreras) && carreras.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <select
            value={filtroSemestre}
            onChange={e => setFiltroSemestre(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            disabled={!filtroCarrera}
          >
            <option value="">Todos los semestres</option>
            {SEMESTRES.map(s => <option key={s} value={s}>Semestre {s}</option>)}
          </select>

          <button
            onClick={() => setSoloMora(p => !p)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all border ${
              soloMora ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
            }`}
          >
            <AlertTriangle size={14} /> Mora {moraCount > 0 && `(${moraCount})`}
          </button>

          <button
            onClick={() => setSoloBeca(p => !p)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all border ${
              soloBeca ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
            }`}
          >
            <Award size={14} /> Becados {becaCount > 0 && `(${becaCount})`}
          </button>

          {hayFiltros && (
            <button onClick={limpiar} className="flex items-center gap-1.5 px-4 py-2.5 text-slate-400 hover:text-slate-700 text-sm font-bold transition-colors">
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        {!loading && (
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o cédula..." />
        )}
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : filtrados.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {filtrados.map(est => (
            <EstudianteRow key={est.id} estudiante={est} onClick={handleVerDetalle} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl">
          <EmptyState icon={Users} titulo="Sin estudiantes" descripcion="No hay estudiantes que coincidan con los filtros aplicados" />
        </div>
      )}

    </div>
  );
};

export default EstudiantesPage;