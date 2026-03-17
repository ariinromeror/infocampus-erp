import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, ChevronRight, BookOpen, Calendar } from 'lucide-react';

const fmt = n => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const DebtPill = ({ monto }) => {
  const cfg =
    monto > 600 ? 'bg-rose-600 text-white shadow-rose-200' :
    monto > 300 ? 'bg-orange-500 text-white shadow-orange-200' :
    monto > 100 ? 'bg-amber-400 text-white shadow-amber-200' :
                  'bg-slate-200 text-slate-700 shadow-slate-100';

  return (
    <span className={`inline-block font-black italic text-sm px-3 py-1 rounded-xl shadow-md ${cfg}`}>
      {fmt(monto)}
    </span>
  );
};

const StatusBadge = ({ tieneConvenio, fecha }) => {
  if (tieneConvenio) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
        <ShieldCheck size={10} />
        Convenio {fecha && `· ${new Date(fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
      <AlertTriangle size={10} />
      En Mora
    </span>
  );
};

const MoraRow = ({ estudiante, isMobile = false, index = 0 }) => {
  const navigate = useNavigate();
  const tieneConvenio = estudiante.convenio_activo;
  const fecha = estudiante.fecha_limite_convenio;

  const handleClick = () => navigate(`/tesorero/estudiante/${estudiante.id}`);

  if (isMobile) {
    return (
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.35 }}
        onClick={handleClick}
        className="w-full bg-white border border-slate-100 rounded-2xl p-5 text-left
          hover:border-teal-300 hover:shadow-md transition-all active:scale-[0.99] group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">
              {estudiante.nombre || '—'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{estudiante.cedula || '—'}</p>
            <p className="text-[10px] font-bold text-teal-600 mt-1 truncate">{estudiante.carrera || '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <DebtPill monto={estudiante.deuda_total} />
            <StatusBadge tieneConvenio={tieneConvenio} fecha={fecha} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 text-[10px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <BookOpen size={10} />
            {estudiante.inscripciones_pendientes || 0} materias pendientes
          </span>
          <ChevronRight size={13} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={handleClick}
      className="cursor-pointer group hover:bg-teal-50/30 transition-colors border-b border-slate-50 last:border-0"
    >
      <td className="py-4 px-7">
        <p className="font-black text-slate-900 uppercase text-[13px] tracking-tight leading-none">
          {estudiante.nombre || '—'}
        </p>
        <p className="text-[10px] text-slate-400 font-semibold mt-1">{estudiante.cedula || '—'}</p>
      </td>
      <td className="py-4 px-7">
        <span className="text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
          {estudiante.carrera || '—'}
        </span>
      </td>
      <td className="py-4 px-7">
        <DebtPill monto={estudiante.deuda_total} />
      </td>
      <td className="py-4 px-7 text-center">
        <span className="font-black text-slate-800 text-sm">
          {estudiante.inscripciones_pendientes || 0}
        </span>
      </td>
      <td className="py-4 px-7">
        <StatusBadge tieneConvenio={tieneConvenio} fecha={fecha} />
      </td>
      <td className="py-4 px-7 text-right">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-teal-100 transition-colors">
          <ChevronRight size={14} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
        </div>
      </td>
    </motion.tr>
  );
};

export default MoraRow;
