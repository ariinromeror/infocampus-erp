import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const CFG = {
  danger:  { btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',   iconBg: 'bg-rose-50',   IconEl: AlertTriangle,  iconColor: 'text-rose-600' },
  warning: { btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200', iconBg: 'bg-amber-50',  IconEl: AlertTriangle,  iconColor: 'text-amber-600' },
  success: { btn: 'bg-teal-600 hover:bg-teal-700 shadow-teal-200',   iconBg: 'bg-teal-50',   IconEl: CheckCircle2,   iconColor: 'text-teal-600' },
  primary: { btn: 'bg-slate-900 hover:bg-teal-600 shadow-slate-200', iconBg: 'bg-slate-50',  IconEl: AlertTriangle,  iconColor: 'text-slate-600' },
};

const ConfirmModal = ({
  isOpen = false,
  onClose,
  onConfirm,
  titulo = '¿Estás seguro?',
  mensaje = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'danger',
  loading = false,
}) => {
  const c = CFG[variante] || CFG.primary;
  const { IconEl } = c;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={!loading ? onClose : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white rounded-xl p-8 sm:p-10 max-w-md w-full shadow-2xl"
          >
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-0"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className={`p-3 rounded-2xl ${c.iconBg}`}>
                <IconEl size={22} className={c.iconColor} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight leading-tight">
                {titulo}
              </h3>
            </div>

            {mensaje && (
              <p className="text-sm text-slate-500 mb-7 leading-relaxed">{mensaje}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-slate-400 disabled:opacity-40 transition-all"
              >
                {textoCancelar}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${c.btn}`}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : textoConfirmar}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
