import { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft, TrendingUp, TrendingDown, AlertTriangle, FileDown } from 'lucide-react';
import useSecciones from '../hooks/useSecciones';
import useSeccionAlumnos from '../hooks/useSeccionAlumnos';
import useEvaluaciones from '../hooks/useEvaluaciones';
import SeccionSelector from '../components/SeccionSelector';
import { generarBoletinPDF } from '../components/pdfUtils';

const PerfilAlumnoPage = () => {
  const { secciones, loading: loadingSec } = useSecciones();
  const [seccionId, setSeccionId] = useState('');
  const [alumnoId, setAlumnoId] = useState(null);
  const { alumnos, loading: loadingAlumnos } = useSeccionAlumnos(seccionId);
  const { evaluaciones, loading: loadingEval } = useEvaluaciones(seccionId);

  const seccionActual = secciones.find(s => String(s.id) === String(seccionId));
  const alumnoBase = useMemo(() => alumnos.find(a => a.inscripcion_id === alumnoId), [alumnos, alumnoId]);
  const alumnoEval = useMemo(() => evaluaciones.find(e => e.inscripcion_id === alumnoId), [evaluaciones, alumnoId]);
  const evals = alumnoEval?.evaluaciones?.filter(e => e.nota != null) || [];
  const promEvals = evals.length ? (evals.reduce((s, e) => s + parseFloat(e.nota), 0) / evals.length).toFixed(2) : null;
  const enRiesgo = alumnoBase?.porcentaje_asistencia != null && alumnoBase.porcentaje_asistencia < 75;

  const handleDescargarPDF = () => {
    if (!alumnoBase) return;
    generarBoletinPDF({
      alumno: alumnoBase,
      evaluaciones: evals,
      seccionNombre: seccionActual?.materia,
      periodo: seccionActual?.periodo,
    });
  };

  const loading = loadingAlumnos || loadingEval;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Perfil del Alumno</h1>
        <p className="text-sm text-slate-500 mt-1">Historial académico individual</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-600 block mb-2">Sección</label>
        <div className="relative">
          <SeccionSelector
            secciones={secciones}
            loading={loadingSec}
            value={seccionId}
            onChange={(id) => { setSeccionId(String(id)); setAlumnoId(null); }}
          />
        </div>
      </div>

      {!seccionId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-sm">Selecciona una sección para ver los perfiles</p>
        </div>
      )}

      {/* Lista de alumnos */}
      {seccionId && !alumnoId && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
            </div>
          ) : alumnos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">Sin alumnos en esta sección</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-500">Selecciona un alumno</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {alumnos.map(a => {
                  const evalData = evaluaciones.find(e => e.inscripcion_id === a.inscripcion_id);
                  const nEvals = evalData?.evaluaciones?.filter(e => e.nota != null).length || 0;
                  const riesgo = a.porcentaje_asistencia != null && a.porcentaje_asistencia < 75;
                  return (
                    <button
                      key={a.inscripcion_id}
                      onClick={() => setAlumnoId(a.inscripcion_id)}
                      className="bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 leading-tight truncate">{a.nombre}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{a.cedula}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {riesgo && <AlertTriangle size={14} className="text-amber-500" />}
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                        <div className="text-center">
                          <p className={`text-base font-bold ${a.nota_final != null ? (parseFloat(a.nota_final) >= 7 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-700'}`}>
                            {a.nota_final != null ? parseFloat(a.nota_final).toFixed(1) : '—'}
                          </p>
                          <p className="text-xs text-slate-400">Nota</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-base font-bold ${riesgo ? 'text-red-500' : 'text-emerald-600'}`}>
                            {a.porcentaje_asistencia != null ? `${a.porcentaje_asistencia}%` : '—'}
                          </p>
                          <p className="text-xs text-slate-400">Asist.</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-slate-700">{nEvals}</p>
                          <p className="text-xs text-slate-400">Evals</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Perfil detallado */}
      {seccionId && alumnoId && alumnoBase && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => setAlumnoId(null)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
              Todos los alumnos
            </button>
            <button
              onClick={handleDescargarPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FileDown size={16} />
              Descargar Boletín PDF
            </button>
          </div>

          {/* Card principal */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white">
            <p className="text-xs font-semibold text-indigo-300 mb-1 uppercase tracking-wide">Perfil Individual</p>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{alumnoBase.nombre}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {alumnoBase.cedula}
              {seccionActual?.materia ? ` · ${seccionActual.materia}` : ''}
            </p>
            {enRiesgo && (
              <div className="flex items-center gap-2 mt-3 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2 w-fit">
                <AlertTriangle size={15} className="text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Alumno en riesgo de asistencia</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-700">
              <div>
                <p className={`text-3xl sm:text-4xl font-bold ${alumnoBase.nota_final != null ? (parseFloat(alumnoBase.nota_final) >= 7 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                  {alumnoBase.nota_final != null ? parseFloat(alumnoBase.nota_final).toFixed(2) : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Nota Final</p>
              </div>
              <div>
                <p className={`text-3xl sm:text-4xl font-bold ${enRiesgo ? 'text-red-400' : 'text-emerald-400'}`}>
                  {alumnoBase.porcentaje_asistencia != null ? `${alumnoBase.porcentaje_asistencia}%` : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Asistencia</p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-bold">{evals.length}</p>
                <p className="text-xs text-slate-400 mt-1">Evaluaciones</p>
              </div>
              <div>
                <p className={`text-3xl sm:text-4xl font-bold ${promEvals != null ? (parseFloat(promEvals) >= 7 ? 'text-emerald-400' : 'text-amber-400') : 'text-white'}`}>
                  {promEvals ?? '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Prom. Parciales</p>
              </div>
            </div>
          </div>

          {/* Evaluaciones */}
          {evals.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-slate-700">Evaluaciones Parciales</h2>
              <div className="space-y-3">
                {[...evals].sort((a, b) => parseFloat(b.nota) - parseFloat(a.nota)).map((ev, idx) => {
                  const nota = parseFloat(ev.nota);
                  const aprobado = nota >= 7;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-28 shrink-0">
                        <p className="text-sm font-medium text-slate-700">{ev.tipo}</p>
                        {ev.peso != null && <p className="text-xs text-slate-400">{ev.peso}% peso</p>}
                      </div>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${aprobado ? 'bg-emerald-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.round((nota / 20) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 w-16 justify-end shrink-0">
                        <span className={`text-sm font-bold ${aprobado ? 'text-emerald-600' : 'text-red-500'}`}>{nota.toFixed(2)}</span>
                        {aprobado ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-slate-400 text-sm">Sin evaluaciones parciales registradas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerfilAlumnoPage;
