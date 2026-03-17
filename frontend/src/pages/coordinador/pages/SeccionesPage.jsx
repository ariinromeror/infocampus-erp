import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Calendar, GraduationCap } from 'lucide-react';
import useSecciones from '../hooks/useSecciones';
import SeccionRow from '../components/SeccionRow';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import { academicoService } from '../../../services/academicoService';

const SeccionesPage = () => {
  const { secciones, loading, crearSeccion, actualizarSeccion, fetchSecciones } = useSecciones();
  const [busqueda, setBusqueda] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [carreraFiltro, setCarreraFiltro] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    materia_id: '',
    periodo_id: '',
    profesor_id: '',
    aula: '',
    horario: '',
   cupo: 30,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = {};
    if (periodoFiltro) params.periodo_id = parseInt(periodoFiltro);
    if (carreraFiltro) params.carrera_id = parseInt(carreraFiltro);
    fetchSecciones(params);
  }, [periodoFiltro, carreraFiltro]);

  const fetchData = async () => {
    try {
      const [periodosRes, carrerasRes, materiasRes, profesoresRes] = await Promise.all([
        academicoService.getPeriodos(),
        academicoService.getCarreras(),
        academicoService.getMaterias(),
        academicoService.getProfesores()
      ]);
      setPeriodos(periodosRes.data?.data?.periodos || periodosRes.data?.periodos || []);
      setCarreras(carrerasRes.data?.data?.carreras || carrerasRes.data?.carreras || []);
      setMaterias(materiasRes.data?.data?.materias || materiasRes.data?.materias || []);
      setProfesores(profesoresRes.data?.data?.profesores || profesoresRes.data?.profesores || []);
      
      const periodoActivo = (periodosRes.data?.data?.periodos || periodosRes.data?.periodos || []).find(p => p.activo);
      if (periodoActivo) {
        setPeriodoFiltro(periodoActivo.id.toString());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return secciones;
    const q = busqueda.toLowerCase();
    return secciones.filter(s =>
      (s.materia_nombre || s.materia?.nombre || '').toLowerCase().includes(q) ||
      (s.profesor || s.profesor?.nombre || '').toLowerCase().includes(q) ||
      (s.codigo || s.materia?.codigo || '').toLowerCase().includes(q)
    );
  }, [secciones, busqueda]);

  const handleOpenModal = (seccion = null) => {
    if (seccion) {
      setEditando(seccion);
      setForm({
        materia_id: seccion.materia_id || '',
        periodo_id: seccion.periodo_id || '',
        profesor_id: seccion.docente_id || seccion.profesor_id || '',
        aula: seccion.aula || '',
        horario: seccion.horario || '',
        cupo: seccion.cupo_maximo || 30,
      });
    } else {
      setEditando(null);
      setForm({ materia_id: '', periodo_id: periodoFiltro || '', profesor_id: '', aula: '', horario: '', cupo: 30 });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        materia_id: parseInt(form.materia_id),
        periodo_id: parseInt(form.periodo_id),
        profesor_id: form.profesor_id ? parseInt(form.profesor_id) : null,
        cupo: parseInt(form.cupo)
      };
      if (editando) {
        await actualizarSeccion(editando.id, data);
      } else {
        await crearSeccion(data);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-800">Secciones</h1>
        <p className="text-sm text-slate-500">Gestión de secciones del período</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar..." />
        </div>
        <div className="flex gap-2">
          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Período</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <select
            value={carreraFiltro}
            onChange={(e) => setCarreraFiltro(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Carrera</option>
            {carreras.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex-shrink-0"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {loading ? 'Cargando...' : `${secciones.length} secciones`}
      </p>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtrados.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {filtrados.map(seccion => (
            <SeccionRow
              key={seccion.id}
              seccion={seccion}
              onEdit={() => handleOpenModal(seccion)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl">
          <EmptyState icon={BookOpen} titulo="Sin secciones" descripcion="No hay secciones que coincidan con los filtros" />
        </div>
      )}

      <ModalForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Sección' : 'Nueva Sección'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Materia</label>
              <select
                value={form.materia_id}
                onChange={(e) => setForm({ ...form, materia_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Seleccionar materia</option>
                {materias.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Período</label>
              <select
                value={form.periodo_id}
                onChange={(e) => setForm({ ...form, periodo_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Seleccionar período</option>
                {periodos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Profesor</label>
              <select
                value={form.profesor_id}
                onChange={(e) => setForm({ ...form, profesor_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Sin asignar</option>
                {profesores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Cupo</label>
              <input
                type="number"
                value={form.cupo}
                onChange={(e) => setForm({ ...form, cupo: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Aula</label>
              <input
                type="text"
                value={form.aula}
                onChange={(e) => setForm({ ...form, aula: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Aula 101"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Horario</label>
              <input
                type="text"
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Lun 08:00-10:00"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-slate-500 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
            >
              {editando ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </ModalForm>
    </div>
  );
};

export default SeccionesPage;