import { ChevronRight, AlertTriangle } from 'lucide-react';

const EstudianteRow = ({ estudiante, isMobile = false, onClick }) => {
  const nombre = estudiante.nombre || estudiante.nombre_completo || '—';
  const carrera = estudiante.carrera || estudiante.carrera_nombre || '—';

  const handleClick = () => {
    if (onClick) onClick(estudiante);
  };

  if (isMobile) {
    const tipoBeca = estudiante.tipo_beca || 'Institucional';
    return (
      <button
        onClick={handleClick}
        className="w-full bg-white border border-slate-200 rounded-xl p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">
              {nombre}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{estudiante.cedula || '—'}</p>
            <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 truncate">{carrera}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {estudiante.en_mora && (
              <AlertTriangle size={14} className="text-red-500" />
            )}
            <ChevronRight size={14} className="text-slate-300 mt-1" />
          </div>
        </div>
        {/* Beca: porcentaje y tipo siempre visibles en su propia fila */}
        {estudiante.es_becado && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-indigo-100 text-indigo-600 rounded-lg">
              {estudiante.porcentaje_beca ?? 0}% beca
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {tipoBeca}
            </span>
          </div>
        )}
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
          <span>Sem. {estudiante.semestre_actual ?? '—'}</span>
          {estudiante.creditos_aprobados != null && <span>{estudiante.creditos_aprobados} créditos</span>}
        </div>
      </button>
    );
  }

  return (
    <tr
      onClick={handleClick}
      className="hover:bg-slate-50 transition-colors cursor-pointer group"
    >
      <td className="py-5 px-8">
        <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{nombre}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">{estudiante.cedula || '—'}</p>
      </td>
      <td className="py-5 px-8">
        <p className="text-sm font-bold text-slate-600 truncate max-w-[200px]">{carrera}</p>
      </td>
      <td className="py-5 px-8 text-center">
        <p className="font-black text-slate-900 italic">{estudiante.semestre_actual ?? '—'}</p>
      </td>
      <td className="py-5 px-8 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
          {estudiante.es_becado && (
            <>
              <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-indigo-500 text-indigo-600">
                Beca {estudiante.porcentaje_beca}%
              </span>
              <span className="text-[10px] font-bold text-slate-500">{estudiante.tipo_beca || 'Institucional'}</span>
            </>
          )}
          {estudiante.en_mora && (
            <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-red-500 text-red-600 flex items-center gap-1">
              <AlertTriangle size={10} /> Mora
            </span>
          )}
          {!estudiante.es_becado && !estudiante.en_mora && (
            <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-slate-200 text-slate-400">
              Activo
            </span>
          )}
        </div>
      </td>
      <td className="py-5 px-8 text-right">
        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors ml-auto" />
      </td>
    </tr>
  );
};

export default EstudianteRow;
