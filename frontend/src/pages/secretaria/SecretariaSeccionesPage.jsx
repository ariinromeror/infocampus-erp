import { useState, useMemo } from 'react';
import { BookOpen, Users, MapPin, Clock, X, Loader2 } from 'lucide-react';
import useSecciones from './hooks/useSecciones';
import EmptyState from '../../components/shared/EmptyState';
import { SkeletonGrid } from '../../components/shared/Loader';

const SecretariaSeccionesPage = () => {
  const { secciones, periodos, loading, error, fetchEstudiantesSeccion } = useSecciones();
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(null);
  const [estudiantesSeccion, setEstudiantesSeccion] = useState([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);

  const seccionesFiltradas = useMemo(() => {
    if (!filtroPeriodo) return secciones;
    return secciones.filter(s => 
      String(s.periodo_id) === filtroPeriodo || 
      s.periodo === periodos.find(p => String(p.id) === filtroPeriodo)?.nombre
    );
  }, [secciones, filtroPeriodo, periodos]);

  const porPeriodo = useMemo(() => {
    return seccionesFiltradas.reduce((acc, s) => {
      const key = s.periodo || 'Sin período';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [seccionesFiltradas]);

  const handleSeccionClick = async (sec) => {
    setSeccionSeleccionada(sec);
    setLoadingEstudiantes(true);
    const data = await fetchEstudiantesSeccion(sec.id);
    setEstudiantesSeccion(data?.estudiantes || []);
    setLoadingEstudiantes(false);
  };

  const cerrarModal = () => {
    setSeccionSeleccionada(null);
    setEstudiantesSeccion([]);
  };

  if (error) return (
    <div className="p-10 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-center">
      <p className="font-black uppercase tracking-widest text-sm">Error al cargar secciones</p>
    </div>
  );

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Directorio <span className="text-indigo-600">Secciones</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {loading ? 'Cargando...' : `${secciones.length} secciones registradas`}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
          Solo lectura — Secretaria puede ver secciones pero no crearlas ni editarlas
        </p>
      </div>

      {periodos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroPeriodo('')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              !filtroPeriodo ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
            }`}
          >
            Todos
          </button>
          {periodos.map(p => (
            <button
              key={p.id}
              onClick={() => setFiltroPeriodo(String(p.id))}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                filtroPeriodo === String(p.id) ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : seccionesFiltradas.length === 0 ? (
        <EmptyState icon={BookOpen} titulo="Sin secciones registradas" subtitulo={filtroPeriodo ? 'Intenta seleccionar otro período' : ''} />
      ) : (
        Object.entries(porPeriodo).map(([periodo, items]) => (
          <div key={periodo} className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">{periodo}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(sec => {
                const inscritos = sec.inscritos || sec.cupo_actual || 0;
                const pct = sec.cupo_maximo ? Math.round(inscritos / sec.cupo_maximo * 100) : 0;
                const llena = pct >= 100;
                return (
                  <button
                    key={sec.id}
                    onClick={() => handleSeccionClick(sec)}
                    className="text-left bg-white border border-slate-100 rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-full"
                  >
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">{sec.codigo || '—'}</p>
                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight leading-tight">{sec.materia || '—'}</p>
                      </div>
                      {llena && (
                        <span className="text-[11px] font-black uppercase px-2 py-1 bg-red-100 text-red-600 rounded-sm flex-shrink-0">Llena</span>
                      )}
                    </div>
                    <div className="space-y-1.5 mb-4">
                      {sec.aula && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                          <MapPin size={11} className="flex-shrink-0" /> {sec.aula}
                        </div>
                      )}
                      {sec.docente && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                          <Clock size={11} className="flex-shrink-0" /> {sec.docente}
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
                          <Users size={11} /> {inscritos} / {sec.cupo_maximo || '—'}
                        </div>
                        <span className={`text-[10px] font-black ${llena ? 'text-red-500' : 'text-slate-400'}`}>{pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${llena ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                  );
                })}
            </div>
          </div>
        ))
      )}

      {seccionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={cerrarModal} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-100 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{seccionSeleccionada.codigo}</p>
                <h2 className="text-xl font-black text-slate-900 uppercase">{seccionSeleccionada.materia}</h2>
              </div>
              <button
                onClick={cerrarModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                {estudiantesSeccion.length} estudiante{estudiantesSeccion.length !== 1 ? 's' : ''} inscrito{estudiantesSeccion.length !== 1 ? 's' : ''}
              </p>
              
              {loadingEstudiantes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="text-indigo-600 animate-spin" />
                </div>
              ) : estudiantesSeccion.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay estudiantes inscritos</p>
              ) : (
                <div className="space-y-3">
                  {estudiantesSeccion.map(est => (
                    <div key={est.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div>
                        <p className="font-black text-slate-900 uppercase text-sm">{est.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{est.cedula} • {est.carrera}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        {est.pagado ? (
                          <span className="text-[11px] font-black uppercase px-2 py-1 bg-emerald-100 text-emerald-600 rounded-sm">Pagado</span>
                        ) : (
                          <span className="text-[11px] font-black uppercase px-2 py-1 bg-amber-100 text-amber-600 rounded-sm">Pendiente</span>
                        )}
                        {est.nota_final !== null ? (
                          <span className={`text-sm font-black ${
                            est.nota_final >= 70 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {est.nota_final}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-slate-400">Sin nota</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretariaSeccionesPage;