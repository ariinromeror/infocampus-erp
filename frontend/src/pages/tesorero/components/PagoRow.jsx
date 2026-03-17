import { motion } from 'framer-motion';
import { CheckCircle2, Clock, CreditCard, Banknote, ArrowLeftRight, Building2 } from 'lucide-react';

const fmt = n => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtFecha = f => f
  ? new Date(f).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const METODOS = {
  efectivo:      { label: 'Efectivo',      cls: 'bg-teal-50 text-teal-700 border-teal-200',      Icon: Banknote },
  transferencia: { label: 'Transferencia', cls: 'bg-blue-50 text-blue-700 border-blue-200',       Icon: ArrowLeftRight },
  tarjeta:       { label: 'Tarjeta',       cls: 'bg-violet-50 text-violet-700 border-violet-200', Icon: CreditCard },
  deposito:      { label: 'Depósito',      cls: 'bg-amber-50 text-amber-700 border-amber-200',    Icon: Building2 },
};

const MetodoBadge = ({ tipo }) => {
  const m = METODOS[tipo] || { label: tipo || '—', cls: 'bg-slate-50 text-slate-500 border-slate-200', Icon: CreditCard };
  const { Icon } = m;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl border ${m.cls}`}>
      <Icon size={10} />{m.label}
    </span>
  );
};

const EstadoBadge = ({ completado }) =>
  completado ? (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700">
      <CheckCircle2 size={10} />Pagado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
      <Clock size={10} />Pendiente
    </span>
  );

const PagoRow = ({ pago, isMobile = false, index = 0 }) => {
  const completado = pago.estado === 'completado';

  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="bg-white border border-slate-100 rounded-2xl p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">
              {pago.estudiante || '—'}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{pago.cedula || '—'}</p>
            <p className="text-[10px] font-semibold text-slate-500 mt-1">{pago.concepto || pago.periodo || '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <p className="font-black italic text-slate-900 text-lg leading-none">{fmt(pago.monto)}</p>
            <EstadoBadge completado={completado} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
          <MetodoBadge tipo={pago.metodo_pago} />
          <span className="text-[10px] font-semibold text-slate-400">{fmtFecha(pago.fecha_pago)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-0"
    >
      <td className="py-4 px-7">
        <p className="font-black text-slate-900 uppercase text-[13px] tracking-tight leading-none">
          {pago.estudiante || '—'}
        </p>
        <p className="text-[10px] text-slate-400 font-semibold mt-1">{pago.cedula || '—'}</p>
      </td>
      <td className="py-4 px-7">
        <p className="text-sm font-semibold text-slate-500">{pago.concepto || pago.periodo || '—'}</p>
      </td>
      <td className="py-4 px-7">
        <p className="font-black italic text-slate-900 text-base">{fmt(pago.monto)}</p>
      </td>
      <td className="py-4 px-7">
        <MetodoBadge tipo={pago.metodo_pago} />
      </td>
      <td className="py-4 px-7">
        <p className="text-sm font-semibold text-slate-500">{fmtFecha(pago.fecha_pago)}</p>
      </td>
      <td className="py-4 px-7 text-center">
        <EstadoBadge completado={completado} />
      </td>
    </motion.tr>
  );
};

export default PagoRow;
