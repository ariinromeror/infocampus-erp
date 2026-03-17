import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, Users, MapPin, Clock } from 'lucide-react';
import useSecciones from '../hooks/useSecciones';

const SeccionesPage = () => {
  const { secciones, loading, error } = useSecciones();
  const navigate = useNavigate();

  const porPeriodo = useMemo(() => {
    return secciones.reduce((acc, s) => {
      const key = s.periodo || 'Sin período';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [secciones]);

  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-4">
      <AlertCircle size={24} />
      <p className="text-sm font-semibold">Error al cargar las secciones</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Mis Secciones</h1>
        <p className="text-sm text-slate-500 mt-1">Agrupadas por período</p>
      </div>

      {loading && (
        <div className="space-y-6 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-slate-200 rounded-full w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(j => <div key={j} className="h-36 bg-slate-100 rounded-2xl" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && Object.keys(porPeriodo).length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-sm">No tienes secciones asignadas</p>
        </div>
      )}

      {!loading && Object.entries(porPeriodo).map(([periodo, items]) => (
        <div key={periodo} className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{periodo}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(seccion => (
              <button
                key={seccion.id}
                onClick={() => navigate(`/profesor/secciones/${seccion.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-500 mb-1">{seccion.codigo || seccion.materia_codigo}</p>
                    <p className="text-base font-bold text-slate-800 leading-tight">{seccion.materia}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
                </div>
                <div className="space-y-1 mb-4">
                  {seccion.aula && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{seccion.aula}</span>
                    </div>
                  )}
                  {seccion.horario && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{seccion.horario}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users size={14} />
                    <span className="text-sm font-medium">{seccion.inscritos}/{seccion.cupo_maximo}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{seccion.creditos} cr</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SeccionesPage;
