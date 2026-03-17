import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:   { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.12 } },
};

const NotifModal = ({ isOpen, onClose, titulo, mensaje, tipo = 'success' }) => {
  const ok = tipo === 'success';
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:pl-72">
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            variants={panelVariants}
            initial="hidden" animate="show" exit="exit"
            className="relative bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 rounded-xl transition-colors">
              <X size={16} />
            </button>
            <div className={`w-14 h-14 ${ok ? 'bg-emerald-50' : 'bg-rose-50'} rounded-xl flex items-center justify-center mx-auto mb-5`}>
              {ok
                ? <CheckCircle2 size={28} className="text-emerald-600" strokeWidth={1.5} />
                : <AlertCircle  size={28} className="text-rose-600"    strokeWidth={1.5} />}
            </div>
            <h3 className="text-lg font-bold text-center text-slate-900 mb-2">{titulo}</h3>
            <p className="text-sm text-slate-500 text-center mb-7 whitespace-pre-line leading-relaxed">{mensaje}</p>
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors ${ok ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              Entendido
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotifModal;
