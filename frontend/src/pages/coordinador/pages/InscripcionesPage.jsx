import { useState, useEffect } from 'react';
import { Loader2, Users, BookOpen, X, Plus, Search, Clock } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';
import { administrativoService } from '../../../services/administrativoService';

const SeccionItem = ({ seccion, seleccionado, onClick, estudiantesCount }) => {
  return (
    <button
      onClick={() => onClick(seccion)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all ${
        seleccionado 
          ? 'bg-indigo-600 text-white shadow-lg' 
          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${seleccionado ? 'text-white' : 'text-slate-900'}`}>
          {seccion.materia}
        </p>
        <div className={`flex items-center gap-2 mt-1 text-[10px] ${seleccionado ? 'text-indigo-200' : 'text-slate-500'}`}>
          <span>{seccion.codigo}</span>
          <span>•</span>
          <span>{seccion.docente || 'Sin docente'}</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <p className={`text-sm font-black ${seleccionado ? 'text-white' : 'text-slate-900'}`}>
          {estudiantesCount}/{seccion.cupo_maximo}
        </p>
        <p className={`text-[11px] ${seleccionado ? 'text-indigo-200' : 'text-slate-400'}`}>inscritos</p>
      </div>
    </button>
  );
};

const EstudianteCard = ({ estudiante, onVerDetalle }) => {
  const iniciales = (estudiante.nombre || 'E')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={() => onVerDetalle(estudiante)}
      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-black text-indigo-600">{iniciales}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{estudiante.nombre}</p>
          <p className="text-[10px] text-slate-500">{estudiante.cedula}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-black ${
            estudiante.nota_final >= 7 ? 'text-emerald-500' : 
            estudiante.nota_final ? 'text-rose-500' : 'text-slate-400'
          }`}>
            {estudiante.nota_final?.toFixed(1) || '—'}
          </p>
          <p className="text-[11px] text-slate-400">{estudiante.estado}</p>
        </div>
      </div>
    </button>
  );
};

const InscripcionesPage = () => {
  const [loading, setLoading] = useState(true);
  const [secciones, setSecciones] = useState([]);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
  const [estudiantesSeccion, setEstudiantesSeccion] = useState([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [carreraFiltro, setCarreraFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalInscribir, setModalInscribir] = useState(false);
  const [estudianteBuscar, setEstudianteBuscar] = useState('');
  const [resultadosBuscar, setResultadosBuscar] = useState([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [notif, setNotif] = useState({ show: false, type: 'success', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchSecciones();
  }, [periodoFiltro, carreraFiltro]);

  useEffect(() => {
    if (seccionSeleccionada) {
      fetchEstudiantesSeccion();
    }
  }, [seccionSeleccionada]);

  const fetchData = async () => {
    try {
      const [periodosRes, carrerasRes] = await Promise.all([
        academicoService.getPeriodos(),
        academicoService.getCarreras()
      ]);
      setPeriodos(periodosRes.data?.data?.periodos || periodosRes.data?.periodos || []);
      setCarreras(carrerasRes.data?.data?.carreras || carrerasRes.data?.carreras || []);
      
      const periodoActivo = (periodosRes.data?.data?.periodos || periodosRes.data?.periodos || []).find(p => p.activo);
      if (periodoActivo) {
        setPeriodoFiltro(periodoActivo.id.toString());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSecciones = async () => {
    try {
      const params = {};
      if (periodoFiltro) params.periodo_id = parseInt(periodoFiltro);
      if (carreraFiltro) params.carrera_id = parseInt(carreraFiltro);
      const res = await academicoService.getSecciones(params);
      setSecciones(res.data?.data?.secciones || res.data?.secciones || []);
    } catch (error) {
      console.error('Error fetching secciones:', error);
    }
  };

  const fetchEstudiantesSeccion = async () => {
    setLoadingEstudiantes(true);
    try {
      const res = await academicoService.getEstudiantesSeccion(seccionSeleccionada.id);
      setEstudiantesSeccion(res.data?.data?.estudiantes || res.data?.estudiantes || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  const buscarEstudiantes = async (query) => {
    setEstudianteBuscar(query);
    try {
      const params = query.length >= 2 ? { q: query, limit: 15 } : { limit: 15 };
      const res = await academicoService.getEstudiantes(params);
      const estudiantesData = res.data?.data?.estudiantes || res.data?.estudiantes || [];
      setResultadosBuscar(estudiantesData.filter(e =>
        !estudiantesSeccion.some(inscrito => inscrito.id === e.id)
      ));
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const inscribirEstudiante = async () => {
    if (!seccionSeleccionada || !estudianteSeleccionado) return;
    setInscribiendo(true);
    try {
      await administrativoService.inscribirEstudiante({
        estudiante_id: estudianteSeleccionado.id,
        seccion_id: seccionSeleccionada.id
      });
      setNotif({ show: true, type: 'success', message: 'Estudiante inscrito exitosamente' });
      setModalInscribir(false);
      setEstudianteSeleccionado(null);
      setEstudianteBuscar('');
      setResultadosBuscar([]);
      fetchEstudiantesSeccion();
    } catch (error) {
      setNotif({ show: true, type: 'error', message: error.response?.data?.detail || 'Error al inscribir' });
    } finally {
      setInscribiendo(false);
    }
  };

  const openModalInscribir = async () => {
    setModalInscribir(true);
    setEstudianteSeleccionado(null);
    setEstudianteBuscar('');
    await buscarEstudiantes('');
  };

  // ✅ FIX: variable filtrados que faltaba — causaba la línea roja en VSCode
  const filtrados = busqueda.trim()
    ? estudiantesSeccion.filter(e =>
        (e.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.cedula || '').includes(busqueda)
      )
    : estudiantesSeccion;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Inscripciones</h1>
        <p className="text-sm text-slate-500">Gestión de inscripciones por sección</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={periodoFiltro}
          onChange={(e) => setPeriodoFiltro(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Todos los períodos</option>
          {periodos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <select
          value={carreraFiltro}
          onChange={(e) => setCarreraFiltro(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Layout: Lista de Secciones + Estudiantes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Secciones */}
        <div className="bg-slate-50 rounded-xl p-4 h-fit">
          <h2 className="text-sm font-black uppercase text-slate-500 mb-3 px-2">Secciones ({secciones.length})</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {secciones.length > 0 ? (
              secciones.map(seccion => (
                <SeccionItem
                  key={seccion.id}
                  seccion={seccion}
                  seleccionado={seccionSeleccionada?.id === seccion.id}
                  onClick={setSeccionSeleccionada}
                  estudiantesCount={seccion.cupo_actual || 0}
                />
              ))
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">No hay secciones</p>
            )}
          </div>
        </div>

        {/* Estudiantes de la Sección */}
        <div className="lg:col-span-2">
          {seccionSeleccionada ? (
            <div className="space-y-4">
              <div className="bg-indigo-600 rounded-xl p-6 text-white">
                <h2 className="text-lg font-black uppercase">
                  {seccionSeleccionada.materia}
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {seccionSeleccionada.codigo} • {seccionSeleccionada.docente || 'Sin docente'} 
                  {seccionSeleccionada.horario && ` • ${seccionSeleccionada.horario}`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {filtrados.length} estudiantes
                  </span>
                  <span className="text-emerald-500">
                    {filtrados.filter(e => e.nota_final >= 7).length} aprobados
                  </span>
                  <span className="text-rose-500">
                    {filtrados.filter(e => e.nota_final && e.nota_final < 7).length} reprobados
                  </span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full sm:w-40 pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => openModalInscribir()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={16} />
                    Inscribir
                  </button>
                </div>
              </div>

              {loadingEstudiantes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : filtrados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtrados.map(est => (
                    <EstudianteCard
                      key={est.id}
                      estudiante={est}
                      onVerDetalle={() => {}}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Users size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-400">No hay estudiantes inscritos</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-xl h-full flex flex-col items-center justify-center">
              <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-sm text-slate-400">Selecciona una sección para ver estudiantes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Inscribir */}
      {modalInscribir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModalInscribir(false)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <button 
              onClick={() => setModalInscribir(false)}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-black text-slate-900 mb-4">Inscribir Estudiante</h2>
            <p className="text-xs text-slate-500 mb-4">
              {seccionSeleccionada.materia} - Cupo: {seccionSeleccionada.cupo_actual}/{seccionSeleccionada.cupo_maximo}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar Estudiante</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={estudianteBuscar}
                    onChange={(e) => buscarEstudiantes(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nombre o cédula..."
                  />
                </div>
                {resultadosBuscar.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    {resultadosBuscar.map((est) => (
                      <button
                        key={est.id}
                        onClick={() => {
                          setEstudianteSeleccionado(est);
                          setEstudianteBuscar(est.nombre_completo || est.nombre);
                          setResultadosBuscar([]);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                          estudianteSeleccionado?.id === est.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <p className="font-medium text-slate-800 text-sm">{est.nombre_completo || est.nombre}</p>
                        <p className="text-xs text-slate-400">{est.cedula}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={inscribirEstudiante}
              disabled={inscribiendo || !estudianteSeleccionado}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {inscribiendo ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Inscribir'}
            </button>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notif.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl text-sm font-bold ${
          notif.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notif.message}
          <button onClick={() => setNotif({ ...notif, show: false })} className="ml-2">✕</button>
        </div>
      )}
    </div>
  );
};

export default InscripcionesPage;