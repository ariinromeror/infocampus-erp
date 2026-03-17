import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:   { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.12 } },
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, titulo, mensaje, confirmText = 'Confirmar', danger = false, loading = false }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:pl-72">
        <motion.div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !loading && onClose()}
        />
        <motion.div
          variants={panelVariants}
          initial="hidden" animate="show" exit="exit"
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
        >
          <button
            onClick={() => !loading && onClose()}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 rounded-xl transition-colors"
            disabled={loading}
          >
            <X size={16} />
          </button>
          <div className={`w-14 h-14 ${danger ? 'bg-rose-50' : 'bg-amber-50'} rounded-xl flex items-center justify-center mx-auto mb-5`}>
            <AlertTriangle size={26} className={danger ? 'text-rose-500' : 'text-amber-500'} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-center text-slate-900 mb-2">{titulo}</h3>
          <p className="text-sm text-slate-500 text-center mb-7 leading-relaxed">{mensaje}</p>
          <div className="flex gap-3">
            <button
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default ConfirmModal;
