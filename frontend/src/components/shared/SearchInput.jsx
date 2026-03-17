import { Search, X } from 'lucide-react';

const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search
      size={15}
      className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
    />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      className="
        w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2.5 sm:py-3.5
        bg-white border border-slate-200 rounded-xl
        text-sm font-semibold text-slate-900 placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent
        transition-all duration-200
      "
    />
    {value && (
      <button
        onClick={() => onChange?.('')}
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-600 rounded-lg transition-colors"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default SearchInput;
