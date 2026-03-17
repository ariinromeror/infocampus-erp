import { useState, useEffect, useMemo } from 'react';
import { Users, Loader2, GraduationCap, Mail, Calendar, Award, FileText, DollarSign, Edit3, X, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

const EstudianteCard = ({ estudiante, onClick }) => {
  const iniciales = (estudiante.nombre || 'E')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <button
      onClick={() => onClick(estudiante)}
      className="bg-white rounded-xl border border-slate-100 p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <span className="text-sm font-black text-indigo-600">{iniciales}</span>
        </div>
        {estudiante.es_becado && (
          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            BECA {estudiante.porcentaje_beca}%
          </span>
        )}
      </div>
      <h3 className="text-base font-black uppercase italic text-slate-900 mb-1 truncate">
        {estudiante.nombre}
      </h3>
      <p className="text-xs text-slate-500 mb-3">{estudiante.cedula}</p>
      <div className="flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <GraduationCap size={12} />
          {estudiante.carrera || 'Sin carrera'}
        </span>
      </div>
      {estudiante.promedio_acumulado !== null && (
        <div className="mt-3 flex items-center gap-1 text-[10px] text-indigo-600">
          <Award size={12} />
          Promedio: {estudiante.promedio_acumulado?.toFixed(1)}
        </div>
      )}
    </button>
  );
};

