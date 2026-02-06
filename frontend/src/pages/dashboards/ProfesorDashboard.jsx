import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { academicoService } from '../../services/academicoService'; 
import { 
  Users, BookOpen, Loader2, 
  Calendar, MapPin, ArrowRight, Bell,
  TrendingUp, Layout, Hash
} from 'lucide-react';
import StatCard from '../../components/cards/StatCard.jsx';

const ProfesorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ secciones: 0, estudiantes: 0, promedio: 0 });

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const response = await academicoService.getStatsProfesor();
        setSecciones(response.data.mis_clases || []);
        setStats({
          secciones: response.data.total_secciones || 0,
          estudiantes: response.data.total_estudiantes || 0,
          promedio: response.data.promedio_general || 0
        });
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchDatos();
  }, []);

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 sm:space-y-10">
      
      {/* 1. ESTADÍSTICAS - Grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard title="SECCIONES" value={stats.secciones} icon={Layout} color="blue" />
        <StatCard title="ESTUDIANTES" value={stats.estudiantes} icon={Users} color="purple" />
        <StatCard title="PROMEDIO" value={stats.promedio} icon={TrendingUp} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-2">
            Control de Clases Asignadas
          </h3>

          <div className="grid gap-4 sm:gap-5">
            {secciones.map((seccion) => (
              <div 
                key={seccion.id}
                className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[35px] border-2 border-slate-50 shadow-sm hover:border-indigo-200 transition-all group"
              >
                <div className="flex flex-col gap-6 sm:gap-8">
                  
                  {/* Info de la Materia */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    {/* Badge de Sección */}
                    <div className="bg-slate-900 text-white w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[22px] flex flex-col items-center justify-center shrink-0 shadow-lg shadow-slate-200">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase leading-none">Secc.</span>
                      <span className="text-xl sm:text-2xl font-black italic">{seccion.codigo_seccion}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg sm:text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-3 sm:mb-2 group-hover:text-indigo-600 transition-colors break-words">
                        {seccion.materia_detalle?.nombre}
                      </h4>
                      
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-5">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs sm:text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                          <MapPin size={14} className="text-red-500 flex-shrink-0" />
                          <span className="truncate">{seccion.aula || 'Aula Virtual'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs sm:text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                          <Calendar size={14} className="text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{seccion.horario || 'Horario por definir'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón de Gestión */}
                  <button 
                    onClick={() => navigate(`/gestion-notas/${seccion.id}`)}
                    className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 bg-slate-900 text-white rounded-2xl sm:rounded-[20px] font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95"
                  >
                    Ingresar Notas
                    <ArrowRight size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Lateral de Avisos */}
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-2">Avisos</h3>
          <div className="bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[40px] border border-slate-100 shadow-sm space-y-4">
             <div className="p-4 sm:p-5 bg-amber-50 rounded-2xl sm:rounded-[25px] border border-amber-100">
                <p className="text-xs font-black text-amber-800 uppercase italic mb-1">Cierre de Actas</p>
                <p className="text-xs sm:text-sm text-amber-900 font-bold leading-tight">Recuerda subir tus notas antes del Viernes.</p>
             </div>
             <div className="p-4 sm:p-5 bg-indigo-50 rounded-2xl sm:rounded-[25px] border border-indigo-100">
                <p className="text-xs font-black text-indigo-800 uppercase italic mb-1">Notificación</p>
                <p className="text-xs sm:text-sm text-indigo-900 font-bold leading-tight">Nueva actualización de rúbricas disponible.</p>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfesorDashboard;