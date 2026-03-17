import { ShieldCheck } from 'lucide-react';

const ROL_BADGE = {
  estudiante:     'border-indigo-300 text-indigo-600',
  profesor:       'border-emerald-400 text-emerald-700',
  administrativo: 'border-amber-400 text-amber-700',
  coordinador:    'border-purple-400 text-purple-700',
  tesorero:       'border-blue-400 text-blue-700',
  director:       'border-red-400 text-red-600',
};

const ROL_LABELS = {
  estudiante: 'Estudiante',
  profesor: 'Profesor',
  administrativo: 'Secretaría',
  coordinador: 'Coordinador',
  tesorero: 'Tesorero',
  director: 'Director',
};

const UsuarioRow = ({ usuario, isMobile = false }) => {
  const nombre = usuario.nombre || usuario.nombre_completo || 
    `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() || '—';
  const rolLabel = ROL_LABELS[usuario.rol] || usuario.rol;

  if (isMobile) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">
              {nombre}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{usuario.cedula || '—'}</p>
            <p className="text-[10px] font-bold text-slate-400">{usuario.email || '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[11px] font-black uppercase px-2 py-1 border-2 ${ROL_BADGE[usuario.rol] || 'border-slate-300 text-slate-500'}`}>
              {rolLabel}
            </span>
            {usuario.activo === false && (
              <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-red-100 text-red-600 rounded-sm">
                Inactivo
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="py-5 px-8">
        <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{nombre}</p>
      </td>
      <td className="py-5 px-8 text-sm font-bold text-slate-500">{usuario.cedula || '—'}</td>
      <td className="py-5 px-8 text-sm font-bold text-slate-500 truncate max-w-[180px]">{usuario.email || '—'}</td>
      <td className="py-5 px-8 text-center">
        <span className={`text-[11px] font-black uppercase px-3 py-1 border-2 ${ROL_BADGE[usuario.rol] || 'border-slate-300 text-slate-500'}`}>
          {rolLabel}
        </span>
      </td>
      <td className="py-5 px-8 text-center">
        {usuario.activo !== false ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-3 py-1 border-2 border-emerald-400 text-emerald-600">
            <ShieldCheck size={10} /> Activo
          </span>
        ) : (
          <span className="text-[11px] font-black uppercase px-3 py-1 border-2 border-red-400 text-red-600">
            Inactivo
          </span>
        )}
      </td>
    </tr>
  );
};

export default UsuarioRow;
