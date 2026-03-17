const Loader = ({ mensaje = 'Cargando...' }) => (
  <div className="flex items-center gap-3 px-5 py-4 bg-teal-50 border border-teal-100 rounded-2xl w-fit">
    <div className="h-4 w-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">{mensaje}</p>
  </div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`rounded-xl bg-slate-50 border border-slate-100 animate-pulse h-32 ${className}`} />
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="space-y-2">
    <div className="h-12 bg-slate-100 rounded-2xl animate-pulse opacity-60" />
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-16 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"
        style={{ opacity: 1 - i * 0.14 }}
      />
    ))}
  </div>
);

export const SkeletonGrid = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} style={{ opacity: 1 - i * 0.15 }} />
    ))}
  </div>
);

export default Loader;
