import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { academicoService } from '../../services/academicoService';
import { 
  Users, BookOpen, TrendingUp, 
  Award, Calendar, Loader2 
} from 'lucide-react';
import StatCard from '../../components/cards/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CoordinadorDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    materiasActivas: 0,
    promedioCarrera: 0,
    estudiantesPorSemestre: []
  });

  useEffect(() => {
    fetchDatos();
  }, []);

  const fetchDatos = async () => {
    try {
      // Reutilizamos el endpoint institucional pero en el futuro
      // podríamos filtrar esto en el backend solo por la carrera del coordinador
      const res = await academicoService.getStatsInstitucional();
      
      // Mapeamos los datos que vienen de Django
      setStats({
        totalEstudiantes: res.data.total_estudiantes || 0,
        materiasActivas: res.data.total_materias || 0,
        promedioCarrera: 8.5, // Dato simulado hasta conectar lógica específica de carrera
        estudiantesPorSemestre: res.data.estudiantes_por_carrera || []
      });
    } catch (error) {
      console.error("Error cargando dashboard coordinador:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* 1. Encabezado Real de Coordinador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Panel de Coordinación
          </h1>
          <p className="text-slate-500 font-medium">
            Gestión Académica de <span className="text-indigo-600 font-bold">{user?.carrera_detalle?.nombre || 'la Carrera'}</span>
          </p>
        </div>
        
        {/* Badge de Rol */}
        <div className="bg-indigo-50 px-5 py-2 rounded-full border border-indigo-100 self-start md:self-auto">
          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
            Acceso Coordinador
          </p>
        </div>
      </div>

      {/* 2. KPIs Específicos (Sin montos de dinero, enfocado en académico) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Estudiantes Activos"
          value={stats.totalEstudiantes}
          icon={Users}
          color="blue"
          subtitle="En tu carrera"
        />
        <StatCard
          title="Materias en Curso"
          value={stats.materiasActivas}
          icon={BookOpen}
          color="purple"
          subtitle="Ciclo actual"
        />
        <StatCard
          title="Rendimiento Promedio"
          value={stats.promedioCarrera}
          icon={Award}
          color="green"
          subtitle="Promedio global"
        />
      </div>

      {/* 3. Gráfica de Distribución */}
      <div className="bg-white p-8 rounded-[30px] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-slate-800">Población Estudiantil</h3>
          <Calendar className="text-slate-300" />
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.estudiantesPorSemestre}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="nombre" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 12}}
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
              />
              <Bar 
                dataKey="cantidad" 
                fill="#6366f1" 
                radius={[6, 6, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default CoordinadorDashboard;