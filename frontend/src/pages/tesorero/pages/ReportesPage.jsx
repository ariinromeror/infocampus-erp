import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, DollarSign, Users, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import { generarReporteMoraPDF, generarReporteIngresosPDF } from '../components/pdfUtils';

const ReportesPage = () => {
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [mora, setMora] = useState(null);
  const [ingresos, setIngresos] = useState(null);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resKpis, resMora, resIngresos] = await Promise.allSettled([
          api.get('/tesorero/resumen-kpis'),
          api.get('/tesorero/estudiantes-mora'),
          api.get('/tesorero/ingresos-por-periodo'),
        ]);
        if (resKpis.status === 'fulfilled') setKpis(resKpis.value.data);
        if (resMora.status === 'fulfilled') setMora(resMora.value.data?.data?.estudiantes || []);
        if (resIngresos.status === 'fulfilled') setIngresos(resIngresos.value.data?.data?.periodos || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReporteTesoreria = async () => {
    try {
      const res = await api.get(`/reportes/tesoreria?dias=${dias}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_Tesoreria_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleReporteMora = () => {
    const totalDeuda = mora.reduce((a, e) => a + (e.deuda_total || 0), 0);
    generarReporteMoraPDF({ estudiantes: mora, totalDeuda });
  };

  const handleReporteIngresos = () => {
    const ingresosTotales = (ingresos || []).reduce((a, e) => a + (e.ingresos_totales || 0), 0);
    const pagosCompletados = (ingresos || []).reduce((a, e) => a + (e.pagos_completados || 0), 0);
    generarReporteIngresosPDF({ periodos: ingresos, ingresosTotales, pagosCompletados });
  };

  const reportes = [
    {
      titulo: 'Reporte de Tesorería',
      descripcion: 'Resumen financiero del período seleccionado',
      icono: DollarSign,
      color: 'bg-indigo-600',
      accion: handleReporteTesoreria,
      extra: (
        <div className="flex items-center gap-2 mt-3">
          <select
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
        </div>
      )
    },
    {
      titulo: 'Reporte de Mora',
      descripcion: 'Lista de estudiantes con deuda pendiente',
      icono: AlertTriangle,
      color: 'bg-rose-600',
      accion: handleReporteMora,
      datos: `${mora?.length || 0} estudiantes en mora`
    },
    {
      titulo: 'Reporte de Ingresos',
      descripcion: 'Ingresos agrupados por período lectivo',
      icono: Calendar,
      color: 'bg-indigo-600',
      accion: handleReporteIngresos,
      datos: `${ingresos?.length || 0} períodos`
    },
  ];

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Reportes <span className="text-indigo-600">PDF</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Generar documentos financieros
        </p>
      </motion.div>

      {/* Stats mini */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4">
          <p className="text-[11px] font-black uppercase text-slate-400">Total Recaudado</p>
          <p className="text-lg sm:text-xl font-black italic text-indigo-600">
            ${(kpis?.recaudado_total || 0).toLocaleString('es-EC', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4">
          <p className="text-[11px] font-black uppercase text-slate-400">Pendiente</p>
          <p className="text-lg sm:text-xl font-black italic text-indigo-600">
            ${(kpis?.pendiente_cobro || 0).toLocaleString('es-EC', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4">
          <p className="text-[11px] font-black uppercase text-slate-400">En Mora</p>
          <p className="text-lg sm:text-xl font-black italic text-indigo-600">
            {kpis?.estudiantes_mora || 0}
          </p>
        </div>
      </div>

      {/* Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportes.map((r, i) => (
          <motion.div
            key={r.titulo}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 ${r.color} rounded-xl`}>
                <r.icono size={20} className="text-white" />
              </div>
              <div>
                <p className="font-black text-slate-900 uppercase text-sm">{r.titulo}</p>
                {r.datos && <p className="text-[11px] text-slate-400">{r.datos}</p>}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mb-4">{r.descripcion}</p>
            {r.extra}
            <button
              onClick={r.accion}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 ${r.color} text-white rounded-xl font-black uppercase text-[10px] tracking-wider hover:opacity-90 transition-opacity`}
            >
              <Download size={14} />
              {loading ? 'Generando...' : 'Descargar PDF'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReportesPage;
