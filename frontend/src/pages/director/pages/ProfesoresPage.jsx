import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Users, Plus, X, Loader2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProfesores from '../hooks/useProfesores';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import LibroCalificacionesModal from '../components/LibroCalificacionesModal';
import ModalForm from '../components/ModalForm';
import NotifModal from '../components/NotifModal';
import { academicoService } from '../../../services/academicoService';

const ProfesorRow = ({ profesor, onClick, onRendimiento }) => {
  const nombre   = profesor.nombre || profesor.nombre_completo || '—';
  const secciones = profesor.secciones_activas ?? profesor.secciones_count ?? 0;
  const cargaColor = secciones >= 4 ? 'text-rose-600 bg-rose-50' : secciones >= 2 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
      <button onClick={() => onClick(profesor)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
        <div className="h-11 w-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black italic uppercase text-slate-900 truncate">{nombre}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400">{profesor.titulo || 'Sin título'}</span>
            {profesor.especialidad && (
              <><span className="text-[11px] text-slate-400">|</span>
              <span className="text-[10px] font-bold text-slate-500">{profesor.especialidad}</span></>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl flex-shrink-0 ${cargaColor}`}>
          {secciones} secc.
        </span>
      </button>
      <button
        onClick={() => onRendimiento(profesor)}
        title="Ver rendimiento"
        className="p-2 rounded-xl hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-colors flex-shrink-0"
      >
        <TrendingUp size={16} />
      </button>
    </div>
  );
};

const ProfesoresPage = () => {
  const navigate  = useNavigate();
  const { profesores, loading, error, fetchProfesores, getSecciones } = useProfesores();

  const [busqueda,     setBusqueda]     = useState('');
  const [modalProf,    setModalProf]    = useState(null);
  const [detalle,      setDetalle]      = useState({ secciones: [], loading: false });
  const [libroOpen,    setLibroOpen]    = useState(false);
  const [libroSeccion, setLibroSeccion] = useState(null);
  const [nuevoOpen,    setNuevoOpen]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [notif,        setNotif]        = useState({ open: false, titulo: '', mensaje: '', tipo: 'success' });
  const [form,         setForm]         = useState({ nombre: '', email: '', username: '', password: '', titulo_academico: '', especialidad: '' });

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return profesores;
    const q = busqueda.toLowerCase();
    return profesores.filter(p =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.especialidad || '').toLowerCase().includes(q) ||
      (p.titulo || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }, [profesores, busqueda]);

  const handleVerDetalle = async (profesor) => {
    setModalProf(profesor);
    setDetalle({ secciones: [], loading: true });
    try {
      const raw      = await getSecciones(profesor.id);
      const secciones = Array.isArray(raw) ? raw : (raw?.secciones || []);
      setDetalle({ secciones, loading: false });
    } catch { setDetalle({ secciones: [], loading: false }); }
  };

  const handleVerLibro = (sec) => {
    setLibroSeccion({ ...sec, profesor_id: modalProf?.id });
    setLibroOpen(true);
  };

  const handleCrearProfesor = async () => {
    setSaving(true);
    try {
      await academicoService.crearUsuario({ ...form, rol: 'profesor', activo: true });
      setNuevoOpen(false);
      setForm({ nombre: '', email: '', username: '', password: '', titulo_academico: '', especialidad: '' });
      await fetchProfesores();
      setNotif({ open: true, titulo: 'Profesor Creado', mensaje: `${form.nombre} fue registrado exitosamente.`, tipo: 'success' });
    } catch (e) {
      setNotif({ open: true, titulo: 'Error', mensaje: e.response?.data?.detail || 'No se pudo crear el profesor.', tipo: 'error' });
    } finally { setSaving(false); }
  };

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300";

  return (
    <div className="space-y-7">
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 text-sm text-rose-700 font-bold">
          Error al cargar profesores: {error}
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Profesores</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
              {loading ? 'Cargando...' : `${profesores.length} profesores registrados`}
            </p>
          </div>
          <button onClick={() => setNuevoOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors flex-shrink-0">
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </motion.div>

      <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, título o especialidad..." />

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtrados.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {filtrados.map(prof => (
            <ProfesorRow key={prof.id} profesor={prof} onClick={handleVerDetalle} onRendimiento={p => navigate(`/director/profesores/${p.id}`)} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl">
          <EmptyState icon={GraduationCap} titulo="Sin profesores" descripcion="No hay profesores que coincidan con la búsqueda" />
        </div>
      )}

      {/* Modal detalle */}
      <ModalForm isOpen={!!modalProf} onClose={() => { setModalProf(null); setDetalle({ secciones: [], loading: false }); }} title={modalProf?.nombre || 'Profesor'} size="lg">
        {detalle.loading ? (
          <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Título',            value: modalProf?.titulo },
                { label: 'Especialidad',      value: modalProf?.especialidad },
                { label: 'Email',             value: modalProf?.email },
                { label: 'Secciones Activas', value: detalle.secciones.length },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{value || '—'}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setModalProf(null); navigate(`/director/profesores/${modalProf?.id}`); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-700 rounded-xl text-[10px] font-black uppercase hover:bg-violet-100 transition-colors"
            >
              <TrendingUp size={13} /> Ver Rendimiento Completo
            </button>

            {detalle.secciones.length > 0 && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Secciones ({detalle.secciones.length})</p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {detalle.secciones.map((sec, i) => {
                    const pct = sec.cupo ? Math.round(((sec.inscritos || 0) / sec.cupo) * 100) : 0;
                    return (
                      <div key={sec.id || i} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{sec.materia_nombre || sec.materia?.nombre}</p>
                            <p className="text-[10px] text-slate-400">{sec.codigo || sec.materia?.codigo} · {sec.periodo}</p>
                          </div>
                          <button onClick={() => handleVerLibro(sec)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors flex-shrink-0">
                            <BookOpen size={10} /> Libro
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Users size={10} />
                            <span className="font-bold">{sec.inscritos || 0}/{sec.cupo || '—'}</span>
                          </div>
                          {sec.aula && <span className="text-[10px] text-slate-400">{sec.aula}</span>}
                          {sec.cupo > 0 && (
                            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!detalle.loading && detalle.secciones.length === 0 && (
              <div className="py-8 text-center">
                <div className="flex flex-col items-center gap-2 opacity-30">
                  <BookOpen size={28} />
                  <p className="text-xs font-black uppercase">Sin secciones asignadas</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalForm>

      {/* Modal nuevo profesor */}
      {nuevoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setNuevoOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900">Nuevo Profesor</h3>
              <button onClick={() => !saving && setNuevoOpen(false)} className="p-2 text-slate-300 hover:text-slate-700 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Nombre completo', key: 'nombre',           type: 'text' },
                { label: 'Email',           key: 'email',            type: 'email' },
                { label: 'Cédula',          key: 'username',          type: 'text' },
                { label: 'Contraseña',      key: 'password',          type: 'password' },
                { label: 'Título Académico',key: 'titulo_academico',  type: 'text' },
                { label: 'Especialidad',    key: 'especialidad',      type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className={inputCls} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => !saving && setNuevoOpen(false)} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleCrearProfesor} disabled={saving || !form.nombre || !form.username} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : 'Crear Profesor'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LibroCalificacionesModal isOpen={libroOpen} onClose={() => { setLibroOpen(false); setLibroSeccion(null); }} seccion={libroSeccion} profesorId={libroSeccion?.profesor_id} />
      <NotifModal isOpen={notif.open} onClose={() => setNotif({ ...notif, open: false })} titulo={notif.titulo} mensaje={notif.mensaje} tipo={notif.tipo} />
    </div>
  );
};

export default ProfesoresPage;