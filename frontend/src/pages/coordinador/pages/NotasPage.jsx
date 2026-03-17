import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import useNotas from '../hooks/useNotas';
import useSecciones from '../hooks/useSecciones';
import ModalForm from '../components/ModalForm';
import NotaRow from '../components/NotaRow';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';

const NotasPage = () => {
  const { secciones } = useSecciones();
  const { notas, loading, fetchNotas, corregirNota, clearNotas } = useNotas();
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [modalCorregir, setModalCorregir] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [motivo, setMotivo] = useState('');

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return notas;
    const q = busqueda.toLowerCase();
    return notas.filter(n =>
      (n.estudiante_nombre || n.nombre || '').toLowerCase().includes(q) ||
      (n.cedula || n.estudiante_cedula || '').includes(q)
    );
  }, [notas, busqueda]);

  const handleSelectSeccion = (seccion) => {
    setSeccionSeleccionada(seccion);
    fetchNotas(seccion.id);
  };

  const handleCorregir = async () => {
    if (!modalCorregir || nuevaNota === '') return;
    try {
      await corregirNota(modalCorregir.id || modalCorregir.inscripcion_id, {
        nota_final: parseFloat(nuevaNota),
        motivo: motivo || 'Corrección administrativa',
      });
      setModalCorregir(null);
      setNuevaNota('');
      setMotivo('');
      if (seccionSeleccionada) fetchNotas(seccionSeleccionada.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-7">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          <span>Gestión de</span>
          <span className="text-indigo-600"> Notas</span>
        </h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
          Ver y corregir calificaciones
        </p>
      </motion.div>

      {!seccionSeleccionada ? (
        <div className="space-y-4">
          <p className="text-sm font-bold text-slate-500">Selecciona una sección para ver las notas:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secciones.map(sec => (
              <button
                key={sec.id}
                onClick={() => handleSelectSeccion(sec)}
                className="bg-white border border-slate-100 rounded-xl p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <p className="text-sm font-black italic uppercase text-slate-900">
                  {sec.materia_nombre || sec.materia?.nombre}
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-1">
                  {sec.codigo || sec.materia?.codigo} · {sec.profesor_nombre || sec.profesor?.nombre || 'Sin docente'}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <button
                onClick={() => { setSeccionSeleccionada(null); clearNotas(); }}
                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 mb-2"
              >
                ← Volver a secciones
              </button>
              <h2 className="text-lg font-black italic uppercase text-slate-900">
                {seccionSeleccionada.materia_nombre || seccionSeleccionada.materia?.nombre}
              </h2>
              <p className="text-[10px] font-medium text-slate-400">
                {seccionSeleccionada.codigo || seccionSeleccionada.materia?.codigo}
              </p>
            </div>
            <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar estudiante..." />
          </div>

          {loading ? (
            <SkeletonTable rows={8} />
          ) : filtrados.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              {filtrados.map((nota, i) => (
                <NotaRow
                  key={nota.id || nota.inscripcion_id || i}
                  nota={nota}
                  onCorregir={(n) => {
                    setModalCorregir(n);
                    setNuevaNota(n.nota_final ?? n.nota ?? '');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-xl">
              <EmptyState icon={ClipboardList} titulo="Sin notas" descripcion="No hay estudiantes inscritos en esta sección" />
            </div>
          )}

          <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Las correcciones de notas quedan registradas en el historial con el motivo proporcionado.
            </p>
          </div>
        </>
      )}

      <ModalForm
        isOpen={!!modalCorregir}
        onClose={() => { setModalCorregir(null); setNuevaNota(''); setMotivo(''); }}
        title="Corregir Nota"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estudiante</p>
            <p className="text-sm font-bold text-slate-900">{modalCorregir?.estudiante_nombre || modalCorregir?.nombre}</p>
            <p className="text-[10px] text-slate-500 mt-1">Nota actual: {modalCorregir?.nota_final ?? modalCorregir?.nota ?? '—'}</p>
          </div>
          <div>
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
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Motivo de corrección</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Describe el motivo de esta corrección..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setModalCorregir(null); setNuevaNota(''); setMotivo(''); }}
              className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCorregir}
              disabled={nuevaNota === ''}
              className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Guardar Corrección
            </button>
          </div>
        </div>
      </ModalForm>
    </div>
  );
};

export default NotasPage;
