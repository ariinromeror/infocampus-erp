import { useAuth } from '../../../context/AuthContext';
import useEstudiante from '../hooks/useEstudiante';
import useNotas from '../hooks/useNotas';
import { ShieldCheck, GraduationCap, BookMarked } from 'lucide-react';

const EstatusPage = () => {
  const { user } = useAuth();
  const { estudiante, loading: loadEst } = useEstudiante();
  const { notas, loading: loadNotas } = useNotas();

  const loading = loadEst || loadNotas;

  if (loading) return (
    <div className="p-10 animate-pulse font-black text-slate-500 uppercase italic tracking-widest">
      Sincronizando expediente...
    </div>
  );

  const carrera = user?.carrera || estudiante?.carrera_nombre || '—';
  const creditosAprobados = estudiante?.creditos_aprobados ?? 0;
  const creditosTotales = estudiante?.creditos_totales ?? null;
  const progreso = creditosTotales ? Math.round((creditosAprobados / creditosTotales) * 100) : null;
  const materiasActivas = Array.isArray(notas) ? notas.filter(n => !n.nota_final).length : 0;

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Estatus <span className="text-indigo-600">Académico</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Información de registro y beneficios activos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <ShieldCheck className="absolute right-[-20px] top-[-20px] size-40 sm:size-48 opacity-10 -rotate-12" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-6">
              Beneficios Vigentes
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase italic text-slate-400 mb-3">Beca Institucional</h3>
                {estudiante?.es_becado ? (
                  <div className="flex items-center gap-4">
                    <span className="text-4xl sm:text-5xl font-black italic">{estudiante.porcentaje_beca}%</span>
                    {estudiante.tipo_beca && (
                      <span className="px-3 py-1 bg-indigo-500 rounded-full text-[11px] font-black uppercase">
                        {estudiante.tipo_beca}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-black italic text-slate-500">Sin beca</p>
                )}
              </div>

              <div className="pt-5 border-t border-white/10">
                <h3 className="text-sm font-black uppercase italic text-slate-400 mb-3">Convenio Laboral</h3>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${estudiante?.convenio_activo ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="text-base font-bold uppercase tracking-tight">
                    {estudiante?.convenio_activo ? 'Activo / Vigente' : 'No Registrado'}
                  </span>
                </div>
                {estudiante?.convenio_activo && estudiante?.fecha_limite_convenio && (
                  <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                    Vence: {new Date(estudiante.fecha_limite_convenio).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>

              <div className="pt-5 border-t border-white/10">
                <h3 className="text-sm font-black uppercase italic text-slate-400 mb-3">Estado de Mora</h3>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${estudiante?.en_mora ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span className="text-base font-bold uppercase tracking-tight">
                    {estudiante?.en_mora ? 'En Mora' : 'Al Día'}
                  </span>
                </div>
                {estudiante?.deuda_total > 0 && (
                  <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
                    Deuda: ${parseFloat(estudiante.deuda_total).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-8 sm:p-10 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-start gap-3 mb-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl flex-shrink-0">
                <GraduationCap size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carrera</p>
                <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase italic leading-tight">
                  {carrera}
                </h2>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Materias en Curso</p>
                  <p className="text-3xl font-black text-slate-900 italic">{materiasActivas}</p>
                </div>
                <BookMarked className="text-slate-200" size={36} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Semestre</p>
                  <p className="text-2xl font-black italic text-slate-900">{estudiante?.semestre_actual ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Créditos</p>
                  <p className="text-2xl font-black italic text-slate-900">{creditosAprobados}</p>
                </div>
              </div>

              {progreso !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                    <span>Progreso de Malla</span>
                    <span>{progreso}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(progreso, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {estudiante?.promedio_acumulado != null && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Promedio Acumulado</p>
                  <p className={`text-3xl font-black italic ${parseFloat(estudiante.promedio_acumulado) >= 7 ? 'text-slate-900' : 'text-amber-600'}`}>
                    {parseFloat(estudiante.promedio_acumulado).toFixed(1)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstatusPage;