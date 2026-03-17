import { useState, useEffect } from 'react';
import { BookOpen, Loader2, GraduationCap, Users, Clock, MapPin, X, UserCog } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

const MateriasPage = () => {
  const [loading, setLoading] = useState(true);
  const [materias, setMaterias] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [carreraId, setCarreraId] = useState(null);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [carrerasRes, materiasRes] = await Promise.all([
        academicoService.getCarreras(),
        academicoService.getMaterias()
      ]);
      setCarreras(carrerasRes.data?.data?.carreras || carrerasRes.data?.carreras || []);
      setMaterias(materiasRes.data?.data?.materias || materiasRes.data?.materias || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (materia) => {
    setMateriaSeleccionada(materia);
    setLoadingDetalle(true);
    try {
      const res = await academicoService.getSecciones({ materia_id: materia.id });
      const secciones = res.data?.data?.secciones || res.data?.secciones || [];
      setDetalle({ secciones });
    } catch (error) {
      console.error('Error fetching detalle:', error);
      setDetalle({ secciones: [] });
    } finally {
      setLoadingDetalle(false);
    }
  };

  const filteredMaterias = carreraId 
    ? materias.filter(m => m.carrera_id === carreraId)
    : materias;

  const getMateriasPorSemestre = () => {
    const grupos = {};
    filteredMaterias.forEach(materia => {
      const semestre = materia.semestre || 1;
      if (!grupos[semestre]) grupos[semestre] = [];
      grupos[semestre].push(materia);
    });
    return Object.entries(grupos).sort(([a], [b]) => a - b);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-x-auto pb-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Materias</h1>
          <p className="text-sm text-slate-500">Lista de materias por carrera</p>
        </div>
        <select
          value={carreraId || ''}
          onChange={(e) => setCarreraId(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[180px]"
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        {getMateriasPorSemestre().map(([semestre, materiasSemestre]) => (
          <div key={semestre}>
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-600 mb-4 flex items-center gap-2">
              <span className="bg-indigo-50 px-4 py-2 rounded-lg text-sm">Semestre {semestre}</span>
              <span className="text-slate-400 text-xs">{materiasSemestre.length} materias</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materiasSemestre.map((materia) => (
                <button
                  key={materia.id}
                  onClick={() => verDetalle(materia)}
                  className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <BookOpen className="text-emerald-600" size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{materia.codigo}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2 truncate">{materia.nombre}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <GraduationCap size={12} />
                      {materia.creditos || 0} créditos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredMaterias.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No hay materias disponibles</p>
        </div>
      )}

      {/* Modal de Detalle */}
      {materiaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMateriaSeleccionada(null)} />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl my-8">
            <button 
              onClick={() => setMateriaSeleccionada(null)}
              className="absolute top-4 right-4 z-10 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full bg-slate-100"
            >
              <X size={24} />
            </button>

            <div className="mb-6 pr-12">
              <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-1">
                {materiaSeleccionada.nombre}
              </h2>
              <p className="text-sm text-slate-500">{materiaSeleccionada.codigo} • Semestre {materiaSeleccionada.semestre} • {materiaSeleccionada.creditos} créditos</p>
            </div>

            {loadingDetalle ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                    <UserCog size={18} />
                    Secciones ({detalle?.secciones?.length || 0})
                  </p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {detalle?.secciones?.length > 0 ? (
                      detalle.secciones.map((seccion) => (
                        <div key={seccion.id} className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl">
                          <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen size={20} className="text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800">{seccion.codigo}</p>
                            <p className="text-sm text-emerald-600 font-medium">
                              {seccion.docente || 'Sin docente asignado'}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {seccion.horario || 'Sin horario'}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {seccion.aula || 'Sin aula'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                {seccion.cupo_actual || 0}/{seccion.cupo_maximo || 0} estudiantes
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-xl">No hay secciones abiertas para esta materia</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MateriasPage;
