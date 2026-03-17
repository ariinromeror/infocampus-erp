import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * TablaAsistencia - Estilo MINIMALISTA PURO
 * Sin emojis, sin badges coloridos, solo tipografía
 * Agrupa por materia y calcula porcentajes
 */
const TablaAsistencia = ({ asistencias = [], estadisticas = null, loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-48" />
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-96" />
      </div>
    );
  }

  const safeAsistencias = Array.isArray(asistencias) ? asistencias : [];

  // Agrupar asistencias por materia
  const asistenciasPorMateria = safeAsistencias.reduce((acc, registro) => {
    const materia = registro.materia || 'Sin materia';
    if (!acc[materia]) {
      acc[materia] = {
        materia,
        registros: [],
        presente: 0,
        ausente: 0,
        tardanza: 0,
        justificada: 0
      };
    }
    acc[materia].registros.push(registro);
    acc[materia][registro.estado] = (acc[materia][registro.estado] || 0) + 1;
    return acc;
  }, {});

  const materiasArray = Object.values(asistenciasPorMateria);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* RESUMEN GENERAL */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              Total Clases
            </p>
            <p className="text-4xl font-black italic text-slate-900">
              {estadisticas.total_clases || 0}
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              Presente
            </p>
            <p className="text-4xl font-black italic text-emerald-600">
              {estadisticas.presente || 0}
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              Ausente
            </p>
            <p className="text-4xl font-black italic text-red-600">
              {estadisticas.ausente || 0}
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              Porcentaje
            </p>
            <p className="text-4xl font-black italic text-indigo-600">
              {estadisticas.porcentaje_asistencia?.toFixed(0) || 0}%
            </p>
          </div>
        </div>
      )}

      {/* DESGLOSE POR MATERIA */}
      {materiasArray.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
          <h3 className="text-lg font-black uppercase italic text-slate-900 mb-6">
            Desglose por Materia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materiasArray.map((item, idx) => {
              const total = item.registros.length;
              const porcentaje = total > 0 
                ? ((item.presente / total) * 100).toFixed(0) 
                : 0;

              return (
                <div key={idx} className="border border-slate-200 rounded-2xl p-6 hover:border-slate-400 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-black uppercase text-sm text-slate-900 tracking-tight leading-tight">
                        {item.materia}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black italic text-slate-900">
                        {porcentaje}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">
                        Presente
                      </span>
                      <span className="font-black text-slate-900">
                        {item.presente || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">
                        Ausente
                      </span>
                      <span className="font-black text-slate-900">
                        {item.ausente || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider">
                        Tardanza
                      </span>
                      <span className="font-black text-slate-900">
                        {item.tardanza || 0}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                      <span className="font-bold text-slate-900 uppercase tracking-wider">
                        Total
                      </span>
                      <span className="font-black text-slate-900">
                        {total}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TABLA DETALLADA (Registro cronológico) */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">

        {safeAsistencias.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="mx-auto text-slate-300 mb-4" size={64} />
            <p className="font-black text-slate-500 uppercase italic text-xl">
              Sin registros de asistencia
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE: cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {safeAsistencias.map((registro, idx) => {
                const estadoStyles = {
                  presente:    'border-slate-900 bg-slate-900 text-white',
                  tardanza:    'border-amber-500 text-amber-600',
                  justificada: 'border-indigo-500 text-indigo-600',
                  ausente:     'border-red-500 text-red-600',
                };
                const style = estadoStyles[registro.estado] || 'border-red-500 text-red-600';
                return (
                  <div key={idx} className="flex items-center justify-between px-6 py-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">
                        {registro.materia || 'Sin materia'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {new Date(registro.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-black uppercase tracking-tight px-3 py-1.5 border-2 ${style}`}>
                      {registro.estado}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP: tabla */}
            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b-4 border-slate-900">
                  <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Materia</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Fecha</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeAsistencias.map((registro, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-6 px-8">
                      <p className="font-black text-slate-900 uppercase text-sm tracking-tight">
                        {registro.materia || 'Sin materia'}
                      </p>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <p className="text-sm font-bold text-slate-600">
                        {new Date(registro.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-4 py-1 border-2 ${
                        registro.estado === 'presente'    ? 'border-slate-900 bg-slate-900 text-white' :
                        registro.estado === 'tardanza'    ? 'border-amber-600 text-amber-600' :
                        registro.estado === 'justificada' ? 'border-indigo-600 text-indigo-600' :
                                                            'border-red-600 text-red-600'
                      }`}>
                        {registro.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default TablaAsistencia;