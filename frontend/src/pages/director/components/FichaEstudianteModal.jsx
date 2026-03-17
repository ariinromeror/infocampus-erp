import { X, GraduationCap, DollarSign, BookOpen, FileDown, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

const FichaEstudianteModal = ({ isOpen, onClose, detalle, onVerSeccion }) => {
  if (!isOpen || !detalle) return null;

  const handlePDFNotas       = () => academicoService.getReporteNotas(detalle.id).catch(console.error);
  const handlePDFEstadoCuenta = () => academicoService.descargarPDF(detalle.id).catch(console.error);

  const enMora     = detalle.en_mora;
  const deuda      = parseFloat(detalle.deuda_total || 0);
  const esBecado   = detalle.es_becado;
  const porcentaje = detalle.porcentaje_beca || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                {detalle.nombre_completo?.[0] || detalle.nombre?.[0] || '?'}
              </div>
              <div>
                <h2 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-tight">
                  {detalle.nombre_completo || detalle.nombre}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{detalle.cedula || detalle.username} · {detalle.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {enMora ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase">
                      <AlertTriangle size={10} /> En Mora
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">
                      <CheckCircle size={10} /> Al Día
                    </span>
                  )}
                  {esBecado && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase">
                      <Award size={10} /> Becado {porcentaje}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex-shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Carrera',  value: detalle.carrera_nombre || detalle.carrera?.nombre || '—', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Semestre', value: detalle.semestre_actual ? `${detalle.semestre_actual}°` : (detalle.semestre ? `${detalle.semestre}°` : '—'), icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Créditos Aprobados', value: detalle.creditos_aprobados ?? '—', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Deuda Total', value: `$${deuda.toFixed(2)}`, icon: DollarSign, color: deuda > 0 ? 'text-rose-600' : 'text-slate-500', bg: deuda > 0 ? 'bg-rose-50' : 'bg-slate-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4`}>
                <div className={`w-7 h-7 bg-white/60 rounded-lg flex items-center justify-center mb-2`}>
                  <Icon size={14} className={color} />
                </div>
                <p className={`text-lg font-black ${color} leading-none`}>{value}</p>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Inscripciones */}
          {detalle.inscripciones?.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
                Inscripciones ({detalle.inscripciones.length})
              </p>
              <div className="space-y-2">
                {detalle.inscripciones.map((ins, i) => {
                  const nota   = ins.nota_final != null ? parseFloat(ins.nota_final) : null;
                  const aprobado = nota != null && nota >= 7;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{ins.materia_nombre || ins.materia?.nombre}</p>
                        <p className="text-[10px] text-slate-400">{ins.periodo} · {ins.seccion || ins.materia_codigo}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          ins.estado === 'activa' ? 'bg-indigo-50 text-indigo-600' :
                          aprobado               ? 'bg-emerald-50 text-emerald-600' :
                          nota != null           ? 'bg-rose-50 text-rose-600' :
                                                   'bg-slate-100 text-slate-500'
                        }`}>
                          {nota != null ? nota.toFixed(2) : ins.estado || 'Activa'}
                        </span>
                        {onVerSeccion && ins.seccion_id && (
                          <button
                            onClick={() => onVerSeccion(ins)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-700 transition-all"
                          >
                            Ver
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer — PDF Actions */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={handlePDFNotas}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-700 transition-colors"
          >
            <FileDown size={14} /> Boletín Notas
          </button>
          <button
            onClick={handlePDFEstadoCuenta}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
          >
            <FileDown size={14} /> Estado Cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default FichaEstudianteModal;
