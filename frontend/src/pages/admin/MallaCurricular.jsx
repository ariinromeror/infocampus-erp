/**
 * MallaCurricular.jsx
 * 
 * UBICACIÓN en tu proyecto:
 *   src/pages/admin/MallaCurricular.jsx
 * 
 * ¿Cómo crear la carpeta?
 *   1. Ve a src/pages/
 *   2. Crea una carpeta que se llame "admin"
 *   3. Dentro de esa carpeta, pega este archivo
 * 
 * Esta página se abre cuando el Director hace click
 * en el botón "Malla y Usuarios" del dashboard.
 * 
 * Muestra todas las materias organizadas por semestre.
 * Trae los datos usando academicoService.getMaterias()
 * que ya existe y ya habla con GET /api/materias/
 */

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
  const [selectedSemestre, setSelectedSemestre] = useState(null); // null = todos
  const [busqueda, setBusqueda] = useState('');

  // Cuando se carga la página, trae las materias del backend
  useEffect(() => {
    fetchMaterias();
  }, []);

  // =====================================================
  // Habla con el backend para traer las materias
  // Usa el endpoint GET /api/materias/ que ya existe
  // =====================================================
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

  // =====================================================
  // Filtrar materias según el semestre seleccionado
  // y según lo que el usuario escribió en el buscador
  // =====================================================
  const materiasFiltradas = materias.filter(m => {
    const coincideSemestre = selectedSemestre === null || m.semestre === selectedSemestre;
    const coincideBusqueda =
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.codigo.toLowerCase().includes(busqueda.toLowerCase());
    return coincideSemestre && coincideBusqueda;
  });

  // Obtener los semestres únicos que existen en los datos
  const semestresDisponibles = [...new Set(materias.map(m => m.semestre))].sort((a, b) => a - b);

  // =====================================================
  // PANTALLA DE CARGA
  // =====================================================
  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={50} />
        <p className="font-black italic uppercase tracking-tighter text-slate-400">Cargando malla curricular...</p>
      </div>
    </div>
  );

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-20"
    >
      {/* HEADER: Botón volver + Título */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-indigo-400 transition-all"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">
            Malla Curricular
          </h1>
          <p className="text-slate-400 font-bold text-lg italic">
            Todas las materias de la institución
          </p>
        </div>
        {/* Contador total */}
        <div className="bg-white border border-slate-200 px-6 py-3 rounded-[25px] flex items-center gap-3">
          <BookOpen className="text-indigo-600" size={20} />
          <span className="font-black text-slate-900">{materias.length}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materias Total</span>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-white rounded-[30px] border border-slate-100 shadow-sm p-4 flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3 px-4">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o código de materia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 py-3 text-slate-900 font-bold placeholder-slate-400 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* FILTROS DE SEMESTRE */}
      <div className="flex gap-3 flex-wrap">
        {/* Botón "Todos" */}
        <button
          onClick={() => setSelectedSemestre(null)}
          className={`px-6 py-3 rounded-[20px] font-black transition-all text-sm ${
            selectedSemestre === null
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          Todos
        </button>

        {/* Un botón por cada semestre que existe en los datos */}
        {semestresDisponibles.map(sem => (
          <button
            key={sem}
            onClick={() => setSelectedSemestre(sem)}
            className={`px-6 py-3 rounded-[20px] font-black transition-all text-sm ${
              selectedSemestre === sem
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            Semestre {sem}
          </button>
        ))}
      </div>

      {/* CONTADOR DE RESULTADOS */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materiasFiltradas.map((materia) => (
          <motion.div
            key={materia.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group"
          >
            {/* Número decorativo de fondo (como en el dashboard) */}
            <Hash className="absolute -right-3 -bottom-3 text-slate-50 opacity-50 group-hover:rotate-12 transition-transform" size={80} />

            {/* Código de la materia */}
            <div className="flex items-start justify-between mb-4">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {materia.codigo}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase">
                Sem {materia.semestre}
              </span>
            </div>

            {/* Nombre de la materia */}
            <h3 className="text-lg font-black text-slate-900 uppercase italic leading-tight mb-3">
              {materia.nombre}
            </h3>

            {/* Info inferior: créditos y carrera */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                {materia.creditos} créditos
              </span>
              <span className="text-[10px] text-slate-400 font-bold truncate">
                {materia.carrera_nombre}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* MENSAJE SI NO HAY RESULTADOS */}
      {materiasFiltradas.length === 0 && (
        <div className="bg-white rounded-[40px] border border-slate-100 p-16 text-center">
          <div className="opacity-30">
            <BookOpen className="mx-auto mb-4" size={64} />
            <p className="text-xl font-black text-slate-600 uppercase italic">No se encontraron materias</p>
            <p className="text-sm text-slate-400 mt-2">
              Intente cambiar los filtros o la búsqueda
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MallaCurricular;