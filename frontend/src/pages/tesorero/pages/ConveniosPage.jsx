import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, AlertTriangle, FileText, ChevronRight, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useMora from '../hooks/useMora';
import SelectModal from '../components/SelectModal';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';
import { generarReporteMoraPDF } from '../components/pdfUtils';
import api from '../../../services/api';

const fmtMonto = (n) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n || 0);

const ConveniosPage = () => {
  const navigate = useNavigate();
  const { estudiantes, loading, fetchMora } = useMora();
  const [busqueda, setBusqueda] = useState('');
  const [carreras, setCarreras] = useState([]);
  const [filtroCarrera, setFiltroCarrera] = useState('');

  useEffect(() => { 
    fetchMora(); 
  }, [fetchMora]);

  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const res = await api.get('/academico/carreras');
        const data = Array.isArray(res.data?.data?.carreras) ? res.data.data.carreras : 
                     Array.isArray(res.data?.data) ? res.data.data : 
                     Array.isArray(res.data) ? res.data : [];
        setCarreras(data);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    fetchCarreras();
  }, []);

  const filtrados = (estudiantes || [])
    .filter(e => e.convenio_activo)
    .filter(e => !filtroCarrera || e.carrera_id === parseInt(filtroCarrera))
    .filter(e => 
      !busqueda.trim() ||
      (e.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.cedula || '').includes(busqueda)
    );

  const totalConvenios = filtrados.length;
  const totalDeuda = (estudiantes || [])
    .filter(e => e.convenio_activo)
    .reduce((a, e) => a + (e.deuda_total || 0), 0);

  const handleGenerarPDF = () => {
    generarReporteMoraPDF({
      estudiantes: filtrados,
      totalDeuda,
      fechaReporte: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-7 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Convenios <span className="text-indigo-600">de Pago</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestión de acuerdos de pago con estudiantes
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <ShieldCheck size={16} className="sm:size-18 text-indigo-600" />
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Convenios Activos</p>
          </div>
          <p className="text-2xl sm:text-3xl font-black italic text-indigo-600">{loading ? '—' : totalConvenios}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <DollarSign size={16} className="sm:size-18 text-indigo-600" />
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Deuda Total</p>
          </div>
          <p className="text-xl sm:text-3xl font-black italic text-indigo-600">{loading ? '—' : fmtMonto(totalDeuda)}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center">
          <button
            onClick={handleGenerarPDF}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors text-xs sm:text-sm"
          >
            <FileText size={16} className="sm:size-18" />
            <span className="text-[10px] font-black uppercase tracking-wider">Descargar Reporte</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto max-h-[60vh] sm:max-h-none"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera</label>
            <SelectModal
              options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
              value={filtroCarrera}
              onChange={setFiltroCarrera}
              placeholder="Todas las carreras"
              label="Seleccionar Carrera"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o cédula..."
                className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lista */}
      {loading ? (
        <SkeletonTable rows={5} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No hay convenios activos"
          description="Los estudiantes con convenios de pago aparecerán aquí"
        />
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[550px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-4 px-6 text-[11px] font-black uppercase tracking-wider text-slate-400">Estudiante</th>
                <th className="text-left py-4 px-6 text-[11px] font-black uppercase tracking-wider text-slate-400">Cédula</th>
                <th className="text-center py-4 px-6 text-[11px] font-black uppercase tracking-wider text-slate-400">Deuda</th>
                <th className="text-center py-4 px-6 text-[11px] font-black uppercase tracking-wider text-slate-400">Vencimiento</th>
                <th className="text-right py-4 px-6 text-[11px] font-black uppercase tracking-wider text-slate-400">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((est, i) => (
                <tr 
                  key={est.id} 
                  onClick={() => navigate(`/tesorero/estudiante/${est.id}`)}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-6">
                    <p className="font-black text-slate-900 uppercase text-sm truncate">{est.nombre}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold text-slate-400">{est.cedula}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="font-black italic text-indigo-600">{fmtMonto(est.deuda_total)}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-xs font-bold text-slate-400">
                      {est.fecha_limite_convenio ? new Date(est.fecha_limite_convenio).toLocaleDateString('es-EC') : '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <ChevronRight size={16} className="text-slate-300 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ConveniosPage;
