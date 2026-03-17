import React from 'react';
import useNotas from '../hooks/useNotas';
import TablaNotas from '../components/TablaNotas';
import KPICard from '../components/KPICard';

const NotasPage = () => {
  const { notas, loading } = useNotas();

  const dataFinal = Array.isArray(notas) ? notas : [];

  const promedioCalculado = dataFinal.length > 0
    ? (dataFinal.reduce((acc, curr) => acc + (parseFloat(curr.nota_final ?? 0)), 0) / dataFinal.length).toFixed(1)
    : '—';

  const enRiesgo = dataFinal.filter(n => n.nota_final != null && parseFloat(n.nota_final) < 7).length;

  if (loading) return (
    <div className="p-10 animate-pulse font-black text-slate-500 uppercase italic tracking-widest">
      Sincronizando con base de datos...
    </div>
  );

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Mis <span className="text-indigo-600">Calificaciones</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Rendimiento por asignatura y proyecciones finales
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KPICard title="Promedio General" value={promedioCalculado} icon="Star" color="indigo" />
        <KPICard title="Asignaturas" value={dataFinal.length} icon="BookMarked" color="slate" />
        <KPICard title="En Riesgo" value={enRiesgo} icon="AlertCircle" color="amber" variant="outline" />
      </div>

      <div className="pt-4 border-t border-slate-50">
        <TablaNotas notas={dataFinal} loading={loading} />
      </div>
    </div>
  );
};

export default NotasPage;