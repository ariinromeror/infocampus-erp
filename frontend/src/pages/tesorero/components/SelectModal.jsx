import { useState, useMemo } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';

const SelectModal = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Seleccionar...',
  label = '',
  searchPlaceholder = 'Buscar...',
  valueKey = 'id',
  labelKey = 'nombre',
  disabled = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find(o => String(o[valueKey]) === String(value));

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => 
      String(o[labelKey] || '').toLowerCase().includes(q) ||
      String(o.codigo || o.cedula || '').toLowerCase().includes(q)
    );
  }, [options, search, labelKey]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2 hover:border-indigo-300 hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className={`text-sm truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected ? selected[labelKey] : placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center lg:pl-72">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => { setOpen(false); setSearch(''); }}
          />

          <div 
            className="relative w-full lg:max-w-md bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300"
            style={{ maxHeight: 'min(70vh, 500px)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <p className="text-sm font-bold text-slate-800">{label || placeholder}</p>
              <button
                onClick={() => { setOpen(false); setSearch(''); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-2 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">No se encontraron resultados</p>
                </div>
              ) : (
                filteredOptions.map(opt => {
                  const isActive = String(opt[valueKey]) === String(value);
                  return (
                    <button
                      key={opt[valueKey]}
                      type="button"
                      onClick={() => handleSelect(opt[valueKey])}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{opt[labelKey]}</p>
                        {opt.codigo && (
                          <p className="text-xs text-slate-400">{opt.codigo}</p>
                        )}
                      </div>
                      {isActive && <Check size={16} className="text-indigo-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectModal;
