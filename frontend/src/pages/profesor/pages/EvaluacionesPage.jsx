import { useState } from 'react';
import useSecciones from '../hooks/useSecciones';
import useSeccionAlumnos from '../hooks/useSeccionAlumnos';
import useEvaluaciones from '../hooks/useEvaluaciones';
import SeccionSelector from '../components/SeccionSelector';

const TIPOS_EVAL = [
  { label: 'Parcial 1',    value: 'parcial_1' },
  { label: 'Parcial 2',    value: 'parcial_2' },
  { label: 'Talleres',     value: 'talleres' },
  { label: 'Examen Final', value: 'examen_final' },
];

const tipoLabel = (val) => TIPOS_EVAL.find(t => t.value === val)?.label || val;

const EvaluacionesPage = () => {
  const { secciones, loading: loadingSec } = useSecciones();
  const [seccionId, setSeccionId] = useState('');
  const { alumnos, loading: loadingAlumnos } = useSeccionAlumnos(seccionId);
  const { evaluaciones, loading: loadingEval, registrarEvaluacion } = useEvaluaciones(seccionId);

  const [form, setForm] = useState({ inscripcion_id: '', tipo_evaluacion: '', nota: '', peso_porcentual: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all";

  const handleSubmit = async () => {
    const { inscripcion_id, tipo_evaluacion, nota, peso_porcentual } = form;
    if (!inscripcion_id || !tipo_evaluacion || nota === '' || peso_porcentual === '') {
      setError('Todos los campos son requeridos');
      return;
    }
    const n = parseFloat(nota);
    if (n < 0 || n > 20) { setError('La nota debe estar entre 0 y 20'); return; }
    
    try {
      setSaving(true); setError(null);
      await registrarEvaluacion({
        inscripcion_id: parseInt(inscripcion_id),
        tipo_evaluacion,
        nota: n,
        peso_porcentual: parseFloat(peso_porcentual),
      });
      setForm({ ...form, nota: '', inscripcion_id: '' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Error al registrar la evaluación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER (IDÉNTICO A SECCIONES PAGE) */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Evaluaciones</h1>
        <p className="text-sm text-slate-500 mt-1">Registro de notas parciales por sección</p>
      </div>

      {/* 2. SELECTOR (CAPA SUPERIOR - NO EMPUJA EL CONTENIDO) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative z-[60]">
        <label className="text-sm font-medium text-slate-600 block mb-2">Sección</label>
        <div className="relative">
          <SeccionSelector
            secciones={secciones}
            loading={loadingSec}
            value={seccionId}
            onChange={(id) => setSeccionId(String(id))}
          />
        </div>
      </div>

      {/* 3. CONTENIDO DINÁMICO */}
      {seccionId && (
        <div className="space-y-6 animate-in fade-in duration-500 relative z-10">
          
          {/* FORMULARIO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-700 mb-6">Nueva Evaluación</h2>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium">{error}</div>}
            {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100 font-medium">✓ Evaluación guardada</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Alumno</label>
                <select
                  value={form.inscripcion_id}
                  onChange={e => setForm(p => ({ ...p, inscripcion_id: e.target.value }))}
                  className={inputCls}
                  disabled={loadingAlumnos}
                >
                  <option value="">Seleccionar alumno</option>
                  {alumnos.map(a => <option key={a.inscripcion_id} value={a.inscripcion_id}>{a.nombre}</option>)}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Tipo de Evaluación</label>
                <select
                  value={form.tipo_evaluacion}
                  onChange={e => setForm(p => ({ ...p, tipo_evaluacion: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccionar tipo</option>
                  {TIPOS_EVAL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Nota (0 – 20)</label>
                <input
                  type="number" step="0.01" placeholder="Ej: 15.5"
                  value={form.nota}
                  onChange={e => setForm(p => ({ ...p, nota: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Peso %</label>
                <input
                  type="number" placeholder="Ej: 25"
                  value={form.peso_porcentual}
                  onChange={e => setForm(p => ({ ...p, peso_porcentual: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Registrar Evaluación'}
              </button>
            </div>
          </div>

          {/* TABLA HISTORIAL */}
          {!loadingEval && evaluaciones.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Evaluaciones Registradas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                      <th className="text-left px-6 py-4">Alumno</th>
                      <th className="text-left px-6 py-4">Tipo</th>
                      <th className="text-center px-6 py-4">Nota</th>
                      <th className="text-center px-6 py-4">Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluaciones.flatMap(est =>
                      (est.evaluaciones || []).map((ev, i) => (
                        <tr key={`${est.inscripcion_id}-${i}`} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800">{est.nombre}</td>
                          <td className="px-6 py-4 text-slate-500">{tipoLabel(ev.tipo)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold ${parseFloat(ev.nota) >= 7 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {parseFloat(ev.nota).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-400 font-medium">{ev.peso}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EvaluacionesPage;