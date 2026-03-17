import React from 'react';
import useNotas from '../hooks/useNotas';
import Loader from '../../../components/shared/Loader';
import { Clock, CheckCircle, BookOpen } from 'lucide-react';

const TIPO_LABEL = {
  parcial_1: 'Parcial 1',
  parcial_2: 'Parcial 2',
  talleres: 'Talleres',
  examen_final: 'Examen Final'
};

const TareasPage = () => {
  const { notas, loading } = useNotas();

  if (loading) return <Loader />;

  const evaluaciones = notas.flatMap(nota =>
    (nota.evaluaciones || []).map(ev => ({
      ...ev,
      materia: nota.materia,
      periodo: nota.periodo
    }))
  );

  const pendientes = evaluaciones.filter(ev => ev.nota == null);
  const completadas = evaluaciones.filter(ev => ev.nota != null);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h1 className="flex flex-col text-4xl sm:text-6xl font-black text-slate-900 italic uppercase tracking-tighter leading-tight">
          <span>Mis</span>
          <span className="text-indigo-600">Evaluaciones</span>
        </h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          Evaluaciones parciales por asignatura
        </p>
      </div>

      {evaluaciones.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-20 text-center shadow-sm">
          <BookOpen className="mx-auto text-slate-200 mb-4" size={64} />
          <p className="font-black text-slate-500 uppercase italic text-xl">Sin evaluaciones registradas</p>
        </div>
      ) : (
        <>
          {pendientes.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Pendientes — {pendientes.length}
              </p>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b-4 border-slate-900">
                      <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Materia</th>
                      <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Evaluación</th>
                      <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Peso</th>
                      <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendientes.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-6 px-8">
                          <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{ev.materia}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{ev.periodo}</p>
                        </td>
                        <td className="py-6 px-8">
                          <p className="font-bold text-slate-700 text-sm">{TIPO_LABEL[ev.tipo] || ev.tipo}</p>
                          {ev.fecha && (
                            <p className="text-[10px] text-slate-400 font-bold">{ev.fecha}</p>
                          )}
                        </td>
                        <td className="py-6 px-8 text-center">
                          <p className="font-black text-slate-900 italic">{ev.peso}%</p>
                        </td>
                        <td className="py-6 px-8 text-center">
                          <span className="text-[10px] font-black uppercase tracking-tighter px-4 py-1 border-2 border-amber-500 text-amber-500 flex items-center justify-center gap-1">
                            <Clock size={12} />
                            Pendiente
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {completadas.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Completadas — {completadas.length}
              </p>
              <div className="bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b-4 border-slate-900">
                      <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Materia</th>
                      <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Evaluación</th>
                      <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Peso</th>
                      <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completadas.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-6 px-8">
                          <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{ev.materia}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{ev.periodo}</p>
                        </td>
                        <td className="py-6 px-8">
                          <p className="font-bold text-slate-700 text-sm">{TIPO_LABEL[ev.tipo] || ev.tipo}</p>
                        </td>
                        <td className="py-6 px-8 text-center">
                          <p className="font-black text-slate-900 italic">{ev.peso}%</p>
                        </td>
                        <td className="py-6 px-8 text-center">
                          <span className="text-[10px] font-black uppercase tracking-tighter px-4 py-1 border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center gap-1">
                            <CheckCircle size={12} />
                            {parseFloat(ev.nota).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TareasPage;