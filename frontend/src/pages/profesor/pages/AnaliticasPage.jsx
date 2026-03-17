import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import useSecciones from '../hooks/useSecciones';
import useSeccionAlumnos from '../hooks/useSeccionAlumnos';
import useEvaluaciones from '../hooks/useEvaluaciones';
import SeccionSelector from '../components/SeccionSelector';

const RANGOS = [
  { label: '0 – 3',  min: 0,  max: 3.99,  color: 'bg-red-500' },
  { label: '4 – 6',  min: 4,  max: 6.99,  color: 'bg-orange-400' },
  { label: '7 – 9',  min: 7,  max: 9.99,  color: 'bg-amber-400' },
  { label: '10 – 13', min: 10, max: 13.99, color: 'bg-emerald-400' },
  { label: '14 – 16', min: 14, max: 16.99, color: 'bg-emerald-500' },
  { label: '17 – 20', min: 17, max: 20,    color: 'bg-indigo-500' },
];

const TIPOS_LABEL = {
  parcial_1: 'Parcial 1',
  parcial_2: 'Parcial 2',
  talleres: 'Talleres',
  examen_final: 'Examen Final',
};

const AnaliticasPage = () => {
  const { secciones, loading: loadingSec } = useSecciones();
  const [seccionId, setSeccionId] = useState('');
  const { alumnos, loading: loadingAlumnos } = useSeccionAlumnos(seccionId);
  const { evaluaciones, loading: loadingEval } = useEvaluaciones(seccionId);
  const loading = loadingAlumnos || loadingEval;

  const stats = useMemo(() => {
    if (!alumnos.length) return null;
    const notas = alumnos.map(a => a.nota_final).filter(n => n != null).map(n => parseFloat(n));
    const aprobados = notas.filter(n => n >= 7).length;
    return {
      inscritos: alumnos.length,
      conNota: notas.length,
      aprobados,
      reprobados: notas.length - aprobados,
      promedio: notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
      tasaAprobacion: notas.length ? Math.round((aprobados / notas.length) * 100) : 0,
      sorted: [...alumnos].filter(a => a.nota_final != null).sort((a, b) => parseFloat(b.nota_final) - parseFloat(a.nota_final)),
    };
  }, [alumnos]);

  const distrib = useMemo(() => RANGOS.map(r => ({
    ...r,
    count: alumnos.filter(a => a.nota_final != null && parseFloat(a.nota_final) >= r.min && parseFloat(a.nota_final) <= r.max).length,
  })), [alumnos]);

  const promediosPorTipo = useMemo(() => {
    const acc = {};
    evaluaciones.forEach(est => {
      (est.evaluaciones || []).forEach(ev => {
        if (!acc[ev.tipo]) acc[ev.tipo] = { sum: 0, count: 0, peso: ev.peso };
        if (ev.nota != null) { acc[ev.tipo].sum += parseFloat(ev.nota); acc[ev.tipo].count++; }
      });
    });
    return Object.entries(acc)
      .map(([tipo, d]) => ({ tipo, promedio: d.count > 0 ? d.sum / d.count : null, peso: d.peso }))
      .filter(x => x.promedio != null);
  }, [evaluaciones]);

  const maxDist = Math.max(...distrib.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Analíticas</h1>
        <p className="text-sm text-slate-500 mt-1">Rendimiento académico por sección</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-600 block mb-2">Sección</label>
        <div className="relative">
          <SeccionSelector secciones={secciones} loading={loadingSec} value={seccionId} onChange={(id) => setSeccionId(String(id))} />
        </div>
      </div>

      {!seccionId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-sm">Selecciona una sección para ver las analíticas</p>
        </div>
      )}

      {seccionId && loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl" />)}
        </div>
      )}

      {seccionId && !loading && !stats && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <p className="text-slate-400 text-sm">Sin notas finales registradas en esta sección</p>
        </div>
      )}

      {seccionId && !loading && stats && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Tasa de aprobación', value: `${stats.tasaAprobacion}%`, color: 'text-indigo-600' },
              { label: 'Promedio final',     value: stats.promedio != null ? stats.promedio.toFixed(2) : '—', color: 'text-slate-800' },
              { label: 'Aprobados',          value: stats.aprobados,  color: 'text-emerald-600' },
              { label: 'Reprobados',         value: stats.reprobados, color: stats.reprobados > 0 ? 'text-red-500' : 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
                <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Distribución */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-700 mb-4">Distribución de Notas</h2>
              <div className="space-y-3">
                {distrib.map(({ label, count, color }) => {
                  const pct = Math.round((count / maxDist) * 100);
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 w-14 text-right shrink-0">{label}</span>
                      <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 w-5 shrink-0 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por tipo de evaluación */}
            {promediosPorTipo.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-700 mb-4">Promedio por Evaluación</h2>
                <div className="space-y-3">
                  {promediosPorTipo.map(({ tipo, promedio, peso }) => {
                    const pct = Math.round((promedio / 20) * 100);
                    const bueno = promedio >= 7;
                    return (
                      <div key={tipo} className="flex items-center gap-3">
                        <div className="w-28 shrink-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{TIPOS_LABEL[tipo] || tipo}</p>
                          {peso != null && <p className="text-xs text-slate-400">{peso}% peso</p>}
                        </div>
                        <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${bueno ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center gap-1 w-14 justify-end shrink-0">
                          <span className={`text-sm font-semibold ${bueno ? 'text-emerald-600' : 'text-red-500'}`}>{promedio.toFixed(1)}</span>
                          {bueno ? <TrendingUp size={13} className="text-emerald-500" /> : <TrendingDown size={13} className="text-red-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Ranking */}
          {stats.sorted.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-700 mb-4">Ranking del Grupo</h2>
              <div className="space-y-2.5">
                {stats.sorted.map((alumno, idx) => {
                  const nota = parseFloat(alumno.nota_final);
                  const aprobado = nota >= 7;
                  return (
                    <div key={alumno.inscripcion_id} className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-6 text-right shrink-0 ${idx < 3 ? 'text-indigo-500' : 'text-slate-400'}`}>
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-700 w-32 sm:w-40 shrink-0 truncate">
                        {alumno.nombre?.split(' ').slice(0, 2).join(' ')}
                      </p>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${aprobado ? 'bg-emerald-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.round((nota / 20) * 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold w-12 text-right shrink-0 ${aprobado ? 'text-emerald-600' : 'text-red-500'}`}>
                        {nota.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnaliticasPage;
