import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { academicoService } from '../../services/academicoService';
import { 
  DollarSign, TrendingUp, AlertCircle, Users, 
  ShieldCheck, Loader2, ArrowUpRight, Wallet, 
  BarChart3, Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const TesoreroDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    ingreso_proyectado: 0,
    ingreso_real: 0,
    tasa_cobranza: 0,
    listado_cobranza: []
  });

  // --- FORMATEADOR DE MONEDA ---
  const formatCurrency = (val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num || 0);
  };

  useEffect(() => {
    fetchFinanzas();
  }, []);

  const fetchFinanzas = async () => {
    try {
      const res = await academicoService.getStatsFinanzas();
      // Sincronización con las llaves exactas de views.py
      setData({
        ingreso_proyectado: res.data.ingreso_proyectado || 0,
        ingreso_real: res.data.ingreso_real || 0,
        tasa_cobranza: res.data.tasa_cobranza || 0,
        listado_cobranza: res.data.listado_cobranza || []
      });
    } catch (err) {
      console.error("Error al cargar finanzas:", err);
      // ✅ NUEVO: Mostrar mensaje de error más descriptivo
      if (err.response) {
        console.error("Detalles del error:", err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-emerald-500" size={48} />
    </div>
  );

  // Datos para el gráfico de Pie basado en la realidad
  const pieData = [
    { name: 'Recaudado', value: parseFloat(data.ingreso_real) || 0, color: '#10b981' },
    { 
      name: 'Pendiente', 
      value: Math.max(0, parseFloat(data.ingreso_proyectado || 0) - parseFloat(data.ingreso_real || 0)), 
      color: '#f43f5e' 
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
            Control de Tesorería
          </h1>
          <p className="text-slate-500 font-bold">Resumen financiero institucional</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/validar-pagos')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
          >
            <ShieldCheck size={18} /> Validar Pagos
          </button>
        </div>
      </div>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
            <Wallet size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingreso Proyectado</p>
          <h2 className="text-3xl font-black text-slate-900">{formatCurrency(data.ingreso_proyectado)}</h2>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
            <TrendingUp size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recaudación Real</p>
          <h2 className="text-3xl font-black text-emerald-600">{formatCurrency(data.ingreso_real)}</h2>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
            <Activity size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasa de Cobranza</p>
          <h2 className="text-3xl font-black text-slate-900">{data.tasa_cobranza.toFixed(1)}%</h2>
        </div>
      </div>

      {/* GRÁFICO Y ACCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ✅ CORREGIDO: Contenedor con altura fija para evitar el error de dimensiones */}
        <div className="bg-slate-900 rounded-[50px] p-10 text-white shadow-2xl" style={{ minHeight: '400px' }}>
          <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8 text-center">Estado de Cartera</h3>
          {/* ✅ CORREGIDO: Contenedor con dimensiones explícitas */}
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={70} 
                  outerRadius={95} 
                  paddingAngle={8} 
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '15px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff' 
                  }}
                  formatter={(value) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold opacity-70">Cobrado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-xs font-bold opacity-70">Pendiente</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => navigate('/lista-mora')}
            className="group bg-white p-8 rounded-[40px] border border-slate-100 hover:border-rose-200 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-rose-50 rounded-[24px] flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                <AlertCircle size={32} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 uppercase italic">Lista de Mora</h4>
                <p className="text-slate-500 font-medium text-sm">Ver alumnos con saldos pendientes</p>
              </div>
            </div>
            <ArrowUpRight className="text-slate-300" />
          </button>

          <div className="bg-indigo-600 p-8 rounded-[40px] text-white flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-[24px] flex items-center justify-center">
              <BarChart3 size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase italic tracking-tighter">Reporte Proyectado</h4>
              <p className="text-indigo-100 text-sm">Basado en inscripciones activas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesoreroDashboard;