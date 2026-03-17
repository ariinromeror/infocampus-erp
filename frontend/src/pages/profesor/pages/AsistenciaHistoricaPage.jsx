import { useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import useSecciones from '../hooks/useSecciones';
import useAsistenciaHistorica from '../hooks/useAsistenciaHistorica';
import SeccionSelector from '../components/SeccionSelector';

const CELDA = {
  presente:    { label: 'P', cls: 'bg-emerald-100 text-emerald-700' },
  ausente:     { label: 'A', cls: 'bg-red-100 text-red-600' },
  tardanza:    { label: 'T', cls: 'bg-amber-100 text-amber-700' },
  justificado: { label: 'J', cls: 'bg-blue-100 text-blue-700' },
};

const fmtFecha = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
};

const AsistenciaHistoricaPage = () => {
  const { secciones, loading: loadingSec } = useSecciones();
  const [seccionId, setSeccionId] = useState('');
  const { data, loading, error } = useAsistenciaHistorica(seccionId);
  const enRiesgo = data?.alumnos?.filter(a => a.resumen?.en_riesgo) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Historial de Asistencia</h1>
        <p className="text-sm text-slate-500 mt-1">Registro completo por sección</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-600 block mb-2">Sección</label>
        <div className="relative">
          <SeccionSelector secciones={secciones} loading={loadingSec} value={seccionId} onChange={(id) => setSeccionId(String(id))} />
        </div>
      </div>

      {!seccionId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-sm">Selecciona una sección para ver el historial</p>
        </div>
      )}

      {seccionId && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">Error al cargar el historial de asistencia</p>
        </div>
      )}

      {seccionId && loading && (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
        </div>
      )}

      {seccionId && !loading && !error && data && (
        <>
          {enRiesgo.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-2">
                    {enRiesgo.length} alumno{enRiesgo.length > 1 ? 's' : ''} con asistencia por debajo del 75%
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {enRiesgo.map(a => (
                      <div key={a.estudiante_id} className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-1.5">
                        <span className="text-sm font-medium text-slate-700">{a.nombre.split(' ').slice(0, 2).join(' ')}</span>
                        <span className="text-sm font-bold text-red-500">{a.resumen.porcentaje_asistencia}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!data.fechas?.length ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">Sin registros de asistencia en esta sección</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 sticky left-0 bg-slate-50 z-10">Alumno</th>
                        {data.fechas.map(f => (
                          <th key={f} className="text-center text-xs font-medium text-slate-400 px-2 py-3 min-w-[44px]">
                            {fmtFecha(f)}
                          </th>
                        ))}
                        <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3 bg-slate-100">%</th>
                        <th className="text-center text-xs font-semibold text-emerald-600 px-3 py-3">P</th>
                        <th className="text-center text-xs font-semibold text-red-500 px-3 py-3">A</th>
                        <th className="text-center text-xs font-semibold text-amber-600 px-3 py-3">T</th>
                        <th className="text-center text-xs font-semibold text-blue-600 px-3 py-3">J</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.alumnos.map(alumno => {
                        const r = alumno.resumen || {};
                        const riesgo = r.en_riesgo;
                        return (
                          <tr key={alumno.estudiante_id} className={`transition-colors ${riesgo ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                            <td className={`px-5 py-3 sticky left-0 z-10 ${riesgo ? 'bg-red-50/40' : 'bg-white'}`}>
                              <div className="flex items-center gap-2">
                                {riesgo && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                                <div>
                                  <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                                    {alumno.nombre.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <p className="text-xs text-slate-400">{alumno.cedula}</p>
                                </div>
                              </div>
                            </td>
                            {data.fechas.map(f => {
                              const reg = alumno.registros?.[f];
                              const cell = reg?.estado ? CELDA[reg.estado] : null;
                              return (
                                <td key={f} className="px-1 py-3 text-center">
                                  {cell
                                    ? <span title={reg.estado} className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${cell.cls}`}>{cell.label}</span>
                                    : <span className="text-slate-200 text-sm">·</span>}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center bg-slate-50/60">
                              <span className={`text-sm font-semibold ${riesgo ? 'text-red-500' : 'text-emerald-600'}`}>{r.porcentaje_asistencia ?? '—'}%</span>
                            </td>
                            <td className="px-3 py-3 text-center"><span className="text-sm font-semibold text-emerald-600">{r.presentes ?? 0}</span></td>
                            <td className="px-3 py-3 text-center"><span className="text-sm font-semibold text-red-500">{r.ausentes ?? 0}</span></td>
                            <td className="px-3 py-3 text-center"><span className="text-sm font-semibold text-amber-600">{r.tardanzas ?? 0}</span></td>
                            <td className="px-3 py-3 text-center"><span className="text-sm font-semibold text-blue-600">{r.justificados ?? 0}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Leyenda */}
              <div className="flex flex-wrap gap-4 px-1">
                {[
                  { k: 'P', label: 'Presente',    cls: 'bg-emerald-100 text-emerald-700' },
                  { k: 'A', label: 'Ausente',      cls: 'bg-red-100 text-red-600' },
                  { k: 'T', label: 'Tardanza',     cls: 'bg-amber-100 text-amber-700' },
                  { k: 'J', label: 'Justificado',  cls: 'bg-blue-100 text-blue-700' },
                ].map(({ k, label, cls }) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${cls}`}>{k}</span>
                    <span className="text-sm text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AsistenciaHistoricaPage;
