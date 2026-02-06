import React, { useState, useEffect } from 'react';
import { academicoService } from '../../services/academicoService';
import { CheckCircle, Loader2, Search, DollarSign } from 'lucide-react';

const ValidarPagos = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await academicoService.getStatsFinanzas();
      setEstudiantes(res.data.listado_cobranza || []);
    } catch (err) {
      console.error("Error cargando lista:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPago = async (usuarioId) => {
    if (!window.confirm("¿Confirmas que recibiste el pago de este alumno?")) return;

    setProcesando(usuarioId);
    try {
      await academicoService.registrarPago(usuarioId);
      
      alert("✅ Pago registrado exitosamente");
      cargarDatos();
    } catch (err) {
      alert("❌ Error al registrar pago: " + (err.response?.data?.error || "Error de servidor"));
    } finally {
      setProcesando(null);
    }
  };

  if (loading) return (
    <div className="flex h-60 items-center justify-center">
      <Loader2 className="animate-spin text-slate-900" size={40} />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-xl sm:text-2xl font-black mb-4 sm:mb-6 italic uppercase">Validación de Pagos</h1>
      
      <div className="grid gap-3 sm:gap-4">
        {estudiantes.map(est => (
          <div key={est.id} className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <p className="font-black uppercase text-sm sm:text-base">{est.nombre_completo}</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Deuda: ${est.deuda_total}</p>
            </div>
            
            <button
              onClick={() => handleRegistrarPago(est.id)}
              disabled={procesando === est.id || !est.en_mora}
              className={`w-full sm:w-auto px-5 sm:px-6 py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 
                ${est.en_mora 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {procesando === est.id ? <Loader2 className="animate-spin" size={16} /> : <DollarSign size={16} />}
              {est.en_mora ? "Registrar Pago" : "Al día"}
            </button>
          </div>
        ))}

        {estudiantes.length === 0 && (
          <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">
            No hay estudiantes con pagos pendientes
          </p>
        )}
      </div>
    </div>
  );
};

export default ValidarPagos;