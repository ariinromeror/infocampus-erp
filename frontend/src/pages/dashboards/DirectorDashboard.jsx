import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { academicoService } from '../../services/academicoService';
import {
  Users, DollarSign, TrendingUp,
  Award, AlertCircle, Loader2, Hash,
  ArrowRight, CheckCircle,
  UserCheck, FileText, PieChart as PieIcon,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// =====================================================
// COMPONENTE: ActionButton
// =====================================================
const ActionButton = ({ icon: Icon, label, color, onClick, loading = false }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="group bg-white p-5 sm:p-6 rounded-3xl sm:rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col gap-3 sm:gap-4 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
      {loading ? <Loader2 className="animate-spin" size={24} /> : <Icon size={24} className="sm:w-7 sm:h-7" />}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestión</p>
      <p className="text-base sm:text-lg font-black text-slate-900 uppercase italic leading-tight">{label}</p>
    </div>
    <Hash className="absolute -right-2 -bottom-2 text-slate-50 opacity-50 group-hover:rotate-12 transition-transform w-16 h-16 sm:w-20 sm:h-20" />
  </button>
);

// =====================================================
// COMPONENTE PRINCIPAL: DirectorDashboard
// =====================================================
const DirectorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState('todos');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [closingCiclo, setClosingCiclo] = useState(false);

  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    totalProfesores: 0,
    ingresoMensual: 0,
    promedioInstitucional: 0,
    tasaRetencion: 0,
    alertasCriticas: 0,
    listadoAcciones: [],
    estudiantesPorCarrera: []
  });

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const res = await academicoService.getStatsInstitucional();
      const data = res.data;

      setStats({
        totalEstudiantes: data.total_estudiantes || 0,
        totalProfesores: data.total_profesores || 0,
        ingresoMensual: data.ingresos_totales || 0,
        promedioInstitucional: data.promedio_institucional || 0,
        tasaRetencion: 92,
        alertasCriticas: data.alumnos_mora?.length || 0,
        listadoAcciones: data.alumnos_mora || [],
        estudiantesPorCarrera: data.estudiantes_por_carrera || []
      });
    } catch (err) {
      console.error("Error al cargar dashboard director:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarReporte = async () => {
    setDownloadingPDF(true);
    try {
      await academicoService.descargarPDF();
      alert('✅ Reporte descargado exitosamente');
    } catch (error) {
      console.error('Error al descargar reporte:', error);
      alert('❌ Error al descargar el reporte. Por favor intente nuevamente.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleVerDetalleEstudiante = (estudianteId) => {
    navigate(`/estudiante/${estudianteId}`);
  };

  const handleGestionMalla = () => {
    navigate('/malla-curricular');
  };

  const handleCerrarCiclo = async () => {
    const confirmar = window.confirm(
      '¿Está seguro que desea cerrar el ciclo actual?\n\n' +
      'Esto hará:\n' +
      '• Marcar inscripciones como aprobado/reprobado\n' +
      '• Desactivar el periodo lectivo\n\n' +
      '¿Desea continuar?'
    );

    if (!confirmar) return;

    setClosingCiclo(true);
    try {
      const response = await academicoService.cerrarCiclo();
      const data = response.data;
      alert(
        `✅ ${data.message}\n\n` +
        `Aprobados: ${data.aprobados}\n` +
        `Reprobados: ${data.reprobados}\n` +
        `Total procesados: ${data.total_procesados}`
      );
      fetchDatos();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error desconocido';
      alert(`❌ ${errorMsg}`);
    } finally {
      setClosingCiclo(false);
    }
  };

  const getListadoFiltrado = () => {
    if (filterActive === 'alertas') return stats.listadoAcciones;
    return stats.listadoAcciones;
  };

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={50} />
        <p className="font-black italic uppercase tracking-tighter text-slate-400">Sincronizando Academia...</p>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 sm:space-y-10 pb-8 sm:pb-16"
    >
      {/* HEADER */}
      <div className="bg-slate-900 rounded-3xl sm:rounded-[50px] p-6 sm:p-12 text-white relative overflow-hidden">
        <Hash className="absolute -right-10 -top-10 text-white/5 w-40 h-40 sm:w-60 sm:h-60" />
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter leading-none mb-3 sm:mb-4">
            GLOBAL <span className="text-indigo-400">INSIGHT</span>
          </h1>
          <p className="text-slate-400 font-medium text-sm sm:text-base max-w-2xl">
            Panel de administración institucional con datos en tiempo real
          </p>
        </div>
      </div>

      {/* GRID DE MÉTRICAS - Responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          onClick={() => setFilterActive('todos')}
          className={`bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] shadow-sm cursor-pointer transition-all ${filterActive === 'todos' ? 'border-2 border-indigo-500 shadow-xl shadow-indigo-500/10' : 'border border-slate-100'}`}
        >
          <Users className="text-indigo-500 w-7 h-7 sm:w-8 sm:h-8" />
          <h3 className="mt-4 text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900">{stats.totalEstudiantes}</h3>
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Estudiantes</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -5 }}
          onClick={() => setFilterActive('alertas')}
          className={`bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] shadow-sm cursor-pointer transition-all ${filterActive === 'alertas' ? 'bg-rose-500 text-white border-2 border-rose-600' : 'border border-slate-100'}`}
        >
          <AlertCircle className={`${filterActive === 'alertas' ? 'text-rose-100' : 'text-rose-500'} w-7 h-7 sm:w-8 sm:h-8`} />
          <h3 className={`mt-4 text-3xl sm:text-4xl font-black italic tracking-tighter ${filterActive === 'alertas' ? 'text-white' : 'text-slate-900'}`}>
            {stats.alertasCriticas}
          </h3>
          <p className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${filterActive === 'alertas' ? 'text-rose-100' : 'text-slate-400'}`}>Alertas de Gestión</p>
        </motion.div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] shadow-sm border border-slate-100">
          <TrendingUp className="text-emerald-500 w-7 h-7 sm:w-8 sm:h-8" />
          <h3 className="mt-4 text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900">{stats.tasaRetencion}%</h3>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Tasa de Retención</p>
        </div>

        <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl sm:rounded-[40px] shadow-2xl text-white relative overflow-hidden">
          <DollarSign className="text-indigo-400 w-7 h-7 sm:w-8 sm:h-8" />
          <h3 className="mt-4 text-2xl sm:text-3xl font-black italic tracking-tighter break-all">
            ${(stats.ingresoMensual).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] sm:text-xs font-black text-indigo-300 uppercase tracking-widest">Ingresos Periodo</p>
          <Hash className="absolute -right-4 -bottom-4 text-white/5 w-24 h-24 sm:w-30 sm:h-30" />
        </div>
      </div>

      {/* TABLA + ACCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">

        {/* TABLA DE GESTIÓN */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
              <CheckCircle className="text-indigo-600 w-6 h-6 sm:w-7 sm:h-7" />
              {filterActive === 'alertas' ? 'Alertas Pendientes' : 'Gestión Operativa'}
            </h2>
            <div className="flex gap-2">
              {filterActive !== 'todos' && (
                <button
                  onClick={() => setFilterActive('todos')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-black uppercase text-slate-600 transition-colors"
                >
                  Limpiar Filtro
                </button>
              )}
              <span className="px-4 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500">
                {getListadoFiltrado().length} registros
              </span>
            </div>
          </div>

          {/* TABLA - Versión Desktop */}
          <div className="hidden sm:block bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Entidad</th>
                  <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Situación</th>
                  <th className="px-6 sm:px-8 py-4 sm:py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {getListadoFiltrado().length > 0 ? getListadoFiltrado().map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 sm:px-8 py-5 sm:py-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-sm">
                          {item.nombre_completo?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 uppercase text-sm italic truncate">
                            {item.nombre_completo || 'Usuario'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            ID: {item.id} · {item.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 sm:px-8 py-5 sm:py-6">
                      <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase whitespace-nowrap">
                        Deuda: ${item.deuda_total || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 sm:px-8 py-5 sm:py-6 text-right">
                      <button
                        onClick={() => handleVerDetalleEstudiante(item.id)}
                        className="p-3 hover:bg-indigo-600 hover:text-white rounded-2xl text-slate-300 transition-all"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <UserCheck size={48} />
                        <p className="font-black uppercase italic">
                          {filterActive === 'alertas' ? 'No hay alertas pendientes' : 'Todo en orden por ahora'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CARDS - Versión Móvil */}
          <div className="sm:hidden space-y-3">
            {getListadoFiltrado().length > 0 ? getListadoFiltrado().map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black flex-shrink-0">
                      {item.nombre_completo?.[0] || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 uppercase text-sm italic truncate">
                        {item.nombre_completo || 'Usuario'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">
                        ID: {item.id} · {item.username}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleVerDetalleEstudiante(item.id)}
                    className="p-2 bg-indigo-600 text-white rounded-xl flex-shrink-0"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase">
                    Deuda: ${item.deuda_total || '0.00'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="bg-white p-10 rounded-3xl text-center opacity-20">
                <UserCheck size={40} className="mx-auto mb-3" />
                <p className="font-black uppercase italic text-sm">
                  {filterActive === 'alertas' ? 'No hay alertas pendientes' : 'Todo en orden'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2">Consola de Comandos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-4">
            <ActionButton
              icon={Users}
              label="Malla y Usuarios"
              color="bg-emerald-50 text-emerald-600"
              onClick={handleGestionMalla}
            />
            <ActionButton
              icon={FileText}
              label="Reportes Excel"
              color="bg-indigo-50 text-indigo-600"
              onClick={handleDescargarReporte}
              loading={downloadingPDF}
            />
            <ActionButton
              icon={Award}
              label="Cerrar Ciclo"
              color="bg-amber-50 text-amber-600"
              onClick={handleCerrarCiclo}
              loading={closingCiclo}
            />

            {/* Card: Rendimiento académico */}
            <div className="col-span-2 sm:col-span-1 bg-slate-900 p-6 sm:p-8 rounded-3xl sm:rounded-[40px] text-white mt-2 sm:mt-4">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <PieIcon className="text-indigo-400 w-7 h-7" />
                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Rendimiento Acad.</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span>Aprobación</span>
                    <span>{(stats.promedioInstitucional * 10).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.promedioInstitucional * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-indigo-200 italic">Promedio institucional:</p>
                  <p className="text-xl sm:text-2xl font-black">{stats.promedioInstitucional.toFixed(2)}/10</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* GRÁFICA: Estudiantes por carrera */}
      {stats.estudiantesPorCarrera.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] border border-slate-100 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-6 sm:mb-8">
            Distribución por Carrera
          </h2>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <BarChart data={stats.estudiantesPorCarrera}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="nombre" 
                tick={{ fontSize: 10, fontWeight: 'bold' }} 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: 'none', 
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  fontSize: '12px'
                }} 
              />
              <Bar dataKey="num_alumnos" fill="#6366f1" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default DirectorDashboard;