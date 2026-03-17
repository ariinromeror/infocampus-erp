/**
 * Design tokens — UX/UI unificado para todos los roles.
 * Referencia: Coordinador (mejor logrado).
 * Usar estas constantes para mantener consistencia.
 */
export const UI = {
  // Inputs
  input:
    'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white',
  inputDisabled:
    'w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed',

  // Botones
  btnPrimary:
    'px-5 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors',
  btnSecondary:
    'px-5 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase text-slate-600 hover:border-slate-400 transition-colors',
  btnDanger: 'px-5 py-3 bg-rose-600 text-white rounded-xl text-[11px] font-black uppercase hover:bg-rose-700',
  btnRetry:
    'flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700',

  // Error state
  errorContainer:
    'p-10 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex flex-col sm:flex-row items-center gap-6',
  errorTitle: 'text-[10px] font-black uppercase tracking-widest',
  errorSubtitle: 'text-sm mt-2 text-amber-700',

  // Espaciado
  spaceContainer: 'space-y-6 sm:space-y-8 overflow-x-hidden',
  gridKpis: 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
  sectionTitle: 'text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4',

  // Cards
  card: 'bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm',
  cardAction:
    'rounded-xl p-6 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200',
};

// Motion variants (Coordinador)
export const motionVariants = {
  container: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } },
};
