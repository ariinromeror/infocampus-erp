import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import useSecciones from '../hooks/useSecciones';
import useSeccionAlumnos from '../hooks/useSeccionAlumnos';
import useAsistencia from '../hooks/useAsistencia';
import SeccionSelector from '../components/SeccionSelector';

const ESTADOS = [
  { value: 'presente',    label: 'Presente',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' },
  { value: 'ausente',     label: 'Ausente',     cls: 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' },
  { value: 'tardanza',    label: 'Tardanza',    cls: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
  { value: 'justificado', label: 'Justificado', cls: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
];

const ACTIVO = {
  presente:    'bg-emerald-500 text-white border-emerald-500',
  ausente:     'bg-red-500 text-white border-red-500',
  tardanza:    'bg-amber-500 text-white border-amber-500',
  justificado: 'bg-blue-500 text-white border-blue-500',
};

const AsistenciaPage = () => {
  const { secciones, loading: loadingSec } = useSecciones();
  const [seccionId, setSeccionId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const { alumnos, loading: loadingAlumnos } = useSeccionAlumnos(seccionId);
  const { registrarAsistencia, loading: saving, error: saveError, success, setSuccess } = useAsistencia();
  const [registros, setRegistros] = useState({});

  const handleEstado = (inscripcionId, estado) => {
    setRegistros(prev => ({ ...prev, [inscripcionId]: estado }));
  };

  const handleMarcarTodos = (estado) => {
    const todos = {};
    alumnos.forEach(a => { todos[a.inscripcion_id] = estado; });
    setRegistros(todos);
  };

  const handleSubmit = async () => {
    if (!seccionId || !fecha) return;
    const lista = alumnos.map(a => ({
      inscripcion_id: a.inscripcion_id,
      estado: registros[a.inscripcion_id] || 'presente',
    }));
    await registrarAsistencia(parseInt(seccionId), fecha, lista);
    setRegistros({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Pasar Lista</h1>
        <p className="text-sm text-slate-500 mt-1">Registro de asistencia por sección y fecha</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Configuración</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-600">Sección</label>
            <div className="relative">
              <SeccionSelector
                secciones={secciones}
                loading={loadingSec}
                value={seccionId}
                onChange={(id) => { setSeccionId(String(id)); setRegistros({}); setSuccess(false); }}
              />
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <label className="text-sm font-medium text-slate-600">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full max-w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {saveError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
          <AlertCircle size={18} />
          <p className="text-sm font-medium">{saveError}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-3">
          <CheckCircle2 size={18} />
          <p className="text-sm font-medium">Asistencia registrada con éxito</p>
        </div>
      )}

      {seccionId && (
        <div className="space-y-4">
          {alumnos.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-slate-500 mr-1">Marcar todos:</span>
              {ESTADOS.map(e => (
                <button
                  key={e.value}
                  onClick={() => handleMarcarTodos(e.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${e.cls}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Alumno</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 hidden sm:table-cell">Cédula</th>
                    <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingAlumnos
                    ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-5 py-4"><div className="h-4 bg-slate-100 rounded-full w-32" /></td>
                        <td className="px-5 py-4 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded-full w-20" /></td>
                        <td className="px-5 py-4"><div className="h-8 bg-slate-100 rounded-xl w-48" /></td>
                      </tr>
                    ))
                    : alumnos.map(alumno => {
                      const estadoActual = registros[alumno.inscripcion_id] || 'presente';
                      return (
                        <tr key={alumno.inscripcion_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-slate-800">{alumno.nombre}</p>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <p className="text-sm text-slate-500">{alumno.cedula}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {ESTADOS.map(e => (
                                <button
                                  key={e.value}
                                  onClick={() => handleEstado(alumno.inscripcion_id, e.value)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    estadoActual === e.value ? ACTIVO[e.value] : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {e.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {!loadingAlumnos && alumnos.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">Sin alumnos en esta sección</p>
            </div>
          )}

          {!loadingAlumnos && alumnos.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? 'Guardando...' : 'Guardar Asistencia'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AsistenciaPage;
