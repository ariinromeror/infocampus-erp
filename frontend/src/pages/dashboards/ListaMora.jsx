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
    <div className="space-y-6 sm:space-y-10">
      {/* Header - Responsivo */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 sm:p-3 rounded-2xl bg-white shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase italic">Lista de Morosidad</h1>
      </div>

      {/* Contenedor principal */}
      <div className="bg-white rounded-3xl sm:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        {/* Buscador */}
        <div className="p-5 sm:p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por nombre..."
              className="w-full bg-white border-none rounded-2xl py-3 sm:py-4 pl-11 sm:pl-12 pr-4 sm:pr-6 shadow-sm focus:ring-2 focus:ring-rose-500 transition-all font-bold text-slate-600 text-sm"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        {/* TABLA - Desktop */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* CARDS - Móvil */}
        <div className="md:hidden p-4 space-y-3">
          {filtered.length > 0 ? filtered.map((est) => (
            <div key={est.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase flex-shrink-0">
                    {est.username.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-black text-slate-800 uppercase text-sm block truncate">{est.username}</span>
                    <span className="font-bold text-slate-400 text-xs">ID-{est.id}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
                    <AlertTriangle size={12} /> Requiere Pago
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Deuda Total</p>
                  <p className="text-2xl font-black text-slate-900">${parseFloat(est.deuda_total).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-10">
              <Users size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 font-bold">No hay estudiantes en mora</p>
            </div>
          )}
        </div>

        {/* Mensaje vacío para desktop */}
        {filtered.length === 0 && (
          <div className="hidden md:block text-center py-20">
            <Users size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold text-lg">No hay estudiantes en mora</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaMora;