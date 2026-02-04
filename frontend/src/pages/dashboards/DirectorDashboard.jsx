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
// Es un botón reutilizable para las acciones rápidas.
// Recibe: icono, texto, color, función onClick, y si está cargando.
// =====================================================
const ActionButton = ({ icon: Icon, label, color, onClick, loading = false }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="group bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col gap-4 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
      {loading ? <Loader2 className="animate-spin" size={28} /> : <Icon size={28} />}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestión</p>
      <p className="text-lg font-black text-slate-900 uppercase italic leading-tight">{label}</p>
    </div>
    <Hash className="absolute -right-2 -bottom-2 text-slate-50 opacity-50 group-hover:rotate-12 transition-transform" size={80} />
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

  // =====================================================
  // Trae los datos del backend cuando la página se carga
  // =====================================================
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

  // =====================================================
  // Descarga un reporte PDF del backend
  // =====================================================
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

  // =====================================================
  // Cuando hace click en la flecha de un estudiante
  // → lo lleva a la página /estudiante/5  (ejemplo con id 5)
  // =====================================================
  const handleVerDetalleEstudiante = (estudianteId) => {
    navigate(`/estudiante/${estudianteId}`);
  };

  // =====================================================
  // Cuando hace click en "Malla y Usuarios"
  // → lo lleva a la página /malla-curricular
  // =====================================================
  const handleGestionMalla = () => {
    navigate('/malla-curricular');
  };

  // =====================================================
  // Cuando hace click en "Cerrar Ciclo"
  // 1. Pide confirmación con window.confirm
  // 2. Habla con el backend (POST)
  // 3. Si tiene éxito, muestra resumen
  // 4. Si hay error (ej: notas faltantes), lo muestra
  // =====================================================
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
      fetchDatos(); // Recargar datos
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error desconocido';
      alert(`❌ ${errorMsg}`);
    } finally {
      setClosingCiclo(false);
    }
  };

  // Filtrar tabla según el card seleccionado
  const getListadoFiltrado = () => {
    if (filterActive === 'alertas') return stats.listadoAcciones;
    return stats.listadoAcciones;
  };

  // =====================================================
  // PANTALLA DE CARGA
  // =====================================================
  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={50} />
        <p className="font-black italic uppercase tracking-tighter text-slate-400">Sincronizando Academia...</p>
      </div>
    </div>
  );

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1600px] mx-auto space-y-12 pb-20"
    >
      {/* HEADER */}
      <header className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <div className="w-12 h-1 bg-indigo-600 rounded-full"></div>
            <span className="text-xs font-black uppercase tracking-[0.3em]">Panel de Control</span>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">
            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">{user?.first_name || 'Director'}</span>
          </h1>
          <p className="text-slate-400 font-bold text-lg italic">Supervisión general y gestión institucional activa.</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={fetchDatos}
            className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-[25px] flex items-center gap-3 hover:border-indigo-600 hover:text-indigo-600 transition-all"
          >
            <RefreshCw size={18} />
            <span className="text-sm font-bold">Actualizar</span>
          </button>

          <div className="bg-slate-900 text-white px-8 py-4 rounded-[25px] flex items-center gap-4 shadow-2xl shadow-indigo-900/20">
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Estado Sistema</p>
              <p className="text-sm font-bold italic">Operativo 100%</p>
            </div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.6)]"></div>
          </div>
        </div>
      </header>

      {/* 4 CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setFilterActive(filterActive === 'estudiantes' ? 'todos' : 'estudiantes')}
          className={`p-8 rounded-[40px] cursor-pointer transition-all border-2 ${filterActive === 'estudiantes' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-transparent shadow-sm hover:border-indigo-200'}`}
        >
          <Users className={filterActive === 'estudiantes' ? 'text-indigo-200' : 'text-indigo-600'} size={32} />
          <h3 className="mt-4 text-4xl font-black italic tracking-tighter">{stats.totalEstudiantes}</h3>
          <p className={`text-xs font-black uppercase tracking-widest ${filterActive === 'estudiantes' ? 'text-indigo-100' : 'text-slate-400'}`}>Estudiantes Activos</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setFilterActive(filterActive === 'alertas' ? 'todos' : 'alertas')}
          className={`p-8 rounded-[40px] cursor-pointer transition-all border-2 ${filterActive === 'alertas' ? 'bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-200' : 'bg-white border-transparent shadow-sm hover:border-rose-200'}`}
        >
          <AlertCircle className={filterActive === 'alertas' ? 'text-rose-100' : 'text-rose-500'} size={32} />
          <h3 className="mt-4 text-4xl font-black italic tracking-tighter text-inherit">{stats.alertasCriticas}</h3>
          <p className={`text-xs font-black uppercase tracking-widest ${filterActive === 'alertas' ? 'text-rose-100' : 'text-slate-400'}`}>Alertas de Gestión</p>
        </motion.div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <TrendingUp className="text-emerald-500" size={32} />
          <h3 className="mt-4 text-4xl font-black italic tracking-tighter text-slate-900">{stats.tasaRetencion}%</h3>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tasa de Retención</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
          <DollarSign className="text-indigo-400" size={32} />
          <h3 className="mt-4 text-3xl font-black italic tracking-tighter">
            ${(stats.ingresoMensual).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Ingresos Periodo</p>
          <Hash className="absolute -right-4 -bottom-4 text-white/5" size={120} />
        </div>
      </div>

      {/* TABLA + ACCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* TABLA DE GESTIÓN */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
              <CheckCircle className="text-indigo-600" />
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

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Entidad</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Situación</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {getListadoFiltrado().length > 0 ? getListadoFiltrado().map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                          {item.nombre_completo?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase text-sm italic">
                            {item.nombre_completo || 'Usuario'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            ID: {item.id} · {item.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase">
                        Deuda: ${item.deuda_total || '0.00'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
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
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div className="space-y-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] px-2">Consola de Comandos</h2>
          <div className="grid grid-cols-1 gap-4">
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
            <div className="bg-slate-900 p-8 rounded-[40px] text-white mt-4">
              <div className="flex justify-between items-center mb-6">
                <PieIcon className="text-indigo-400" />
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
                  <p className="text-2xl font-black">{stats.promedioInstitucional.toFixed(2)}/10</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* GRÁFICA: Estudiantes por carrera */}
      {stats.estudiantesPorCarrera.length > 0 && (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 mb-8">
            Distribución por Carrera
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.estudiantesPorCarrera}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nombre" tick={{ fontSize: 12, fontWeight: 'bold' }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="num_alumnos" fill="#6366f1" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default DirectorDashboard;