import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { academicoService } from '../../services/academicoService';
import { 
  Users, 
  ArrowLeft, 
  AlertTriangle, 
  Search, 
  Loader2
} from 'lucide-react';

const ListaMora = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [estudiantes, setEstudiantes] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const fetchMora = async () => {
      try {
        const res = await academicoService.getStatsFinanzas();
        const soloMora = (res.data.listado_cobranza || []).filter(u => u.en_mora);
        setEstudiantes(soloMora);
      } catch (err) {
        console.error("Error al cargar lista de mora:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMora();
  }, []);

  const filtered = estudiantes.filter(e => e.username.toLowerCase().includes(filtro.toLowerCase()));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-indigo-500" size={48} />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate(-1)} className="p-3 rounded-2xl bg-white shadow-sm hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Lista de Morosidad</h1>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por nombre..."
              className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-6 shadow-sm focus:ring-2 focus:ring-rose-500 transition-all font-bold text-slate-600"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudiante</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Deuda Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((est) => (
              <tr key={est.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase">
                      {est.username.charAt(0)}
                    </div>
                    <span className="font-black text-slate-800 uppercase text-sm">{est.username}</span>
                  </div>
                </td>
                <td className="px-8 py-6 font-bold text-slate-400 text-sm">ID-{est.id}</td>
                <td className="px-8 py-6">
                  <span className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                    <AlertTriangle size={12} /> Requiere Pago
                  </span>
                </td>
                <td className="px-8 py-6 text-right font-black text-slate-900">${parseFloat(est.deuda_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaMora;