import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const TablaNotas = ({ notas = [], loading = false }) => {
  const [expandedNota, setExpandedNota] = useState(null);

  if (loading) return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-96" />
  );

  const safeNotas = Array.isArray(notas) ? notas : [];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-700">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Asignatura</th>
            <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Nota Final</th>
            <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Estado</th>
            <th className="py-6 px-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {safeNotas.length > 0 ? (
            safeNotas.map((nota, idx) => {
              const nombreMateria = nota.materia_nombre || nota.materia || "Sin Nombre";
              const valorNota = nota.nota_final || nota.nota || 0;
              const estado = (parseFloat(valorNota) >= 7) ? 'APROBADO' : 'REPROBADO';

              return (
                <React.Fragment key={idx}>
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-8">
                      <p className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">
                        {nombreMateria}
                      </p>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className="text-2xl font-black italic text-slate-900">
                        {parseFloat(valorNota).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-4 py-1 border-2 ${
                        estado === 'APROBADO' 
                          ? 'border-slate-900 bg-slate-900 text-white' 
                          : 'border-amber-500 text-amber-500'
                      }`}>
                        {estado}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <button 
                        onClick={() => setExpandedNota(expandedNota === idx ? null : idx)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                      >
                        {expandedNota === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedNota === idx && (
                    <tr className="bg-slate-50/30">
                      <td colSpan="4" className="px-8 py-8 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Detalle de Ciclo</p>
                            <div className="flex items-center gap-4">
                               <div className="h-12 w-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900">
                                 <BookOpen size={20} />
                               </div>
                               <div>
                                 <p className="text-sm font-bold text-slate-900">Registro Académico Activo</p>
                                 <p className="text-xs text-slate-400 uppercase font-black tracking-tighter">PostgreSQL Sync OK</p>
                               </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" className="py-20 text-center">
                <p className="font-black text-slate-500 uppercase italic text-xl">
                  No se encontraron registros en la base de datos
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default TablaNotas;