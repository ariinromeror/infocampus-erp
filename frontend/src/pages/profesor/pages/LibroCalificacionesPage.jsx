import { useState, useMemo } from 'react';
import useSecciones from '../hooks/useSecciones';
import useSeccionAlumnos from '../hooks/useSeccionAlumnos';
import useEvaluaciones from '../hooks/useEvaluaciones';
import SeccionSelector from '../components/SeccionSelector';

const TIPOS_LABEL = {
  parcial_1: 'Parcial 1',
  parcial_2: 'Parcial 2',
  talleres: 'Talleres',
  examen_final: 'Examen Final',
};

const LibroCalificacionesPage = () => {
  const { secciones, loading: loadingSec } = useSecciones();
  const [seccionId, setSeccionId] = useState('');
  const { alumnos, loading: loadingAlumnos } = useSeccionAlumnos(seccionId);
  const { evaluaciones, loading: loadingEval } = useEvaluaciones(seccionId);

  const tiposEval = useMemo(() => {
    const s = new Set();
    evaluaciones.forEach(e => (e.evaluaciones || []).forEach(ev => s.add(ev.tipo)));
    return Array.from(s).sort();
  }, [evaluaciones]);

  const evalMap = useMemo(() => {
    const m = {};
    evaluaciones.forEach(e => {
      m[e.inscripcion_id] = {};
      (e.evaluaciones || []).forEach(ev => { m[e.inscripcion_id][ev.tipo] = ev.nota; });
    });
    return m;
  }, [evaluaciones]);

  const stats = useMemo(() => {
    if (!alumnos.length) return null;
    const notas = alumnos.map(a => a.nota_final).filter(n => n != null).map(n => parseFloat(n));
    const aprobados = notas.filter(n => n >= 7).length;
    return {
      total: alumnos.length,
      conNota: notas.length,
      sinNota: alumnos.length - notas.length,
      aprobados,
      reprobados: notas.length - aprobados,
      promedio: notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2) : null,
    };
  }, [alumnos]);

  const loading = loadingAlumnos || loadingEval;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Libro de Notas</h1>
        <p className="text-sm text-slate-500 mt-1">Calificaciones consolidadas por sección</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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

      {seccionId && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Inscritos',   value: stats.total,      color: 'text-slate-800' },
            { label: 'Con nota',    value: stats.conNota,    color: 'text-slate-800' },
            { label: 'Sin nota',    value: stats.sinNota,    color: stats.sinNota > 0 ? 'text-amber-600' : 'text-slate-400' },
            { label: 'Aprobados',   value: stats.aprobados,  color: 'text-emerald-600' },
            { label: 'Reprobados',  value: stats.reprobados, color: stats.reprobados > 0 ? 'text-red-500' : 'text-slate-400' },
            { label: 'Promedio',    value: stats.promedio ?? '—', color: 'text-indigo-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {seccionId && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 sticky left-0 bg-slate-50 z-10">Alumno</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Asistencia</th>
                  {tiposEval.map(tipo => (
                    <th key={tipo} className="text-center text-xs font-semibold text-indigo-500 px-4 py-3 whitespace-nowrap">
                      {TIPOS_LABEL[tipo] || tipo}
                    </th>
                  ))}
                  <th className="text-center text-xs font-semibold text-slate-700 px-5 py-3 bg-slate-100">Nota Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 3 + tiposEval.length }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded-full w-16 mx-auto" /></td>
                      ))}
                    </tr>
                  ))
                  : alumnos.length === 0
                    ? (
                      <tr>
                        <td colSpan={3 + tiposEval.length} className="px-6 py-12 text-center text-slate-400 text-sm">
                          Sin alumnos en esta sección
                        </td>
                      </tr>
                    )
                    : alumnos.map(alumno => {
                      const eMap = evalMap[alumno.inscripcion_id] || {};
                      const enRiesgo = alumno.porcentaje_asistencia != null && alumno.porcentaje_asistencia < 75;
                      const nota = alumno.nota_final != null ? parseFloat(alumno.nota_final) : null;
                      return (
                        <tr key={alumno.inscripcion_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 sticky left-0 bg-white z-10">
                            <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">{alumno.nombre}</p>
                            <p className="text-xs text-slate-400">{alumno.cedula}</p>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-sm font-semibold ${enRiesgo ? 'text-red-500' : 'text-emerald-600'}`}>
                              {alumno.porcentaje_asistencia != null ? `${alumno.porcentaje_asistencia}%` : '—'}
                            </span>
                            {enRiesgo && <p className="text-xs text-red-400 leading-none mt-0.5">Riesgo</p>}
                          </td>
                          {tiposEval.map(tipo => {
                            const n = eMap[tipo];
                            return (
                              <td key={tipo} className="px-4 py-3.5 text-center">
                                {n != null
                                  ? <span className={`text-sm font-semibold ${parseFloat(n) >= 7 ? 'text-slate-700' : 'text-red-500'}`}>{parseFloat(n).toFixed(2)}</span>
                                  : <span className="text-slate-500 text-sm">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-5 py-3.5 text-center bg-slate-50/50">
                            {nota != null
                              ? <span className={`text-sm font-bold ${nota >= 7 ? 'text-emerald-600' : 'text-red-500'}`}>{nota.toFixed(2)}</span>
                              : <span className="text-slate-500 text-sm">—</span>}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!seccionId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-sm">Selecciona una sección para ver el libro de notas</p>
        </div>
      )}
    </div>
  );
};

export default LibroCalificacionesPage;
