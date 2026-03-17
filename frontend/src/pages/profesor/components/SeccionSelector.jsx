import { useState, useMemo } from 'react';
import { ChevronDown, X, Check, BookOpen } from 'lucide-react';

const SeccionSelector = ({ secciones = [], loading = false, value, onChange, placeholder = 'Seleccionar sección' }) => {
  const [open, setOpen] = useState(false);

  const selected = secciones.find(s => String(s.id) === String(value));

  const porPeriodo = useMemo(() => {
    return secciones.reduce((acc, s) => {
      const key = s.periodo || 'Sin período';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [secciones]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger: El botón que ves en la página */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:border-indigo-300 hover:bg-slate-50 transition-all duration-200 disabled:opacity-50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen size={16} className="text-slate-400 shrink-0" />
          {selected ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">
                {selected.materia}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {selected.codigo || selected.materia_codigo} · {selected.periodo}
              </p>
            </div>
          ) : (
            <span className="text-sm text-slate-400">
              {loading ? 'Cargando secciones...' : placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* MODAL SYSTEM */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center lg:pl-72">
          
          {/* Backdrop: Fondo oscuro que bloquea el resto de la web */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setOpen(false)}
          />

          {/* Panel Flotante: Ya no usa 'absolute' para no mover el layout de abajo */}
          <div 
            className="relative w-full lg:max-w-xl bg-white rounded-t-[2rem] lg:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300"
            style={{ maxHeight: 'min(85vh, 600px)' }}
          >
            {/* Header del Buscador */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Seleccionar Sección</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Listado Académico</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de Secciones con Scroll independiente */}
            <div className="overflow-y-auto flex-1 p-4 space-y-6">
              {Object.entries(porPeriodo).map(([periodo, items]) => (
                <div key={periodo} className="space-y-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] px-3">
                    {periodo}
                  </p>
                  <div className="space-y-1">
                    {items.map(s => {
                      const isActive = String(s.id) === String(value);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelect(s.id)}
                          className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-200 ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                              : 'hover:bg-slate-50 active:scale-[0.98]'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-tight truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                              {s.materia}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[11px] font-medium ${isActive ? 'text-slate-300' : 'text-indigo-600'}`}>
                                {s.codigo || s.materia_codigo}
                              </span>
                              {s.aula && (
                                <span className={`text-[11px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                                  • {s.aula}
                                </span>
                              )}
                              {s.horario && (
                                <span className={`text-[11px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                                  • {s.horario}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            {s.inscritos != null && (
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {s.inscritos} ALUMNOS
                              </span>
                            )}
                            {isActive && <Check size={18} className="text-indigo-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {secciones.length === 0 && !loading && (
                <div className="py-20 text-center">
                  <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                    <BookOpen size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin secciones asignadas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SeccionSelector;