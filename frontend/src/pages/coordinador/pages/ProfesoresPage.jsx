import { useState, useEffect } from 'react';
import { UserCog, Loader2, BookOpen, X, Clock, Users, Plus, Trash2, GripVertical } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DraggableSection = ({ seccion, onAsignar }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: seccion.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
    >
      <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600">
        <GripVertical size={16} />
      </button>
      <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <BookOpen size={16} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 text-sm truncate">{seccion.materia}</p>
        <p className="text-xs text-slate-500">{seccion.codigo} • {seccion.horario}</p>
      </div>
      <button
        onClick={() => onAsignar(seccion)}
        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 flex-shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

const ProfessorCard = ({ profesor, onClick, isSelected }) => {
  return (
    <button
      onClick={() => onClick(profesor)}
      className={`w-full text-left bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${
        isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <UserCog className="text-emerald-600" size={24} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{profesor.nombre}</p>
          <p className="text-xs text-slate-500 truncate">{profesor.email}</p>
        </div>
      </div>
    </button>
  );
};

const ProfesorPerfilModal = ({ profesor, detalle, loadingDetalle, onClose }) => {
  if (!profesor) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
        <div className="sticky top-0 bg-indigo-600 p-6 text-white z-10">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center">
              <UserCog size={28} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase">{profesor.nombre}</h2>
              <p className="text-indigo-200 text-xs truncate">{profesor.email}</p>
              <div className="flex gap-2 mt-2">
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
                  {detalle?.seccionesActuales?.length || 0} secciones
                </span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">
                  {detalle?.horasTotales || 0} hrs/sem
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Materias y horarios</h3>
          {loadingDetalle ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : detalle?.seccionesActuales?.length > 0 ? (
            <div className="space-y-2">
              {detalle.seccionesActuales.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 text-sm truncate">{s.materia}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {s.horario || 'Sin horario'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{s.inscritos ?? s.cupo_actual ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8 text-sm">Sin secciones asignadas</p>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfesoresPage = () => {
  const [loading, setLoading] = useState(true);
  const [profesores, setProfesores] = useState([]);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [tabActivo, setTabActivo] = useState('secciones');
  const [periodos, setPeriodos] = useState([]);
  const [periodoFiltro, setPeriodoFiltro] = useState(null);
  const [seccionesDisponibles, setSeccionesDisponibles] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [notif, setNotif] = useState({ show: false, type: 'success', message: '' });

  const showNotif = (type, message) => {
    setNotif({ show: true, type, message });
    setTimeout(() => setNotif(n => ({ ...n, show: false })), 3000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profRes, perRes, carRes] = await Promise.all([
        academicoService.getProfesores(),
        academicoService.getPeriodos(),
        academicoService.getCarreras()
      ]);
      setProfesores(profRes.data?.data?.profesores || profRes.data?.profesores || []);
      const periodosData = perRes.data?.data?.periodos || perRes.data?.periodos || [];
      setPeriodos(periodosData);
      setCarreras(carRes.data?.data?.carreras || carRes.data?.carreras || []);
      
      const activo = periodosData.find(p => p.activo);
      if (activo) setPeriodoFiltro(activo.id);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (profesor) => {
    setProfesorSeleccionado(profesor);
    setLoadingDetalle(true);
    setTabActivo('asignar');
    try {
      const [rendRes, seccionesRes] = await Promise.all([
        academicoService.getRendimientoProfesor(profesor.id).catch(() => ({ data: {} })),
        academicoService.getProfesorSecciones(profesor.id).catch(() => ({ data: { data: { secciones: [] } } }))
      ]);
      
      const rendimiento = rendRes.data || {};
      const secciones = seccionesRes.data?.data?.secciones || seccionesRes.data?.secciones || [];
      const horasTotales = calcularHorasTotales(secciones);
      
      setDetalle({
        rendimiento,
        secciones,
        horasTotales,
        seccionesActuales: secciones
      });
    } catch (error) {
      console.error('Error fetching detalle:', error);
      setDetalle({ secciones: [], horasTotales: 0, seccionesActuales: [] });
    } finally {
      setLoadingDetalle(false);
    }
  };

  const calcularHorasTotales = (secciones) => {
    return secciones.reduce((total, s) => {
      if (s.hora_inicio && s.hora_fin && s.dias) {
        const inicio = parseInt(s.hora_inicio.split(':')[0]);
        const fin = parseInt(s.hora_fin.split(':')[0]);
        const dias = s.dias?.length || 0;
        total += (fin - inicio) * dias;
      }
      return total;
    }, 0);
  };

  const fetchSeccionesDisponibles = async () => {
    if (!periodoFiltro) return;
    try {
      const res = await academicoService.getSecciones({ periodo_id: periodoFiltro });
      const secciones = res.data?.data?.secciones || res.data?.secciones || [];
      const sinProfesor = secciones.filter(s => !s.docente_id);
      setSeccionesDisponibles(sinProfesor);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (periodoFiltro) {
      fetchSeccionesDisponibles();
    }
  }, [periodoFiltro]);

  const handleAsignarSeccion = async (seccion) => {
    if (!profesorSeleccionado) {
      showNotif('error', 'Selecciona un profesor primero');
      return;
    }
    try {
      await academicoService.asignarProfesor(seccion.id, { docente_id: profesorSeleccionado.id });
      showNotif('success', `"${seccion.materia}" asignada a ${profesorSeleccionado.nombre}`);
      fetchSeccionesDisponibles();
      verDetalle(profesorSeleccionado);
    } catch (error) {
      console.error('Error asignando:', error);
      showNotif('error', 'Error al asignar sección');
    }
  };

  const handleDesasignarSeccion = async (seccion) => {
    try {
      await academicoService.asignarProfesor(seccion.id, { docente_id: null });
      showNotif('success', `"${seccion.materia}" desasignada`);
      fetchSeccionesDisponibles();
      verDetalle(profesorSeleccionado);
    } catch (error) {
      console.error('Error desasignando:', error);
      showNotif('error', 'Error al desasignar sección');
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!profesorSeleccionado) {
      showNotif('error', 'Selecciona un profesor primero');
      return;
    }

    if (over && active.id !== over.id) {
      const seccion = seccionesDisponibles.find(s => s.id === active.id);
      if (seccion) {
        handleAsignarSeccion(seccion);
      }
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
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Profesores</h1>
        <p className="text-sm text-slate-500">Arrastra secciones hacia un profesor para asignarle materias</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 overflow-x-auto pb-2">
        <select
          value={periodoFiltro || ''}
          onChange={(e) => setPeriodoFiltro(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[180px]"
        >
          <option value="">Seleccionar período</option>
          {periodos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Profesores */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Profesores ({profesores.length})</h2>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
            {profesores.map((profesor) => (
              <ProfessorCard
                key={profesor.id}
                profesor={profesor}
                onClick={verDetalle}
                isSelected={profesorSeleccionado?.id === profesor.id}
              />
            ))}
          </div>
        </div>

        {/* Panel de Asignación */}
        <div className="lg:col-span-3">
          {!profesorSeleccionado ? (
            <div className="bg-slate-50 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <UserCog size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-400 font-medium">Selecciona un profesor para asignarle materias</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header del profesor */}
              <div className="bg-indigo-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <UserCog size={32} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black uppercase">{profesorSeleccionado.nombre}</h2>
                    <p className="text-indigo-200 text-sm">{profesorSeleccionado.email}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                        {detalle?.seccionesActuales?.length || 0} secciones
                      </span>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                        {detalle?.horasTotales || 0} hrs/semana
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secciones asignadas */}
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
                  Secciones Asignadas ({detalle?.seccionesActuales?.length || 0})
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {detalle?.seccionesActuales?.length > 0 ? (
                    detalle.seccionesActuales.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                        <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BookOpen size={16} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">{s.materia}</p>
                          <p className="text-xs text-slate-500">{s.horario}</p>
                        </div>
                        <button
                          onClick={() => handleDesasignarSeccion(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                          title="Desasignar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-4">No tiene secciones asignadas</p>
                  )}
                </div>
              </div>

              {/* Secciones disponibles para arrastrar */}
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
                  Arrastra hacia el profesor para asignar ({seccionesDisponibles.length})
                </h3>
                
                {periodoFiltro ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={seccionesDisponibles.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {seccionesDisponibles.length > 0 ? (
                          seccionesDisponibles.map((seccion) => (
                            <DraggableSection
                              key={seccion.id}
                              seccion={seccion}
                              onAsignar={handleAsignarSeccion}
                            />
                          ))
                        ) : (
                          <p className="text-center text-slate-400 py-4">No hay secciones disponibles</p>
                        )}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg">
                          {seccionesDisponibles.find(s => s.id === activeId)?.materia}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                ) : (
                  <p className="text-center text-slate-400 py-4">Selecciona un período</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal perfil profesor (móvil) */}
      {profesorSeleccionado && (
        <div className="lg:hidden">
          <ProfesorPerfilModal
            profesor={profesorSeleccionado}
            detalle={detalle}
            loadingDetalle={loadingDetalle}
            onClose={() => setProfesorSeleccionado(null)}
          />
        </div>
      )}

      {notif.show && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider z-50 ${
          notif.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notif.message}
        </div>
      )}
    </div>
  );
};

export default ProfesoresPage;