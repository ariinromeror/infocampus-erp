import { User, Edit3, CheckCircle, XCircle } from 'lucide-react';

const NotaRow = ({ nota, onCorregir }) => {
  const notaFinal = nota.nota_final ?? nota.nota ?? 0;
  const aprobado = notaFinal >= 7;

  return (
    <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
      <div className="h-11 w-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-black text-indigo-600">
          {(nota.estudiante_nombre || nota.nombre || 'U').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black italic uppercase text-slate-900 truncate">
          {nota.estudiante_nombre || nota.nombre}
        </p>
        <p className="text-[10px] font-medium text-slate-500 mt-0.5">
          {nota.cedula || nota.estudiante_cedula || '—'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center px-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Nota</p>
          <p className={`text-xl font-black ${aprobado ? 'text-emerald-600' : 'text-rose-600'}`}>
            {notaFinal.toFixed(1)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {aprobado ? (
            <CheckCircle size={18} className="text-emerald-500" />
          ) : (
            <XCircle size={18} className="text-rose-500" />
          )}
        </div>
        {onCorregir && (
          <button
            onClick={() => onCorregir(nota)}
            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            <Edit3 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotaRow;
