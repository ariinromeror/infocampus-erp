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
      // 'listado_cobranza' es lo que envía tu view de Django
      setEstudiantes(res.data.listado_cobranza || []);
    } catch (err) {
      console.error("Error cargando lista:", err);
    } finally {
      setLoading(false);
    }
  };

  // ESTA ES LA FUNCIÓN QUE "CONECTA" CON TU VIEWS.PY
  const handleRegistrarPago = async (usuarioId) => {
    if (!window.confirm("¿Confirmas que recibiste el pago de este alumno?")) return;

    setProcesando(usuarioId); // Activa el loader en el botón
    try {
      // LLAMADA AL SERVICIO
      await academicoService.registrarPago(usuarioId);
      
      alert("✅ Pago registrado exitosamente");
      cargarDatos(); // Recargamos la lista para que el alumno ya no salga en mora
    } catch (err) {
      alert("❌ Error al registrar pago: " + (err.response?.data?.error || "Error de servidor"));
    } finally {
      setProcesando(null);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black mb-6 italic uppercase">Validación de Pagos</h1>
      <div className="grid gap-4">
        {estudiantes.map(est => (
          <div key={est.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex justify-between items-center">
            <div>
              <p className="font-black uppercase">{est.nombre_completo}</p>
              <p className="text-sm text-slate-500">Deuda: ${est.deuda_total}</p>
            </div>
            
            {/* AQUÍ ESTÁ EL BOTÓN CONECTADO */}
            <button
              onClick={() => handleRegistrarPago(est.id)}
              disabled={procesando === est.id || !est.en_mora}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 
                ${est.en_mora 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {procesando === est.id ? <Loader2 className="animate-spin" size={16} /> : <DollarSign size={16} />}
              {est.en_mora ? "Registrar Pago" : "Al día"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidarPagos;