import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import useEstadoCuenta from '../hooks/useEstadoCuenta';
import { Download, FileText } from 'lucide-react';
import api from '../../../services/api';

const fmt = (n) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0);

const EstadoCuentaPage = () => {
  const { user } = useAuth();
  const { pagos, resumen, loading } = useEstadoCuenta();
  const [descargando, setDescargando] = useState(false);

  const handleDescargarPDF = async () => {
    if (!user?.id) return;
    try {
      setDescargando(true);
      const res = await api.get(`/reportes/estado-cuenta/${user.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `estado_cuenta_${user.id}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
    } finally {
      setDescargando(false);
    }
  };

  if (loading) return (
    <div className="p-10 animate-pulse font-black text-slate-300 uppercase italic tracking-widest">
      Sincronizando finanzas...
    </div>
  );

  const safePagos = Array.isArray(pagos) ? pagos : [];

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
            Estado <span className="text-indigo-600">Financiero</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de pagos y beneficios institucionales
          </p>
        </div>

        <button
          onClick={handleDescargarPDF}
          disabled={descargando}
          className="flex-shrink-0 flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl font-black uppercase italic tracking-widest text-[10px] hover:bg-indigo-600 transition-colors disabled:opacity-50 group w-full sm:w-auto justify-center"
        >
          <Download size={15} className="group-hover:translate-y-0.5 transition-transform" />
          {descargando ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Total Pagado</p>
          <p className="text-2xl sm:text-4xl font-black italic text-slate-900">{fmt(resumen?.total_pagado)}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Pendiente</p>
          <p className="text-2xl sm:text-4xl font-black italic text-amber-600">{fmt(resumen?.deuda_pendiente)}</p>
          {resumen?.proximo_vencimiento && (
            <p className="text-xs text-slate-500 mt-1">
              Vence: {resumen.proximo_vencimiento}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Historial de Pagos</p>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{safePagos.length} registros</span>
        </div>

        {safePagos.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-sm font-medium text-slate-500">Sin registros de pagos</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Fecha', 'Concepto', 'Método', 'Monto', 'Estado'].map(h => (
                      <th key={h} className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {safePagos.map((pago, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-slate-500 whitespace-nowrap">
                        {pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{pago.concepto || 'Pago'}</p>
                        {pago.referencia && <p className="text-[10px] text-slate-400 font-bold">{pago.referencia}</p>}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-slate-500 uppercase whitespace-nowrap">
                        {pago.metodo_pago || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-lg font-black italic text-slate-900">{fmt(pago.monto)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1 border-2 whitespace-nowrap ${
                          pago.estado === 'completado'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-amber-500 text-amber-500'
                        }`}>
                          {pago.estado === 'completado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-slate-50">
              {safePagos.map((pago, idx) => (
                <div key={idx} className="px-6 py-5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-black text-slate-900 uppercase text-sm tracking-tight truncate">{pago.concepto || 'Pago'}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black italic text-slate-900">{fmt(pago.monto)}</p>
                      <span className={`text-xs font-black uppercase tracking-tighter px-2 py-0.5 border ${
                        pago.estado === 'completado'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-amber-500 text-amber-500'
                      }`}>
                        {pago.estado === 'completado' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                  {pago.metodo_pago && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{pago.metodo_pago}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EstadoCuentaPage;