const DetalleEstudianteModal = ({ estudiante, onClose, onCorregirNota }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabActivo, setTabActivo] = useState('notas');
  const [modalCorregir, setModalCorregir] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    fetchDetalle();
  }, [estudiante.id]);

  const fetchDetalle = async () => {
    setLoading(true);
    try {
      const res = await academicoService.getEstudiante(estudiante.id);
      setDetalle(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCorregirNota = async () => {
    if (!modalCorregir || nuevaNota === '') return;
    try {
      await onCorregirNota(modalCorregir.id, {
        nota_final: parseFloat(nuevaNota),
        motivo: motivo || 'Corrección administrativa'
      });
      setModalCorregir(null);
      setNuevaNota('');
      setMotivo('');
      fetchDetalle();
    } catch (err) {
      console.error(err);
    }
  };

  if (!estudiante) return null;

  const iniciales = (detalle?.nombre_completo || estudiante.nombre_completo || 'E')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-4 overflow-y-auto lg:pl-72">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl my-4 min-h-0">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full bg-slate-100"
        >
          <X size={24} />
        </button>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : (
          <>
            {/* Header del estudiante */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <span className="text-xl font-black text-indigo-600">{iniciales}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black italic uppercase text-slate-900 truncate">
                  {detalle?.nombre_completo}
                </h2>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail size={12} /> {detalle?.email}
                  </span>
                  <span>{detalle?.cedula}</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    {detalle?.carrera_detalle?.nombre}
                  </span>
                  {detalle?.es_becado && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      Beca {detalle?.porcentaje_beca}%
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-black ${parseFloat(detalle?.deuda_total || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${detalle?.deuda_total || '0.00'}
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Deuda total</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {[
                { id: 'notas', label: 'Notas', icon: FileText },
                { id: 'historial', label: 'Historial', icon: TrendingUp },
                { id: 'pagos', label: 'Pagos', icon: DollarSign },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabActivo(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                    tabActivo === tab.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenido del tab */}
            <div className="flex-1 overflow-y-auto">
              {tabActivo === 'notas' && (
                <div className="space-y-3">
                  {detalle?.inscripciones?.length > 0 ? (
                    detalle.inscripciones.map(insc => (
                      <div key={insc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{insc.materia_nombre}</p>
                          <p className="text-[10px] text-slate-500">{insc.seccion} - {insc.periodo}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-lg font-black ${
                            insc.nota_final >= 7 ? 'text-emerald-500' : 
                            insc.nota_final ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {insc.nota_final?.toFixed(1) || '—'}
                          </div>
                          <button
                            onClick={() => {
                              setModalCorregir(insc);
                              setNuevaNota(insc.nota_final?.toString() || '');
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-8">Sin inscripciones</p>
                  )}
                </div>
              )}

              {tabActivo === 'historial' && (
                <div className="space-y-3">
                  {detalle?.inscripciones?.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-indigo-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-black text-indigo-600">
                            {detalle.inscripciones.filter(i => i.nota_final >= 7).length}
                          </p>
                          <p className="text-[10px] text-indigo-400 uppercase">Aprobadas</p>
                        </div>
                        <div className="bg-rose-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-black text-rose-600">
                            {detalle.inscripciones.filter(i => i.nota_final && i.nota_final < 7).length}
                          </p>
                          <p className="text-[10px] text-rose-400 uppercase">Reprobadas</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-black text-slate-600">
                            {detalle.inscripciones.length}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase">Total</p>
                        </div>
                      </div>
                      {detalle.inscripciones.map(insc => (
                        <div key={insc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            {insc.nota_final >= 7 ? (
                              <TrendingUp size={16} className="text-emerald-500" />
                            ) : (
                              <TrendingDown size={16} className="text-rose-500" />
                            )}
                            <div>
                              <p className="font-medium text-slate-800 text-xs">{insc.materia_nombre}</p>
                              <p className="text-[10px] text-slate-400">{insc.periodo}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${
                            insc.nota_final >= 7 ? 'text-emerald-600' : 
                            insc.nota_final ? 'text-rose-600' : 'text-slate-400'
                          }`}>
                            {insc.nota_final?.toFixed(1) || '—'}
                          </span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-center text-slate-400 py-8">Sin historial</p>
                  )}
                </div>
              )}

              {tabActivo === 'pagos' && (
                <div className="space-y-3">
                  {detalle?.inscripciones?.some(i => i.pagado) ? (
                    detalle.inscripciones.filter(i => i.pagado).map(insc => (
                      <div key={insc.id} className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{insc.materia_nombre}</p>
                          <p className="text-[10px] text-emerald-600">{insc.periodo}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                          PAGADO
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-8">No hay pagos registrados</p>
                  )}
                  {detalle?.inscripciones?.some(i => !i.pagado) && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mt-4">Pendientes</p>
                      {detalle.inscripciones.filter(i => !i.pagado).map(insc => (
                        <div key={insc.id} className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl">
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{insc.materia_nombre}</p>
                            <p className="text-[10px] text-rose-600">{insc.periodo}</p>
                          </div>
                          <span className="text-xs font-black text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                            PENDIENTE
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Corregir Nota */}
        {modalCorregir && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 lg:pl-72">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalCorregir(null)} />
            <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-black uppercase text-slate-900 mb-4">Corregir Nota</h3>
              <div className="p-4 bg-slate-50 rounded-xl mb-4">
                <p className="font-bold text-slate-800">{modalCorregir.materia_nombre}</p>
                <p className="text-xs text-slate-500">Nota actual: {modalCorregir.nota_final?.toFixed(1) || '—'}</p>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Nueva Nota</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Motivo</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Describe el motivo..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalCorregir(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-black uppercase bg-slate-100 text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCorregirNota}
                  className="flex-1 py-3 rounded-xl text-sm font-black uppercase bg-indigo-600 text-white"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EstudiantesPage = () => {
  const [loading, setLoading] = useState(true);
  const [estudiantes, setEstudiantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carreraFiltro, setCarreraFiltro] = useState('');
  const [carreras, setCarreras] = useState([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchEstudiantes();
  }, [carreraFiltro]);

  const fetchData = async () => {
    try {
      const res = await academicoService.getCarreras();
      setCarreras(res.data?.data?.carreras || res.data?.carreras || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchEstudiantes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (carreraFiltro) params.carrera_id = parseInt(carreraFiltro);
      const res = await academicoService.getEstudiantes(params);
      setEstudiantes(res.data?.data?.estudiantes || res.data?.estudiantes || []);
    } catch (error) {
      console.error('Error fetching estudiantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const corregirNota = async (inscripcionId, data) => {
    await academicoService.corregirNota(inscripcionId, data);
  };

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return estudiantes;
    const q = busqueda.toLowerCase();
    return estudiantes.filter(e =>
      (e.nombre || '').toLowerCase().includes(q) ||
      (e.cedula || '').includes(q) ||
      (e.carrera || '').toLowerCase().includes(q)
    );
  }, [estudiantes, busqueda]);

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Estudiantes</h1>
        <p className="text-sm text-slate-500">Lista de estudiantes - Click para ver detalle</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full px-3 py-2 pl-10 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Users size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
        <select
          value={carreraFiltro}
          onChange={(e) => setCarreraFiltro(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Carrera</option>
          {carreras.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {loading ? 'Cargando...' : `${filtrados.length} estudiantes`}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : filtrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtrados.map(estudiante => (
            <EstudianteCard
              key={estudiante.id}
              estudiante={estudiante}
              onClick={setEstudianteSeleccionado}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-2xl">
          <Users size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No hay estudiantes</p>
        </div>
      )}

      {estudianteSeleccionado && (
        <DetalleEstudianteModal
          estudiante={estudianteSeleccionado}
          onClose={() => setEstudianteSeleccionado(null)}
          onCorregirNota={corregirNota}
        />
      )}
    </div>
  );
};

export default EstudiantesPage;