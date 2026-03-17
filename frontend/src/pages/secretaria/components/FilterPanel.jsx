import { Filter, X } from 'lucide-react';

const FilterPanel = ({ 
  isOpen = false, 
  onToggle, 
  onClear, 
  hasFilters = false,
  children 
}) => {
  return (
    <>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
          hasFilters
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
        }`}
      >
        <Filter size={15} />
        <span className="hidden sm:inline">Filtros</span>
        {hasFilters && (
          <span className="bg-white text-indigo-600 rounded-full w-4 h-4 text-[11px] flex items-center justify-center font-black">
            !
          </span>
        )}
      </button>

      {isOpen && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
          {hasFilters && onClear && (
            <button 
              onClick={onClear} 
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
            >
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default FilterPanel;
