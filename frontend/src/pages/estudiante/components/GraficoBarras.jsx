import React from 'react';

const GraficoBarras = ({ data = [], loading = false }) => {
  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-64" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
        <p className="font-black text-slate-500 uppercase italic text-xl">
          Sin datos para graficar
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.valor || 0));

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm animate-in fade-in duration-700">
      <div className="space-y-6">
        {data.map((item, idx) => {
          const percentage = maxValue > 0 ? (item.valor / maxValue) * 100 : 0;
          
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase text-slate-900 tracking-tight">
                  {item.label || `Item ${idx + 1}`}
                </span>
                <span className="text-2xl font-black italic text-slate-900">
                  {item.valor?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraficoBarras;