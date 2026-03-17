import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

// Definición de los campos configurables con metadata
const CAMPOS = [
  { clave: 'reglas_asistencia_minima',   label: 'Asistencia mínima requerida', sub: '% mínimo de clases asistidas para aprobar', tipo: 'number', min: 0, max: 100, sufijo: '%' },
  { clave: 'nota_minima_aprobacion',     label: 'Nota mínima de aprobación',   sub: 'Nota sobre 20 para aprobar una materia',    tipo: 'number', min: 0, max: 20,  sufijo: '/20' },
  { clave: 'dias_gracia_pago',           label: 'Días de gracia para pago',    sub: 'Días después de inscripción antes de cobrar mora', tipo: 'number', min: 0, max: 90, sufijo: 'días' },
  { clave: 'porcentaje_beca_excelencia', label: '% Beca excelencia',           sub: 'Porcentaje de descuento para beca académica',  tipo: 'number', min: 0, max: 100, sufijo: '%' },
  { clave: 'max_materias_semestre',      label: 'Máx. materias por semestre',  sub: 'Límite de inscripciones por período',          tipo: 'number', min: 1, max: 20,  sufijo: 'mat.' },
];

const ConfiguracionPage = () => {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [valores,  setValores]  = useState({});
  const [original, setOriginal] = useState({});
  const [result,   setResult]   = useState(null); // { tipo: 'success'|'error', msg }

  useEffect(() => {
    const load = async () => {
      try {
        // La IA context tiene las políticas — reutilizamos
        const res  = await academicoService.getIAContexto();
        const pols = res.data?.politicas_institucionales || {};
        setValores({ ...pols });
        setOriginal({ ...pols });
      } catch {
        // Valores por defecto si no hay config
        const defaults = {};
        CAMPOS.forEach(c => { defaults[c.clave] = ''; });
        setValores(defaults);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      // Guardar cada clave modificada
      const modificadas = Object.entries(valores).filter(([k, v]) => String(v) !== String(original[k] || ''));
      if (!academicoService.actualizarConfiguracion) {
        throw new Error('El servicio de configuración no está disponible en este entorno.');
      }
      const resultados = await Promise.all(
        modificadas.map(([clave, valor]) =>
          academicoService.actualizarConfiguracion({ clave, valor: String(valor) })
        )
      );
      if (resultados.some(r => !r)) throw new Error('Una o más claves no se guardaron correctamente.');
      setOriginal({ ...valores });
      setResult({ tipo: 'success', msg: 'Configuración guardada exitosamente.' });
    } catch {
      setResult({ tipo: 'error', msg: 'No se pudo guardar. Verifica la conexión.' });
    } finally { setSaving(false); }
  };

  const hayCambios = Object.entries(valores).some(([k, v]) => String(v) !== String(original[k] || ''));

  return (
    <div className="space-y-7 pb-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Configuración
        </h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
          Parámetros institucionales · Solo el Director puede modificarlos
        </p>
      </motion.div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium">
          Estos valores afectan el comportamiento del sistema y del asistente de IA. Cualquier cambio entra en vigor de inmediato.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Settings size={16} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-black italic uppercase tracking-tighter text-slate-900">Parámetros del Sistema</h2>
              <p className="text-[10px] text-slate-400">Reglas académicas y financieras</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {CAMPOS.map(campo => {
              const val = valores[campo.clave] ?? '';
              const changed = String(val) !== String(original[campo.clave] || '');
              return (
                <div key={campo.clave} className={`flex items-center gap-4 px-6 py-5 ${changed ? 'bg-indigo-50/30' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{campo.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{campo.sub}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                      <input
                        type={campo.tipo}
                        min={campo.min}
                        max={campo.max}
                        value={val}
                        onChange={e => setValores(p => ({ ...p, [campo.clave]: e.target.value }))}
                        className={`w-24 px-3 py-2 border rounded-xl text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors ${
                          changed ? 'border-indigo-300 bg-white' : 'border-slate-200 bg-white'
                        }`}
                        placeholder="—"
                      />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 w-10">{campo.sufijo}</span>
                    {changed && <div className="w-2 h-2 bg-indigo-500 rounded-full" title="Modificado" />}
                  </div>
                </div>
              );
            })}

            {/* Campos libres (los que vengan de la BD y no estén en CAMPOS) */}
            {Object.entries(valores)
              .filter(([k]) => !CAMPOS.find(c => c.clave === k))
              .map(([clave, valor]) => {
                const changed = String(valor) !== String(original[clave] || '');
                return (
                  <div key={clave} className={`flex items-center gap-4 px-6 py-5 ${changed ? 'bg-indigo-50/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900">{clave.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={valor}
                        onChange={e => setValores(p => ({ ...p, [clave]: e.target.value }))}
                        className="w-40 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      />
                      {changed && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="px-6 py-5 border-t border-slate-50 flex items-center justify-between gap-4">
            {result ? (
              <div className={`flex items-center gap-2 text-sm font-bold ${result.tipo === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {result.msg}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">{hayCambios ? `${Object.entries(valores).filter(([k,v]) => String(v) !== String(original[k] || '')).length} cambio(s) sin guardar` : 'Sin cambios pendientes'}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hayCambios}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 mb-3">Contexto del Asistente IA</h2>
        <p className="text-xs text-slate-500 mb-4">
          El asistente de IA utiliza estos parámetros para responder preguntas sobre mora, aprobación, y finanzas.
          Al cambiar un valor, la IA lo tendrá en cuenta en la próxima conversación.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CAMPOS.map(c => (
            <div key={c.clave} className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{c.label}</p>
              <p className="text-lg font-black italic text-indigo-600 mt-0.5">{valores[c.clave] || '—'}<span className="text-[10px] text-slate-400 font-normal ml-1">{c.sufijo}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionPage;