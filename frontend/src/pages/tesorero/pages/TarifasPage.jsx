import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, DollarSign, CreditCard, Save, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../../services/api';

const TarifasPage = () => {
  const [loading, setLoading] = useState(true);
  const [carreras, setCarreras] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [tarifas, setTarifas] = useState({});

  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        setLoading(true);
        const res = await api.get('/academico/carreras');
        const data = Array.isArray(res.data?.data?.carreras) ? res.data.data.carreras : Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setCarreras(data);
        
        const tarifasInicial = {};
        data.forEach(c => {
          tarifasInicial[c.id] = c.precio_credito || 50;
        });
        setTarifas(tarifasInicial);
      } catch (err) {
        console.error('Error:', err);
        setMensaje({ tipo: 'error', texto: 'Error al cargar las carreras' });
      } finally {
        setLoading(false);
      }
    };
    fetchCarreras();
  }, []);

  const handleCambio = (carreraId, valor) => {
    setTarifas(prev => ({ ...prev, [carreraId]: parseFloat(valor) || 0 }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      for (const [id, precio] of Object.entries(tarifas)) {
        await api.put(`/academico/carreras/${id}`, { precio_credito: precio });
      }
      setMensaje({ tipo: 'success', texto: 'Tarifas actualizadas correctamente' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al guardar tarifas' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Configurar <span className="text-indigo-600">Tarifas</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Precios por crédito y colegiatura</p>
      </motion.div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl ${
          mensaje.tipo === 'success' ? 'bg-indigo-50 border border-teal-200 text-teal-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {mensaje.tipo === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-semibold">{mensaje.texto}</span>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-slate-900 rounded-xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <CreditCard size={24} className="text-teal-400" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-400">Precio por Crédito</p>
            <p className="text-lg font-bold italic">Establecer tarifas académicas</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Modifique el valor por crédito para cada carrera. Los estudiantes becados recibirán descuentos automáticos según su porcentaje de beca.
        </p>
      </div>

      {/* Carreras */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : carreras.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Settings size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">No hay carreras configuradas</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[350px] sm:min-w-[500px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-xs font-semibold text-slate-500 uppercase">Carrera</th>
                <th className="text-left py-3 px-3 sm:py-4 sm:px-6 text-xs font-semibold text-slate-500 uppercase">Código</th>
                <th className="text-center py-3 px-2 sm:py-4 sm:px-6 text-xs font-semibold text-slate-500 uppercase">Precio</th>
              </tr>
            </thead>
            <tbody>
              {carreras.map((carrera) => (
                <tr key={carrera.id} className="border-b border-slate-50">
                  <td className="py-3 px-3 sm:py-4 sm:px-6">
                    <p className="font-semibold text-slate-900 uppercase text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{carrera.nombre}</p>
                  </td>
                  <td className="py-3 px-3 sm:py-4 sm:px-6">
                    <span className="text-xs sm:text-sm text-slate-400">{carrera.codigo}</span>
                  </td>
                  <td className="py-3 px-2 sm:py-4 sm:px-6">
                    <div className="flex items-center justify-center gap-1">
                      <DollarSign size={12} className="text-slate-400" />
                      <input
                        type="number"
                        value={tarifas[carrera.id] ?? ''}
                        onChange={(e) => handleCambio(carrera.id, e.target.value)}
                        className="w-14 sm:w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleGuardar}
          disabled={guardando || loading}
          className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {guardando ? 'Guardando...' : 'Guardar Tarifas'}
        </button>
      </div>
    </div>
  );
};

export default TarifasPage;
