import { useState, useEffect } from 'react';
import { 
  BookOpen, Users, ChevronRight, X, 
  FileText, Download, Loader2, GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { generarMallaCurricularPDF } from '../../utils/pdfGenerator';

const SecretariaMallasPage = () => {
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);
  const [mallaData, setMallaData] = useState(null);
  const [loadingMalla, setLoadingMalla] = useState(false);

  useEffect(() => {
    fetchCarreras();
  }, []);

  const fetchCarreras = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academico/carreras');
      const data = res.data;
      setCarreras(data?.data?.carreras || data?.carreras || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarCarrera = async (carrera) => {
    setCarreraSeleccionada(carrera);
    try {
      setLoadingMalla(true);
      const res = await api.get(`/academico/carreras/${carrera.id}/malla`);
      setMallaData(res.data?.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingMalla(false);
    }
  };

  const generarPDF = () => {
    if (mallaData && carreraSeleccionada) {
      generarMallaCurricularPDF(
        { 
          nombre: carreraSeleccionada.nombre, 
          creditos_totales: carreraSeleccionada.creditos_totales,
          precio_credito: carreraSeleccionada.precio_credito,
          duracion_semestres: carreraSeleccionada.duracion_semestres
        },
        mallaData.semestres
      );
    }
  };

  const cerrarDetalle = () => {
    setCarreraSeleccionada(null);
    setMallaData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Mallas <span className="text-indigo-600">Curriculares</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consulta la estructura académica de todas las carreras
        </p>
      </div>

      {/* Grid de Carreras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
        {carreras.map((carrera) => (
          <button
            key={carrera.id}
            onClick={() => seleccionarCarrera(carrera)}
            className="text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-300 transition-all group"
          >
            <div className="flex items-start justify-between mb-2 sm:mb-4">
              <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl">
                <GraduationCap className="text-indigo-600" size={20} />
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" size={18} />
            </div>
            
            <h3 className="font-black text-slate-900 uppercase text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
              {carrera.nombre}
            </h3>
            
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500 font-bold">Duración:</span>
                <span className="text-slate-700 font-black">{carrera.duracion_semestres} sem</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500 font-bold">Créditos:</span>
                <span className="text-slate-700 font-black">{carrera.creditos_totales}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-xs">
                <span className="text-slate-500 font-bold">Precio/cr:</span>
                <span className="text-indigo-600 font-black">{carrera.precio_credito} €</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal de Detalle */}
      {carreraSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={cerrarDetalle} />
          <div className="relative bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-indigo-600 text-white">
              <div className="flex-1">
                <h2 className="text-xl font-black uppercase">{carreraSeleccionada.nombre}</h2>
                <p className="text-indigo-200 text-sm font-bold">
                  {carreraSeleccionada.duracion_semestres} semestres • {carreraSeleccionada.creditos_totales} créditos • {carreraSeleccionada.precio_credito} €/crédito
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generarPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={cerrarDetalle}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {loadingMalla ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
              ) : mallaData ? (
                <div className="space-y-6">
                  {/* Resumen */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Créditos</p>
                      <p className="text-2xl font-black text-slate-900">{mallaData.total_creditos}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Semestres</p>
                      <p className="text-2xl font-black text-slate-900">{mallaData.semestres?.length || 0}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Precio/cr</p>
                      <p className="text-2xl font-black text-indigo-600">{mallaData.carrera?.precio_credito || 0} €</p>
                    </div>
                  </div>

                  {/* Materias por Semestre */}
                  {mallaData.semestres?.map((semestre) => (
                    <div key={semestre.numero} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                        <p className="font-black uppercase text-sm">Semestre {semestre.numero}</p>
                        <p className="text-xs font-bold text-slate-400">{semestre.creditos} créditos</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {semestre.materias.map((materia) => (
                          <div key={materia.id} className="p-4 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  {materia.codigo}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 text-sm">{materia.nombre}</p>
                              {materia.prerrequisitos && materia.prerrequisitos.length > 0 && (
                                <p className="text-[10px] text-amber-600 font-bold mt-1">
                                  Prerreq: {materia.prerrequisitos.map(p => p.codigo).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                              {materia.creditos} cr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8">No hay datos disponibles</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretariaMallasPage;