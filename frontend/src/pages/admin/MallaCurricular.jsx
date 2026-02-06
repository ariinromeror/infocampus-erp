import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Loader2,
  Search, Plus, Hash
} from 'lucide-react';
import { academicoService } from '../../services/academicoService';

const MallaCurricular = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [materias, setMaterias] = useState([]);
  const [selectedSemestre, setSelectedSemestre] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    fetchMaterias();
  }, []);

  const fetchMaterias = async () => {
    setLoading(true);
    try {
      const res = await academicoService.getMaterias();
      setMaterias(res.data);
    } catch (error) {
      console.error('Error cargando materias:', error);
    } finally {
      setLoading(false);
    }
  };

  const materiasFiltradas = materias.filter(m => {
    const coincideSemestre = selectedSemestre === null || m.semestre === selectedSemestre;
    const coincideBusqueda =
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.codigo.toLowerCase().includes(busqueda.toLowerCase());
    return coincideSemestre && coincideBusqueda;
  });

  const semestresDisponibles = [...new Set(materias.map(m => m.semestre))].sort((a, b) => a - b);

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={50} />
        <p className="font-black italic uppercase tracking-tighter text-slate-400">Cargando malla curricular...</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-10 sm:pb-20 p-4 sm:p-0"
    >
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl hover:bg-slate-50 hover:border-indigo-400 transition-all"
        >
          <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">
            Malla Curricular
          </h1>
          <p className="text-slate-400 font-bold text-sm sm:text-base lg:text-lg italic">
            Todas las materias de la institución
          </p>
        </div>
        {/* Contador total */}
        <div className="bg-white border border-slate-200 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl sm:rounded-[25px] flex items-center gap-2 sm:gap-3">
          <BookOpen className="text-indigo-600" size={18} />
          <span className="font-black text-slate-900">{materias.length}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Materias Total</span>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-white rounded-2xl sm:rounded-[30px] border border-slate-100 shadow-sm p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
        <div className="flex-1 flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
          <Search className="text-slate-400 flex-shrink-0" size={18} />
          <input
            type="text"
            placeholder="Buscar materia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 py-2 sm:py-3 text-sm sm:text-base text-slate-900 font-bold placeholder-slate-400 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* FILTROS DE SEMESTRE */}
      <div className="flex gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={() => setSelectedSemestre(null)}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl sm:rounded-[20px] font-black transition-all text-xs sm:text-sm ${
            selectedSemestre === null
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          Todos
        </button>

        {semestresDisponibles.map(sem => (
          <button
            key={sem}
            onClick={() => setSelectedSemestre(sem)}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl sm:rounded-[20px] font-black transition-all text-xs sm:text-sm ${
              selectedSemestre === sem
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            Sem {sem}
          </button>
        ))}
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-bold text-slate-500">
          Mostrando <span className="text-indigo-600 font-black">{materiasFiltradas.length}</span> materia{materiasFiltradas.length !== 1 ? 's' : ''}
          {selectedSemestre !== null && ` del semestre ${selectedSemestre}`}
          {busqueda && ` · Búsqueda: "${busqueda}"`}
        </p>
        {(selectedSemestre !== null || busqueda) && (
          <button
            onClick={() => { setSelectedSemestre(null); setBusqueda(''); }}
            className="text-xs font-black text-rose-500 hover:text-rose-700 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* GRID DE MATERIAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {materiasFiltradas.map((materia) => (
          <motion.div
            key={materia.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group"
          >
            <Hash className="absolute -right-3 -bottom-3 text-slate-50 opacity-50 group-hover:rotate-12 transition-transform" size={60} />

            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <span className="px-2 sm:px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {materia.codigo}
              </span>
              <span className="px-2 sm:px-3 py-1 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase">
                Sem {materia.semestre}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase italic leading-tight mb-3">
              {materia.nombre}
            </h3>

            <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex-wrap">
              <span className="px-2 sm:px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                {materia.creditos} créditos
              </span>
              <span className="text-[10px] text-slate-400 font-bold truncate flex-1">
                {materia.carrera_nombre}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MENSAJE SI NO HAY RESULTADOS */}
      {materiasFiltradas.length === 0 && (
        <div className="bg-white rounded-2xl sm:rounded-[40px] border border-slate-100 p-10 sm:p-16 text-center">
          <div className="opacity-30">
            <BookOpen className="mx-auto mb-4" size={48} />
            <p className="text-lg sm:text-xl font-black text-slate-600 uppercase italic">No se encontraron materias</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Intente cambiar los filtros o la búsqueda
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MallaCurricular;