import { useState, useEffect } from 'react';
import { GraduationCap, Loader2, Users, BookOpen, X, UserCog, Clock, MapPin, Award } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

const CarrerasPage = () => {
  const [loading, setLoading] = useState(true);
  const [carreras, setCarreras] = useState([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchCarreras();
  }, []);

  const fetchCarreras = async () => {
    try {
      const res = await academicoService.getCarreras();
      setCarreras(res.data?.data?.carreras || res.data?.carreras || []);
    } catch (error) {
      console.error('Error fetching carreras:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (carrera) => {
    setCarreraSeleccionada(carrera);
    setLoadingDetalle(true);
    try {
      const [estudiantesRes, seccionesRes] = await Promise.all([
        academicoService.getEstudiantes({ carrera_id: carrera.id, limit: 100 }),
        academicoService.getSecciones({ carrera_id: carrera.id })
      ]);

      const estudiantes = estudiantesRes.data?.data?.estudiantes || estudiantesRes.data?.estudiantes || [];
      const secciones = seccionesRes.data?.data?.secciones || seccionesRes.data?.secciones || [];

      setDetalle({
        estudiantes: estudiantes,
        secciones: secciones
      });
    } catch (error) {
      console.error('Error fetching detalle:', error);
    } finally {
      setLoadingDetalle(false);
    }
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Carreras</h1>
        <p className="text-sm text-slate-500">Lista de carreras disponibles - Click para ver detalle</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {carreras.map((carrera) => (
          <button
            key={carrera.id}
            onClick={() => verDetalle(carrera)}
            className="bg-white rounded-xl border border-slate-100 p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <GraduationCap className="text-indigo-600" size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{carrera.codigo}</span>
            </div>
            <h3 className="text-base font-black uppercase italic text-slate-900 mb-3 truncate">{carrera.nombre}</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {carrera.duracion_semestres || 0} semestres
              </span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {carrera.total_estudiantes || 0} estudiantes
              </span>
            </div>
          </button>
        ))}
      </div>

      {carreras.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl">
          <GraduationCap size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No hay carreras disponibles</p>
        </div>
      )}

      {/* Modal de Detalle */}
      {carreraSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setCarreraSeleccionada(null)} />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-5xl w-full shadow-2xl my-8">
            <button 
              onClick={() => setCarreraSeleccionada(null)}
              className="absolute top-4 right-4 z-10 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full bg-slate-100"
            >
              <X size={24} />
            </button>

            <div className="mb-6 pr-12">
              <h2 className="text-2xl font-black italic uppercase text-slate-900 mb-1">
                {carreraSeleccionada.nombre}
              </h2>
              <p className="text-sm text-slate-500">{carreraSeleccionada.codigo} • {carreraSeleccionada.duracion_semestres} semestres</p>
            </div>

            {loadingDetalle ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profesores que dan clases */}
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                    <UserCog size={18} />
                    Profesores ({detalle?.secciones?.filter(s => s.docente_id).length || 0})
                  </p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {detalle?.secciones?.length > 0 ? (
                      detalle.secciones
                        .filter((s, i, arr) => arr.findIndex(x => x.docente_id === s.docente_id) === i)
                        .filter(s => s.docente_id)
                        .map((seccion) => (
                          <div key={seccion.id} className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl">
                            <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <UserCog size={20} className="text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800">{seccion.docente}</p>
                              <p className="text-sm text-emerald-600 font-medium">{seccion.materia}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {seccion.horario || 'Sin horario'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  {seccion.aula || 'Sin aula'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-slate-400">No hay profesores asignados</p>
                    )}
                  </div>
                </div>

                {/* Estudiantes */}
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                    <Users size={18} />
                    Estudiantes ({detalle?.estudiantes?.length || 0})
                  </p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {detalle?.estudiantes?.length > 0 ? (
                      detalle.estudiantes.map((est) => {
                        const iniciales = (est.nombre || 'E')
                          .split(' ')
                          .map(n => n[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();
                        return (
                          <div key={est.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-black text-indigo-600">{iniciales}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{est.nombre}</p>
                              <p className="text-xs text-slate-500">{est.cedula}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-medium text-indigo-600">Sem {est.semestre_actual}</p>
                              {est.promedio_acumulado && (
                                <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                                  <Award size={10} />
                                  {est.promedio_acumulado?.toFixed(1)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-400">No hay estudiantes inscritos</p>
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

export default CarrerasPage;
