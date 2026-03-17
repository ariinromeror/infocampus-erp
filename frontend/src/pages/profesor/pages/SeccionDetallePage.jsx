import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock, AlertCircle } from 'lucide-react';
import useSeccionAlumnos from '../hooks/useSeccionAlumnos';
import useNotas from '../hooks/useNotas';
import useEvaluaciones from '../hooks/useEvaluaciones';

const TABS = [
  { key: 'alumnos',      label: 'Alumnos' },
  { key: 'notas',        label: 'Notas' },
  { key: 'evaluaciones', label: 'Evaluaciones' },
];

const TIPOS_EVAL = [
  { label: 'Parcial 1',    value: 'parcial_1' },
  { label: 'Parcial 2',    value: 'parcial_2' },
  { label: 'Talleres',     value: 'talleres' },
  { label: 'Examen Final', value: 'examen_final' },
];

const tipoLabel = (val) => TIPOS_EVAL.find(t => t.value === val)?.label || val;

const SeccionDetallePage = () => {
  const { seccionId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('alumnos');

  const { alumnos, loading: loadingA } = useSeccionAlumnos(seccionId);
  const { inscripciones, seccion, loading: loadingN, registrarNota } = useNotas(seccionId);
  const { evaluaciones, loading: loadingE, registrarEvaluacion } = useEvaluaciones(seccionId);

  const [notas, setNotas] = useState({});
  const [bloqueadas, setBloqueadas] = useState({});
  const [savingNota, setSavingNota] = useState(null);
  const [notaError, setNotaError] = useState(null);

  const [evalForm, setEvalForm] = useState({ inscripcion_id: '', tipo_evaluacion: '', nota: '', peso_porcentual: '' });
  const [savingEval, setSavingEval] = useState(false);
  const [evalError, setEvalError] = useState(null);
  const [evalSuccess, setEvalSuccess] = useState(false);

  const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all";

  const handleNota = async (inscripcionId) => {
    const valor = parseFloat(notas[inscripcionId]);
    if (isNaN(valor) || valor < 0 || valor > 20) { setNotaError('La nota debe estar entre 0 y 20'); return; }
    try {
      setSavingNota(inscripcionId); setNotaError(null);
      await registrarNota(inscripcionId, valor);
      setBloqueadas(p => ({ ...p, [inscripcionId]: true }));
      setNotas(p => ({ ...p, [inscripcionId]: '' }));
    } catch { setNotaError('Error al guardar la nota'); }
    finally { setSavingNota(null); }
  };

  const handleEval = async () => {
    const { inscripcion_id, tipo_evaluacion, nota, peso_porcentual } = evalForm;
    if (!inscripcion_id || !tipo_evaluacion || nota === '' || peso_porcentual === '') { setEvalError('Todos los campos son requeridos'); return; }
    try {
      setSavingEval(true); setEvalError(null);
      await registrarEvaluacion({
        inscripcion_id: parseInt(inscripcion_id),
        tipo_evaluacion,
        nota: parseFloat(nota),
        peso_porcentual: parseFloat(peso_porcentual),
      });
      setEvalForm({ inscripcion_id: '', tipo_evaluacion: '', nota: '', peso_porcentual: '' });
      setEvalSuccess(true); setTimeout(() => setEvalSuccess(false), 3000);
    } catch { setEvalError('Error al registrar evaluación'); }
    finally { setSavingEval(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/profesor/secciones')}
          className="mt-1 p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900 truncate">{seccion?.materia_nombre || 'Detalle de Sección'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{seccion?.codigo || `Sección #${seccionId}`}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit min-w-full sm:min-w-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      </div>

      {/* Tab: Alumnos */}
      {tab === 'alumnos' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Nombre</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 hidden sm:table-cell">Cédula</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">Nota Final</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingA
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">{[1,2,3,4].map(j => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded-full w-24" /></td>)}</tr>
                  ))
                  : alumnos.map(a => (
                    <tr key={a.inscripcion_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{a.nombre}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 hidden sm:table-cell">{a.cedula}</td>
                      <td className="px-5 py-3.5 text-center">
                        {a.nota_final != null
                          ? <span className={`text-sm font-bold ${parseFloat(a.nota_final) >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>{parseFloat(a.nota_final).toFixed(2)}</span>
                          : <span className="text-sm text-slate-400">Pendiente</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-sm font-semibold ${a.porcentaje_asistencia != null && a.porcentaje_asistencia < 75 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Notas */}
      {tab === 'notas' && (
        <div className="space-y-4">
          {notaError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={16} />
              {notaError}
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Lock size={15} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">Las notas finales solo se pueden registrar una vez y no se pueden editar después.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Alumno</th>
                    <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">Nota Actual</th>
                    <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">Registrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingN
                    ? Array.from({ length: 5 }).map((_, i) => <tr key={i} className="animate-pulse">{[1,2,3].map(j => <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded-full w-20 mx-auto" /></td>)}</tr>)
                    : inscripciones.map(insc => {
                      const bloqueada = bloqueadas[insc.inscripcion_id] || insc.nota_final != null;
                      return (
                        <tr key={insc.inscripcion_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-slate-800">{insc.estudiante_nombre}</p>
                            <p className="text-xs text-slate-400">{insc.estudiante_carnet}</p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {insc.nota_final != null
                              ? <span className={`text-sm font-bold ${parseFloat(insc.nota_final) >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>{parseFloat(insc.nota_final).toFixed(2)}</span>
                              : <span className="text-sm text-slate-400">Sin nota</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-2">
                              {bloqueada
                                ? <div className="flex items-center gap-2 text-slate-400"><Lock size={14} /><span className="text-xs font-medium">Registrada</span></div>
                                : <>
                                    <input
                                      type="number" min="0" max="20" step="0.01" placeholder="0–20"
                                      value={notas[insc.inscripcion_id] || ''}
                                      onChange={e => setNotas(p => ({ ...p, [insc.inscripcion_id]: e.target.value }))}
                                      className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all text-center"
                                    />
                                    <button
                                      onClick={() => handleNota(insc.inscripcion_id)}
                                      disabled={savingNota === insc.inscripcion_id}
                                      className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                      <Save size={15} />
                                    </button>
                                  </>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Evaluaciones */}
      {tab === 'evaluaciones' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-700">Registrar Evaluación</h2>
            {evalError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">{evalError}</div>}
            {evalSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">✓ Evaluación registrada con éxito</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Alumno</label>
                <select value={evalForm.inscripcion_id} onChange={e => setEvalForm(p => ({ ...p, inscripcion_id: e.target.value }))} className={inputCls}>
                  <option value="">Seleccionar alumno</option>
                  {inscripciones.map(i => <option key={i.inscripcion_id} value={i.inscripcion_id}>{i.estudiante_nombre}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Tipo</label>
                <select value={evalForm.tipo_evaluacion} onChange={e => setEvalForm(p => ({ ...p, tipo_evaluacion: e.target.value }))} className={inputCls}>
                  <option value="">Seleccionar tipo</option>
                  {TIPOS_EVAL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Nota (0 – 20)</label>
                <input type="number" min="0" max="20" step="0.01" placeholder="Ej: 15.50" value={evalForm.nota} onChange={e => setEvalForm(p => ({ ...p, nota: e.target.value }))} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Peso %</label>
                <input type="number" min="0" max="100" step="0.5" placeholder="Ej: 25" value={evalForm.peso_porcentual} onChange={e => setEvalForm(p => ({ ...p, peso_porcentual: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleEval} disabled={savingEval} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm">
                {savingEval ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>

          {!loadingE && evaluaciones.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Alumno</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Tipo</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">Nota</th>
                      <th className="text-center text-xs font-semibold text-slate-500 px-5 py-3">Peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluaciones.flatMap(est =>
                      (est.evaluaciones || []).map((ev, i) => (
                        <tr key={`${est.inscripcion_id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{est.nombre}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{tipoLabel(ev.tipo)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`text-sm font-bold ${parseFloat(ev.nota) >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>{parseFloat(ev.nota).toFixed(2)}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-sm text-slate-500">{ev.peso != null ? `${ev.peso}%` : '—'}</td>
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

export default SeccionDetallePage;
