import { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

const TIPOS_LABEL = {
  parcial_1:    'Parcial 1',
  parcial_2:    'Parcial 2',
  talleres:     'Talleres',
  examen_final: 'Examen Final',
};

const LibroCalificacionesModal = ({ isOpen, onClose, seccion, profesorId }) => {
  const [alumnos,      setAlumnos]      = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading,      setLoading]      = useState(false);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !seccion?.id) { setAlumnos([]); setEvaluaciones([]); return; }
    const pid = profesorId || seccion?.profesor_id;
    if (!pid) { setAlumnos([]); setEvaluaciones([]); return; }

    const fetch = async () => {
      setLoading(true);
      try {
        const [ra, re] = await Promise.allSettled([
          academicoService.getProfesorAlumnos(pid, seccion.id),
          academicoService.getProfesorEvaluaciones(pid, seccion.id),
        ]);
        if (ra.status === 'fulfilled') {
          const raw = ra.value.data?.data || ra.value.data || [];
          setAlumnos(Array.isArray(raw) ? raw : (raw?.alumnos || []));
        }
        if (re.status === 'fulfilled') {
          const raw = re.value.data?.data || re.value.data || [];
          setEvaluaciones(Array.isArray(raw) ? raw : (raw?.evaluaciones || []));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch();
  }, [isOpen, seccion?.id, profesorId]);

  const tipos = useMemo(() => {
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
      total:     alumnos.length,
      conNota:   notas.length,
      aprobados,
      reprobados: notas.length - aprobados,
      promedio:  notas.length ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2) : '—',
      tasa:      notas.length ? Math.round((aprobados / notas.length) * 100) : 0,
    };
  }, [alumnos]);

  if (!isOpen) return null;

  return (
    // fixed inset-0 asegura pantalla completa + flex centra el panel
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
      {/* backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* panel — posición relativa al flex container, NO absoluta */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
                <BookOpen size={12} className="text-indigo-600" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-500">Solo Lectura · Supervisión</p>
            </div>
            <h2 className="text-lg font-black italic uppercase tracking-tighter text-slate-900">
              {seccion?.materia_nombre || seccion?.materia?.nombre || seccion?.materia || 'Libro de Calificaciones'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {seccion?.codigo || seccion?.materia?.codigo} · {seccion?.periodo} {seccion?.aula ? `· ${seccion.aula}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando libro...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Stats strip */}
            {stats && (
              <div className="grid grid-cols-5 divide-x divide-slate-100 border-b border-slate-100 flex-shrink-0">
                {[
                  { label: 'Inscritos',   value: stats.total,      color: 'text-slate-800' },
                  { label: 'Con Nota',    value: stats.conNota,    color: 'text-slate-600' },
                  { label: 'Aprobados',   value: stats.aprobados,  color: 'text-emerald-600' },
                  { label: 'Reprobados',  value: stats.reprobados, color: stats.reprobados > 0 ? 'text-rose-500' : 'text-slate-400' },
                  { label: 'Promedio',    value: stats.promedio,   color: 'text-indigo-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="px-5 py-4 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tasa */}
            {stats && (
              <div className="px-8 py-3 border-b border-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Tasa de Aprobación</p>
                  <p className="text-xs font-black text-slate-700">{stats.tasa}%</p>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${stats.tasa >= 70 ? 'bg-emerald-500' : stats.tasa >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    style={{ width: `${stats.tasa}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-[11px] font-black uppercase tracking-widest text-slate-400 px-6 py-3 sticky left-0 bg-slate-50 z-10">Alumno</th>
                    <th className="text-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Asistencia</th>
                    {tipos.map(t => (
                      <th key={t} className="text-center text-[11px] font-black uppercase tracking-widest text-indigo-400 px-4 py-3 whitespace-nowrap">
                        {TIPOS_LABEL[t] || t}
                      </th>
                    ))}
                    <th className="text-center text-[11px] font-black uppercase tracking-widest text-slate-600 px-5 py-3 bg-slate-100/40">Nota Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {alumnos.length === 0 ? (
                    <tr>
                      <td colSpan={3 + tipos.length} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <Users size={32} />
                          <p className="text-xs font-black uppercase">Sin alumnos en esta sección</p>
                        </div>
                      </td>
                    </tr>
                  ) : alumnos.map((alumno, idx) => {
                    const eMap   = evalMap[alumno.inscripcion_id] || {};
                    const riesgo = alumno.porcentaje_asistencia != null && alumno.porcentaje_asistencia < 75;
                    const nota   = alumno.nota_final != null ? parseFloat(alumno.nota_final) : null;
                    return (
                      <tr key={alumno.inscripcion_id} className={`transition-colors hover:bg-slate-50/50 ${idx % 2 === 1 ? 'bg-slate-50/20' : ''}`}>
                        <td className="px-6 py-3.5 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black text-xs flex-shrink-0">
                              {(alumno.nombre || '?')[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{alumno.nombre}</p>
                              <p className="text-[10px] text-slate-400">{alumno.cedula}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-sm font-black ${riesgo ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {alumno.porcentaje_asistencia != null ? `${alumno.porcentaje_asistencia}%` : '—'}
                          </span>
                          {riesgo && <p className="text-[11px] font-black text-rose-400 uppercase leading-none mt-0.5">Riesgo</p>}
                        </td>
                        {tipos.map(tipo => {
                          const n = eMap[tipo];
                          return (
                            <td key={tipo} className="px-4 py-3.5 text-center">
                              {n != null
                                ? <span className={`text-sm font-bold ${parseFloat(n) >= 7 ? 'text-slate-700' : 'text-rose-500'}`}>{parseFloat(n).toFixed(2)}</span>
                                : <span className="text-slate-200 text-sm">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-5 py-3.5 text-center bg-slate-50/30">
                          {nota != null ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-sm font-black ${nota >= 7 ? 'text-emerald-600' : 'text-rose-500'}`}>{nota.toFixed(2)}</span>
                              {nota >= 7 ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-rose-400" />}
                            </div>
                          ) : <span className="text-slate-200 text-sm">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibroCalificacionesModal;
