import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, X } from 'lucide-react';
import useSecciones from '../../director/hooks/useSecciones';
import ModalForm from '../components/ModalForm';
import SeccionRow from '../../director/components/SeccionRow';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import LibroCalificacionesModal from '../components/LibroCalificacionesModal';
import { academicoService } from '../../../services/academicoService';

const SeccionesPage = () => {
  const { secciones, loading, error, crearSeccion, actualizarSeccion } = useSecciones();

  const [busqueda,     setBusqueda]     = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [materias,     setMaterias]     = useState([]);
  const [periodos,     setPeriodos]     = useState([]);
  const [profesores,   setProfesores]   = useState([]);
  const [libroOpen,    setLibroOpen]    = useState(false);
  const [libroSeccion, setLibroSeccion] = useState(null);
  const [form, setForm] = useState({ materia_id: '', periodo_id: '', profesor_id: '', aula: '', cupo: 30 });

  useEffect(() => {
    Promise.allSettled([
      academicoService.getMaterias(),
      academicoService.getPeriodos(),
      academicoService.getProfesores(),
    ]).then(([rm, rp, rpf]) => {
      if (rm.status  === 'fulfilled') {
        const d = rm.value.data;
        setMaterias(d?.data?.materias || d?.data || d || []);
      }
      if (rp.status  === 'fulfilled') {
        const d = rp.value.data;
        setPeriodos(d?.data?.periodos || d?.data || d || []);
      }
      if (rpf.status === 'fulfilled') {
        const d = rpf.value.data;
        setProfesores(d?.data?.profesores || d?.data || d || []);
      }
    });
  }, []);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return secciones;
    const q = busqueda.toLowerCase();
    return secciones.filter(s =>
      (s.materia_nombre || s.materia?.nombre || '').toLowerCase().includes(q) ||
      (s.profesor_nombre || s.profesor?.nombre || '').toLowerCase().includes(q) ||
      (s.codigo || s.materia?.codigo || '').toLowerCase().includes(q)
    );
  }, [secciones, busqueda]);

  const handleOpen = (sec = null) => {
    if (sec) {
      setEditando(sec);
      setForm({ materia_id: sec.materia_id || '', periodo_id: sec.periodo_id || '', profesor_id: sec.profesor_id || '', aula: sec.aula || '', cupo: sec.cupo || 30 });
    } else {
      setEditando(null);
      setForm({ materia_id: '', periodo_id: '', profesor_id: '', aula: '', cupo: 30 });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editando ? await actualizarSeccion(editando.id, form) : await crearSeccion(form);
      setModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleVerLibro = (sec) => {
    setLibroSeccion(sec);
    setLibroOpen(true);
  };

  // Extend SeccionRow with libro button
  const SeccionRowConLibro = ({ seccion }) => (
    <div className="flex items-center border-b border-slate-50 last:border-0">
      <div className="flex-1">
        <SeccionRow seccion={seccion} onEdit={() => handleOpen(seccion)} />
      </div>
      <button
        onClick={() => handleVerLibro(seccion)}
        className="flex items-center gap-1.5 mr-5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wide hover:bg-indigo-600 transition-colors flex-shrink-0"
      >
        <BookOpen size={11} /> Libro
      </button>
    </div>
  );

  const selectCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
  const inputCls  = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-7">
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 text-sm text-rose-700 font-bold">
          Error al cargar secciones: {error}
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Secciones</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
              {loading ? 'Cargando...' : `${secciones.length} secciones registradas`}
            </p>
          </div>
          <button onClick={() => handleOpen()}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors flex-shrink-0">
            <Plus size={16} /> Nueva Sección
          </button>
        </div>
      </motion.div>

      <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por materia, profesor o código..." />

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtrados.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {filtrados.map(sec => <SeccionRowConLibro key={sec.id} seccion={sec} />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl">
          <EmptyState icon={BookOpen} titulo="Sin secciones" descripcion="No hay secciones que coincidan con la búsqueda" />
        </div>
      )}

      {/* Modal crear/editar — usa ModalForm existente */}
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar Sección' : 'Nueva Sección'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Materia</label>
            <select value={form.materia_id} onChange={e => setForm(p => ({ ...p, materia_id: e.target.value }))} className={selectCls} required>
              <option value="">Seleccionar materia</option>
              {Array.isArray(materias) && materias.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} {m.codigo ? `(${m.codigo})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Período</label>
            <select value={form.periodo_id} onChange={e => setForm(p => ({ ...p, periodo_id: e.target.value }))} className={selectCls} required>
              <option value="">Seleccionar período</option>
              {Array.isArray(periodos) && periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}{p.activo ? ' (Activo)' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Profesor</label>
            <select value={form.profesor_id} onChange={e => setForm(p => ({ ...p, profesor_id: e.target.value }))} className={selectCls}>
              <option value="">Sin asignar</option>
              {Array.isArray(profesores) && profesores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre || p.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Aula</label>
              <input type="text" value={form.aula} onChange={e => setForm(p => ({ ...p, aula: e.target.value }))} placeholder="Ej: Lab-3" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Cupo</label>
              <input type="number" value={form.cupo} onChange={e => setForm(p => ({ ...p, cupo: parseInt(e.target.value) || 30 }))} min="1" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
              {editando ? 'Guardar Cambios' : 'Crear Sección'}
            </button>
          </div>
        </form>
      </ModalForm>

      <LibroCalificacionesModal
        isOpen={libroOpen}
        onClose={() => { setLibroOpen(false); setLibroSeccion(null); }}
        seccion={libroSeccion}
        profesorId={libroSeccion?.profesor_id || libroSeccion?.docente_id}
      />
    </div>
  );
};

export default SeccionesPage;
