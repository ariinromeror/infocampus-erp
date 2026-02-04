import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { academicoService } from '../../services/academicoService'; 
import { 
  BookOpen, TrendingUp, DollarSign, AlertTriangle,
  Calendar, Download, Loader2, Bell, CheckCircle, 
  ArrowRight, Trophy, Wallet, Hash
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import StatCard from '../../components/cards/StatCard.jsx';

const PageContainer = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
    className="space-y-10 pb-16"
  >
    {children}
  </motion.div>
);

const EstudianteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ promedio: 0, materias: 0, deuda: 0 });

  useEffect(() => {
    fetchDatos();
  }, [user]);

  const fetchDatos = async () => {
    try {
      const response = await academicoService.getMisInscripciones();
      const materiasFormateadas = response.data.map(item => ({
        id: item.id,
        nombre: item.seccion_detalle?.materia_detalle?.nombre || 'Sin nombre',
        codigo: item.seccion_detalle?.materia_detalle?.codigo || 'N/A',
        creditos: item.seccion_detalle?.materia_detalle?.creditos || 0,
        nota: parseFloat(item.nota_final) || 0, 
        estado: item.estado
      }));

      setMaterias(materiasFormateadas);
      const notasValidas = materiasFormateadas.filter(m => m.nota > 0);
      const promedio = notasValidas.length > 0
        ? (notasValidas.reduce((sum, m) => sum + m.nota, 0) / notasValidas.length).toFixed(1)
        : "0.0";

      setStats({ promedio: parseFloat(promedio), materias: materiasFormateadas.length, deuda: user?.deuda_total || 0 });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDescargaPDF = async () => {
    if (user?.en_mora) return;
    try {
      const response = await academicoService.descargarPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Expediente_${user?.username}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sincronizando...</span>
    </div>
  );

  return (
    <PageContainer>
      {/* HEADER PRINCIPAL */}
      <section className="relative overflow-hidden rounded-[40px] bg-slate-900 p-10 text-white shadow-2xl shadow-indigo-900/30">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-black italic tracking-tighter leading-none">
              HOLA, <span className="text-indigo-400 uppercase">{user?.username}</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm max-w-md">
              {stats.promedio >= 8.5 ? "Mantienes un desempeño sobresaliente este ciclo." : "Revisa tu avance académico y próximos compromisos."}
            </p>
          </div>
          <div className="flex gap-4">
            {!user?.en_mora && (
              <motion.button whileHover={{ scale: 1.05 }} onClick={handleDescargaPDF} className="bg-indigo-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20">
                Descargar Reporte
              </motion.button>
            )}
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Promedio" value={stats.promedio} icon={TrendingUp} color="indigo" />
        <StatCard title="Estado Cuenta" value={user?.en_mora ? `$${user.deuda_total}` : 'AL DÍA'} icon={Wallet} color={user?.en_mora ? 'red' : 'emerald'} />
        <StatCard title="Materias" value={stats.materias} icon={BookOpen} color="blue" />
      </div>

      {/* SECCIÓN REDISEÑADA: MI EXPEDIENTE (LIMPIEZA TOTAL) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Mi Expediente</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resumen de carga actual</p>
            </div>
          </div>
          <button onClick={() => navigate('/notas')} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
            Ver detalle <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materias.map((m, idx) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
            >
              {/* Decoración de fondo sutil */}
              <div className="absolute -right-4 -top-4 text-slate-50 opacity-10 group-hover:text-indigo-50 group-hover:opacity-100 transition-all">
                <Hash size={120} strokeWidth={4} />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 max-w-[70%]">
                    <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">{m.codigo}</span>
                    <h4 className="text-lg font-black text-slate-900 uppercase italic leading-tight group-hover:text-indigo-600 transition-colors">
                      {m.nombre}
                    </h4>
                  </div>
                  
                  {/* Badge de Nota: El punto focal */}
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 ${
                    m.nota >= 7 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-xl font-black leading-none">{m.nota > 0 ? m.nota.toFixed(1) : '--'}</span>
                    <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Nota</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.creditos} Créditos</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase italic px-3 py-1 rounded-full ${
                    m.estado === 'finalizada' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {m.estado}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default EstudianteDashboard;