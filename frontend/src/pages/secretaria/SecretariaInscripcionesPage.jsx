import { useEffect, useState } from 'react';
import { 
  Search, ChevronRight, CheckCircle2, Users, BookOpen, 
  ArrowRight, RotateCcw, AlertCircle, UserPlus, Plus, X,
  ChevronDown, Save, Mail, Lock, CreditCard, Eye, FileText, Download
} from 'lucide-react';
import useInscripciones from './hooks/useInscripciones';
import EmptyState from '../../components/shared/EmptyState';
import Loader, { SkeletonGrid } from '../../components/shared/Loader';
import SelectModal from './components/SelectModal';
import { generarCertificadoInscripcion } from '../../utils/pdfGenerator';

const SecretariaInscripcionesPage = () => {
  const {
    busqueda, setBusqueda,
    resultados, buscando,
    estudianteSeleccionado, esNuevo,
    seccionesFiltradas, loadingSec,
    seccionesSeleccionadas, toggleSeccion,
    carreras,
    inscribiendo, creando, resultado,
    formNuevo, actualizarFormNuevo,
    buscarEstudiante,
    seleccionarEstudianteExistente,
    iniciarNuevoEstudiante,
    crearEstudiante,
    inscribirSeleccionadas,
    reiniciar,
    cargarMallaCurricular,
  } = useInscripciones();

  const [mostrarMalla, setMostrarMalla] = useState(false);
  const [mallaData, setMallaData] = useState(null);
  const [loadingMalla, setLoadingMalla] = useState(false);
  const [aceptoMalla, setAceptoMalla] = useState(false);
  const [datosCertificado, setDatosCertificado] = useState(null);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);

  const paso = resultado ? 3 : 2;

  const cargarMalla = async (carreraId) => {
    if (!carreraId) return;
    setLoadingMalla(true);
    const data = await cargarMallaCurricular(carreraId);
    setMallaData(data);
    const carrera = carreras.find(c => String(c.id) === String(carreraId));
    setCarreraSeleccionada(carrera);
    setLoadingMalla(false);
  };

  const handleCarreraChange = (carreraId) => {
    actualizarFormNuevo('carrera_id', carreraId);
    if (carreraId) {
      cargarMalla(carreraId);
    } else {
      setMallaData(null);
      setCarreraSeleccionada(null);
      setAceptoMalla(false);
    }
  };

  useEffect(() => {
    iniciarNuevoEstudiante();
  }, []);

  useEffect(() => {
    if (resultado?.ok && estudianteSeleccionado && seccionesSeleccionadas.length > 0 && carreraSeleccionada) {
      setDatosCertificado({
        estudiante: {
          id: estudianteSeleccionado.id,
          first_name: estudianteSeleccionado.first_name || estudianteSeleccionado.nombre?.split(' ')[0] || '',
          last_name: estudianteSeleccionado.last_name || estudianteSeleccionado.nombre?.split(' ').slice(1).join(' ') || '',
          cedula: estudianteSeleccionado.cedula
        },
        carrera: {
          nombre: carreraSeleccionada.nombre,
          precio_credito: carreraSeleccionada.precio_credito || 0
        },
        secciones: seccionesSeleccionadas.map(sec => ({
          codigo: sec.codigo,
          materia: sec.materia,
          creditos: sec.creditos || 0,
          aula: sec.aula,
          horario: sec.horario
        })),
        periodo: { nombre: 'Período Actual' },
        fecha: new Date().toISOString()
      });
    }
  }, [resultado, estudianteSeleccionado, seccionesSeleccionadas, carreraSeleccionada]);

  useEffect(() => {
    if (!estudianteSeleccionado && !resultado) {
      setDatosCertificado(null);
      setMallaData(null);
      setCarreraSeleccionada(null);
      setAceptoMalla(false);
    }
  }, [estudianteSeleccionado, resultado]);

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Nueva <span className="text-indigo-600">Inscripción</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Crear estudiante e inscribir a materias
        </p>
      </div>

      {/* Formulario - solo cuando NO hay estudiante seleccionado */}
      {!estudianteSeleccionado && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 px-6 py-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
            <UserPlus size={18} className="text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-600">Nuevo Estudiante</p>
              <p className="text-xs text-indigo-500">Completa los datos para inscribirlo</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700">Datos del Estudiante</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Cédula *</label>
                <input
                  type="text"
                  placeholder="0912345678"
                  value={formNuevo.cedula}
                  onChange={e => actualizarFormNuevo('cedula', e.target.value)}
                  maxLength={10}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Carrera *</label>
                <SelectModal
                  options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
                  value={formNuevo.carrera_id}
                  onChange={handleCarreraChange}
                  placeholder="Seleccionar carrera..."
                  label="Seleccionar Carrera"
                  valueKey="id"
                  labelKey="nombre"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Nombre *</label>
                <input
                  type="text"
                  placeholder="Arín"
                  value={formNuevo.first_name}
                  onChange={e => actualizarFormNuevo('first_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Apellido *</label>
                <input
                  type="text"
                  placeholder="Romero"
                  value={formNuevo.last_name}
                  onChange={e => actualizarFormNuevo('last_name', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Email (automático)</label>
                <input
                  type="text"
                  value={formNuevo.email}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Contraseña temporal</label>
                <input
                  type="text"
                  value={formNuevo.password}
                  onChange={e => actualizarFormNuevo('password', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Beca % (opcional)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formNuevo.porcentaje_beca}
                  onChange={e => actualizarFormNuevo('porcentaje_beca', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={reiniciar}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 transition-all"
              >
                <X size={14} /> Cancelar
              </button>
              {formNuevo.carrera_id && !aceptoMalla && (
                <button
                  onClick={() => setMostrarMalla(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                >
                  <Eye size={14} /> Ver Malla Curricular
                </button>
              )}
              <button
                onClick={crearEstudiante}
                disabled={creando || !aceptoMalla}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest text-[11px] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {creando ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
                ) : (
                  <><Save size={15} /> Crear y Continuar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {paso === 2 && estudianteSeleccionado && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 px-6 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Estudiante seleccionado</p>
              <p className="font-black text-slate-900 uppercase text-sm">
                {estudianteSeleccionado.nombre || estudianteSeleccionado.nombre_completo}
              </p>
              <p className="text-xs font-bold text-slate-500">
                {estudianteSeleccionado.cedula} • {estudianteSeleccionado.carrera || 'Carrera'} • Semestre {estudianteSeleccionado.semestre_actual || 1}
              </p>
            </div>
            <button
              onClick={reiniciar}
              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cambiar
            </button>
          </div>

          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            Selecciona las materias para inscribir (Semestre {estudianteSeleccionado.semestre_actual || 1})
          </p>

          {loadingSec ? (
            <SkeletonGrid count={4} />
          ) : seccionesFiltradas.length === 0 ? (
            <EmptyState icon={BookOpen} titulo="Sin materias disponibles" subtitulo="No hay secciones para este semestre" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {seccionesFiltradas.map(sec => {
                const inscritos = sec.inscritos || sec.cupo_actual || 0;
                const pct = sec.cupo_maximo ? Math.round(inscritos / sec.cupo_maximo * 100) : 0;
                const llena = pct >= 100;
                const seleccionada = seccionesSeleccionadas.some(s => s.id === sec.id);
                return (
                  <button
                    key={sec.id}
                    onClick={() => !llena && toggleSeccion(sec)}
                    disabled={llena}
                    className={`text-left p-6 rounded-xl border-2 transition-all ${
                      seleccionada ? 'border-indigo-600 bg-indigo-50 shadow-lg' :
                      llena        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' :
                                     'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">{sec.codigo || '—'}</p>
                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{sec.materia || '—'}</p>
                      </div>
                      {seleccionada && <CheckCircle2 size={20} className="text-indigo-600 flex-shrink-0" />}
                      {llena && <span className="text-[11px] font-black uppercase text-red-500 flex-shrink-0">Llena</span>}
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mt-3 pt-3 border-t border-slate-100">
                      <span className="flex items-center gap-1"><Users size={11} /> {inscritos}/{sec.cupo_maximo || '—'}</span>
                      <span>{sec.aula || '—'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {seccionesSeleccionadas.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <CreditCard size={16} className="text-slate-400" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-600">
                  {seccionesSeleccionadas.length} materia{seccionesSeleccionadas.length > 1 ? 's' : ''} seleccionada{seccionesSeleccionadas.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={inscribirSeleccionadas}
                disabled={inscribiendo}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest text-[11px] hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-xl"
              >
                {inscribiendo ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Inscribiendo...</>
                ) : (
                  <>Inscribir <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {paso === 3 && resultado && (
        <div className="space-y-6">
          <div className={`rounded-2xl p-10 sm:p-14 text-center ${resultado.ok ? 'bg-slate-900 text-white' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {resultado.ok ? (
              <CheckCircle2 className="mx-auto mb-6" size={56} />
            ) : (
              <AlertCircle className="mx-auto mb-6" size={56} />
            )}
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-3">
              {resultado.ok ? 'Inscripción completada' : 'Error en la inscripción'}
            </p>
            <p className="text-lg sm:text-2xl font-black italic uppercase tracking-tighter leading-tight max-w-lg mx-auto">
              {resultado.msg}
            </p>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            {resultado.ok && datosCertificado && (
              <button
                onClick={() => generarCertificadoInscripcion(
                  datosCertificado.estudiante,
                  datosCertificado.carrera,
                  datosCertificado.secciones,
                  datosCertificado.periodo,
                  datosCertificado.fecha
                )}
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
              >
                <Download size={14} /> Descargar Comprobante PDF
              </button>
            )}
            <button
              onClick={reiniciar}
              className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-400 transition-all"
            >
              <RotateCcw size={14} /> Nueva inscripción
            </button>
          </div>
        </div>
      )}

      {mostrarMalla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMostrarMalla(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-indigo-600 text-white">
              <div>
                <h2 className="text-xl font-black uppercase">Malla Curricular</h2>
                {mallaData?.carrera && (
                  <p className="text-indigo-200 text-sm font-bold">{mallaData.carrera.nombre}</p>
                )}
              </div>
              <button
                onClick={() => setMostrarMalla(false)}
                className="p-2 hover:bg-indigo-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingMalla ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : mallaData ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Créditos</p>
                      <p className="text-2xl font-black text-slate-900">{mallaData.total_creditos}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Precio por Crédito</p>
                      <p className="text-2xl font-black text-indigo-600">${mallaData.carrera.precio_credito}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Duración</p>
                      <p className="text-2xl font-black text-slate-900">{mallaData.carrera.duracion_semestres} semestres</p>
                    </div>
                  </div>

                  {mallaData.semestres.map((sem) => (
                    <div key={sem.numero} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                        <p className="font-black uppercase text-sm">Semestre {sem.numero}</p>
                        <p className="text-xs font-bold text-slate-400">{sem.creditos} créditos</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {sem.materias.map((materia) => (
                          <div key={materia.id} className="p-4 flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-black text-slate-900 uppercase text-sm">{materia.codigo} - {materia.nombre}</p>
                              {materia.prerrequisitos.length > 0 && (
                                <p className="text-[10px] text-amber-600 font-bold mt-1">
                                  Prerreq: {materia.prerrequisitos.map(p => p.codigo).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-black text-indigo-600">{materia.creditos} cr</span>
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

            {mallaData && (
              <div className="p-6 border-t border-slate-200 bg-slate-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceptoMalla}
                    onChange={(e) => setAceptoMalla(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-sm">
                    <p className="font-bold text-slate-700">
                      Declaro que he leído y acepto cursar todas las materias descritas en esta malla curricular
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                      Entiendo que debo completar todas las materias en el orden establecido para obtener mi título
                    </p>
                  </div>
                </label>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setMostrarMalla(false)}
                    className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-slate-400 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => { setAceptoMalla(true); setMostrarMalla(false); }}
                    disabled={!aceptoMalla}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Confirmar Aceptación
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretariaInscripcionesPage;