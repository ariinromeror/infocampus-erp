import { useState, useEffect } from 'react';
import { Calendar, Loader2, Plus, X, BookOpen } from 'lucide-react';
import { tesoreroService } from '../../../services/tesoreroService';
import { academicoService } from '../../../services/academicoService';

const PeriodosPage = () => {
  const [loading, setLoading] = useState(true);
  const [periodos, setPeriodos] = useState([]);
  const [modalCrear, setModalCrear] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
  const [detallePeriodo, setDetallePeriodo] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '', activo: false });
  const [notif, setNotif] = useState({ show: false, type: 'success', message: '' });

  const showNotif = (type, message) => {
    setNotif({ show: true, type, message });
    setTimeout(() => setNotif(n => ({ ...n, show: false })), 3000);
  };

  useEffect(() => { fetchPeriodos(); }, []);

  const fetchPeriodos = async () => {
    try {
      const res = await tesoreroService.getPeriodos();
      setPeriodos(res.data?.data?.periodos || res.data?.periodos || []);
    } catch (error) {
      console.error('Error fetching periodos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async () => {
    if (!form.nombre || !form.codigo) return;
    setGuardando(true);
    try {
      await academicoService.createPeriodo(form);
      setModalCrear(false);
      setForm({ nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '', activo: false });
      showNotif('success', 'Período creado exitosamente');
      fetchPeriodos();
    } catch (error) {
      showNotif('error', 'Error al crear período');
    } finally {
      setGuardando(false);
    }
  };

  const handleActivar = async (periodoId) => {
    try {
      await academicoService.updatePeriodo(periodoId, { activo: true });
      showNotif('success', 'Período activado');
      fetchPeriodos();
    } catch (error) {
      showNotif('error', 'Error al activar período');
    }
  };

  const verDetalle = async (periodo) => {
    setPeriodoSeleccionado(periodo);
    setLoadingDetalle(true);
    try {
      const [seccionesRes, estudiantesRes] = await Promise.all([
        academicoService.getSecciones({ periodo_id: periodo.id }),
        academicoService.getEstudiantes({ limit: 1000 })
      ]);
      const secciones = seccionesRes.data?.data?.secciones || seccionesRes.data?.secciones || [];
      const estudiantes = estudiantesRes.data?.data?.estudiantes || estudiantesRes.data?.estudiantes || [];
      setDetallePeriodo({
        secciones,
        totalEstudiantes: estudiantes.length,
        carrerasUnicas: [...new Set(secciones.map(s => s.carrera_id).filter(Boolean))]
      });
    } catch (error) {
      console.error('Error fetching detalle:', error);
      setDetallePeriodo({ secciones: [], totalEstudiantes: 0, carrerasUnicas: [] });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Períodos Lectivos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de períodos académicos</p>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          Nuevo Período
        </button>
      </div>

      <div className="grid gap-4">
        {periodos.map((periodo) => (
          <div
            key={periodo.id}
            onClick={() => verDetalle(periodo)}
            className={`w-full cursor-pointer bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all ${
              periodo.activo ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  periodo.activo ? 'bg-indigo-100' : 'bg-slate-100'
                }`}>
                  <Calendar className={periodo.activo ? 'text-indigo-600' : 'text-slate-400'} size={24} />
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h3 className="text-base font-black uppercase italic text-slate-900 truncate">{periodo.nombre}</h3>
                    {periodo.activo && (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{periodo.codigo}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-slate-400">
                    <span>Inicio: {periodo.fecha_inicio}</span>
                    <span>Fin: {periodo.fecha_fin}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 pl-16 sm:pl-0">
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900">{periodo.total_secciones}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">secciones</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900">{periodo.total_inscripciones}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">inscripciones</p>
                </div>
                {!periodo.activo && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleActivar(periodo.id); }}
                    className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    Activar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {periodos.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-2xl">
          <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No hay períodos registrados</p>
        </div>
      )}

      {/* Modal Crear */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalCrear(false)} />
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <button onClick={() => setModalCrear(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 rounded-xl">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black italic uppercase text-slate-900 mb-6">Nuevo Período</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Período 2025-1"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Código</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: 2025-1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fecha Inicio</label>
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fecha Fin</label>
                  <input
                    type="date"
                    value={form.fecha_fin}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="activo" className="text-xs font-medium text-slate-700">
                  Activar período inmediatamente
                </label>
              </div>
            </div>
            <button
              onClick={handleCrear}
              disabled={guardando || !form.nombre || !form.codigo}
              className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50"
            >
              {guardando ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Crear Período'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {notif.show && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider z-50 ${
          notif.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notif.message}
          <button onClick={() => setNotif(n => ({ ...n, show: false }))} className="ml-2">✕</button>
        </div>
      )}

      {/* Modal Detalle */}
      {periodoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPeriodoSeleccionado(null)} />
          <div className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl my-8">
            <button
              onClick={() => setPeriodoSeleccionado(null)}
              className="absolute top-4 right-4 z-10 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full bg-slate-100"
            >
              <X size={24} />
            </button>
            <div className="mb-6 pr-12">
              <div className="flex items-center flex-wrap gap-3 mb-2">
                <h2 className="text-2xl font-black italic uppercase text-slate-900">{periodoSeleccionado.nombre}</h2>
                {periodoSeleccionado.activo && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">ACTIVO</span>
                )}
              </div>
              <p className="text-sm text-slate-500">{periodoSeleccionado.codigo}</p>
              <p className="text-xs text-slate-400 mt-1">{periodoSeleccionado.fecha_inicio} - {periodoSeleccionado.fecha_fin}</p>
            </div>

            {loadingDetalle ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-indigo-600">{detallePeriodo?.secciones?.length || 0}</p>
                  <p className="text-[10px] text-indigo-400 uppercase tracking-wider">Secciones</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{detallePeriodo?.totalEstudiantes || 0}</p>
                  <p className="text-[10px] text-emerald-400 uppercase tracking-wider">Estudiantes</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-amber-600">{detallePeriodo?.carrerasUnicas?.length || 0}</p>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider">Carreras</p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-rose-600">
                    {detallePeriodo?.secciones?.reduce((acc, s) => acc + (s.cupo_actual || 0), 0) || 0}
                  </p>
                  <p className="text-[10px] text-rose-400 uppercase tracking-wider">Inscripciones</p>
                </div>
              </div>
            )}

            <p className="text-sm font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
              <BookOpen size={18} />
              Secciones del Período
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {detallePeriodo?.secciones?.length > 0 ? (
                detallePeriodo.secciones.map((seccion) => (
                  <div key={seccion.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{seccion.materia}</p>
                      <p className="text-xs text-slate-500">{seccion.docente || 'Sin docente'}</p>
                    </div>
                    <p className="text-xs font-medium text-indigo-600 flex-shrink-0">{seccion.cupo_actual || 0}/{seccion.cupo_maximo}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 p-4 bg-slate-50 rounded-xl">No hay secciones en este período</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodosPage;