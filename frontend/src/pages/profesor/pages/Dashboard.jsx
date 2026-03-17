import { AlertCircle, BookOpen, Users, TrendingUp, MapPin, Clock } from 'lucide-react';
import useProfesorDashboard from '../hooks/useProfesorDashboard';
import { useAuth } from '../../../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { data, loading, error } = useProfesorDashboard();
  const nombre = user?.nombre?.split(' ')[0] || 'Profesor';

  if (error) return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center gap-4">
      <AlertCircle size={24} />
      <p className="text-sm font-semibold">Error al cargar el dashboard</p>
    </div>
  );

  const stats = [
    { label: 'Secciones activas', value: loading ? '—' : data?.stats?.secciones_activas ?? '—', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total alumnos',     value: loading ? '—' : data?.stats?.total_alumnos ?? '—',     icon: Users,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Promedio general',  value: loading ? '—' : data?.stats?.rendimiento_promedio != null ? parseFloat(data.stats.rendimiento_promedio).toFixed(1) : '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Hola, <span className="text-indigo-600">{nombre}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Panel del período activo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${loading ? 'animate-pulse' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <div className={`p-2 ${bg} rounded-xl`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className={`text-4xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mis clases */}
      {!loading && data?.mis_clases?.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">Mis Clases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.mis_clases.map((clase, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-500 mb-1">{clase.codigo || clase.materia_codigo}</p>
                    <p className="text-base font-bold text-slate-800 leading-tight">{clase.materia}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
                    {clase.periodo}
                  </span>
                </div>
                {/* Meta */}
                <div className="space-y-1.5 mb-4">
                  {clase.aula && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{clase.aula}</span>
                    </div>
                  )}
                  {clase.horario && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{clase.horario}</span>
                    </div>
                  )}
                </div>
                {/* Alumnos */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">Alumnos inscritos</span>
                  <span className="text-lg font-bold text-slate-800">
                    {clase.alumnos_inscritos ?? clase.inscritos ?? '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-sm">Sin datos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
