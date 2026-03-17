import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen = false, 
  onClose, 
  onConfirm, 
  titulo = '¿Estás seguro?',
  mensaje = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'danger',
  loading = false
}) => {
  if (!isOpen) return null;

  const variantes = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-500 hover:bg-amber-600',
    primary: 'bg-slate-900 hover:bg-indigo-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl p-8 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-2xl ${variante === 'danger' ? 'bg-red-100' : variante === 'warning' ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <AlertTriangle size={24} className={variante === 'danger' ? 'text-red-600' : variante === 'warning' ? 'text-amber-600' : 'text-slate-600'} />
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{titulo}</h3>
        </div>

        {mensaje && (
          <p className="text-sm text-slate-600 mb-6">{mensaje}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 disabled:opacity-50 transition-all"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${variantes[variante]}`}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </>
            ) : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
