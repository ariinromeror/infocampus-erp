import { motion } from 'framer-motion';

const EmptyState = ({
  icon: Icon,
  titulo = 'Sin datos',
  subtitulo = '',
  accion = null,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35 }}
    className="bg-white border border-slate-100 rounded-2xl p-8 sm:p-16 lg:p-20 text-center shadow-sm"
  >
    {Icon && (
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 mb-5">
        <Icon size={32} className="text-slate-200" />
      </div>
    )}
    <p className="font-black text-slate-500 uppercase italic text-xl tracking-tight">{titulo}</p>
    {subtitulo && (
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{subtitulo}</p>
    )}
    {accion && <div className="mt-8">{accion}</div>}
  </motion.div>
);

export default EmptyState;
