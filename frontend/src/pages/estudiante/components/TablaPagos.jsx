import React from 'react';
import { Download } from 'lucide-react';

const TablaPagos = ({ pagos = [], resumen = null, loading = false }) => {
  if (loading) return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-48" />
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-96" />
    </div>
  );

  const safePagos = Array.isArray(pagos) ? pagos : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b-4 border-slate-900">
              <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Fecha</th>
              <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Concepto</th>
              <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Método</th>
              <th className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Monto</th>
              <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {safePagos.length > 0 ? (
              safePagos.map((pago, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-6 px-8 text-sm font-bold text-slate-600">
                    {pago.fecha
                      ? new Date(pago.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="py-6 px-8">
                    <p className="font-black text-slate-900 uppercase text-sm tracking-tight">
                      {pago.concepto || 'Pago'}
                    </p>
                    {pago.referencia && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{pago.referencia}</p>
                    )}
                  </td>
                  <td className="py-6 px-8">
                    <p className="text-sm font-bold text-slate-600 uppercase">
                      {pago.metodo_pago || '—'}
                    </p>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <p className="text-2xl font-black italic text-slate-900">
                      ${pago.monto != null ? parseFloat(pago.monto).toFixed(2) : '0.00'}
                    </p>
                  </td>
                  <td className="py-6 px-8 text-center">
                    <span className={`text-[10px] font-black uppercase tracking-tighter px-4 py-1 border-2 ${
                      pago.estado === 'completado'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-amber-600 text-amber-600'
                    }`}>
                      {pago.estado === 'completado' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-20 text-center">
                  <p className="font-black text-slate-500 uppercase italic text-xl">Sin registros de pagos</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Pagado</p>
            <p className="text-4xl font-black italic text-slate-900">
              ${resumen.total_pagado != null ? parseFloat(resumen.total_pagado).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Deuda Pendiente</p>
            <p className="text-4xl font-black italic text-amber-600">
              ${resumen.deuda_pendiente != null ? parseFloat(resumen.deuda_pendiente).toFixed(2) : '0.00'}
            </p>
            {resumen.proximo_vencimiento && (
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                Vence: {resumen.proximo_vencimiento}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaPagos;