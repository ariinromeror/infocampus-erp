import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useState, useEffect } from 'react';
import TablaAsistencia from '../components/TablaAsistencia';

const AsistenciaPage = () => {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const res = await api.get(`/estudiante/${user.id}/asistencias`);
        setAsistencias(res.data.data.asistencias || []);
        setEstadisticas(res.data.data.estadisticas || null);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user?.id]);

  if (loading) return (
    <div className="p-10 animate-pulse font-black text-slate-300 uppercase italic tracking-widest">
      Consultando historial de aula...
    </div>
  );

  const pct = estadisticas?.porcentaje_asistencia ?? null;

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Control de <span className="text-indigo-600">Asistencia</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registro de presencialidad académica
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Presentes', value: estadisticas?.presentes ?? 0, color: 'text-slate-900' },
          { label: 'Ausencias', value: estadisticas?.ausentes ?? 0, color: 'text-amber-600' },
          { label: 'Tardanzas', value: estadisticas?.tardanzas ?? 0, color: 'text-slate-600' },
          { label: 'Justificadas', value: estadisticas?.justificadas ?? 0, color: 'text-indigo-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm">
            <p className="text-[11px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{label}</p>
            <p className={`text-3xl sm:text-4xl font-black italic ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {pct !== null && (
        <div className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Porcentaje Global</p>
            <p className={`text-2xl font-black italic ${pct >= 75 ? 'text-slate-900' : 'text-amber-600'}`}>
              {parseFloat(pct).toFixed(1)}%
            </p>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? 'bg-indigo-600' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          {pct < 75 && (
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2">
              Atención: mínimo requerido 75%
            </p>
          )}
        </div>
      )}

      <TablaAsistencia
        asistencias={asistencias}
        estadisticas={estadisticas}
        loading={loading}
      />
    </div>
  );
};

export default AsistenciaPage;