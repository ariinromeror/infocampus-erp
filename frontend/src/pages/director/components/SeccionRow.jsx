import { BookOpen, Users, Clock, Edit3 } from 'lucide-react';

const SeccionRow = ({ seccion, onEdit, onClick }) => {
  // El backend devuelve horario como string aplanado ("Lunes, Miércoles 08:00-10:00")
  // o como objeto { dias: [], hora_inicio, hora_fin }
  // También puede llegar null/undefined desde el populate antiguo
  const formatHorario = (h) => {
    if (!h) return 'Sin horario';
    if (typeof h === 'string' && h.trim()) return h.trim();
    if (typeof h === 'object') {
      const dias = Array.isArray(h.dias) ? h.dias.join(', ') : (h.dia || '');
      const hora = (h.hora_inicio && h.hora_fin) ? ` ${h.hora_inicio}–${h.hora_fin}` : '';
      const resultado = `${dias}${hora}`.trim();
      return resultado || 'Sin horario';
    }
    return 'Sin horario';
  };

  // El backend devuelve: seccion.materia (string), seccion.docente (string), seccion.horario (string aplanado)
  // SeccionRow también puede recibir: materia_nombre, profesor_nombre (desde otros contextos)
  const materiaNombre   = seccion.materia      || seccion.materia_nombre      || seccion.materia?.nombre  || 'Sin materia';
  const docenteNombre   = seccion.docente      || seccion.profesor_nombre     || seccion.profesor?.nombre || 'Sin docente asignado';
  const codigoSeccion   = seccion.codigo       || seccion.materia?.codigo     || '—';
  const inscritos       = seccion.cupo_actual  ?? seccion.inscritos           ?? 0;
  const cupoMax         = seccion.cupo_maximo  ?? seccion.cupo                ?? 0;
  const horarioTexto    = formatHorario(seccion.horario);

  return (
    <div
      onClick={() => onClick?.(seccion)}
      className="flex items-center gap-4 px-6 py-5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
    >
      <div className="h-11 w-11 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <BookOpen size={18} className="text-indigo-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black italic uppercase text-slate-900 truncate">
          {materiaNombre}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400">{codigoSeccion}</span>
          <span className="text-[11px] text-slate-500">|</span>
          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[180px]">
            {docenteNombre}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-right flex-shrink-0">
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5 text-slate-400 justify-end">
            <Users size={12} />
            <span className="text-[10px] font-bold">{inscritos}/{cupoMax}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 mt-1 justify-end">
            <Clock size={12} />
            <span className="text-[11px] font-medium truncate max-w-[120px]">{horarioTexto}</span>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(seccion); }}
            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
          >
            <Edit3 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SeccionRow;