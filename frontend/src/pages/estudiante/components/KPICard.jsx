import React from 'react';
import * as Icons from 'lucide-react';

/**
 * KPICard - Estilo MINIMALISTA PURO
 * Basado en el estilo de Dashboard.jsx y EstatusPage.jsx
 * Sin emojis, sin colores neón, solo tipografía y contraste
 */
const KPICard = ({ 
  title = 'SIN TÍTULO', 
  value = '--', 
  subtitle = '', 
  icon = 'Activity',
  color = 'slate', 
  loading = false,
  variant = 'solid'
}) => {
  if (loading) return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 animate-pulse h-40" />
  );

  const IconComponent = Icons[icon] || Icons.Activity;

  // Paleta MINIMALISTA (sin colores neón)
  const colors = {
    indigo: variant === 'solid' 
      ? 'bg-indigo-600 text-white border-indigo-600' 
      : 'bg-white text-slate-900 border-slate-100',
    emerald: variant === 'solid'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-white text-slate-900 border-slate-100',
    amber: variant === 'solid'
      ? 'bg-amber-600 text-white border-amber-600'
      : 'bg-white text-slate-900 border-slate-100',
    red: variant === 'solid'
      ? 'bg-red-600 text-white border-red-600'
      : 'bg-white text-slate-900 border-slate-100',
    slate: variant === 'solid'
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white text-slate-900 border-slate-100'
  };

  const theme = colors[color] || colors.slate;

  return (
    <div className={`${theme} border rounded-2xl p-10 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden`}>
      {/* Ícono decorativo de fondo (estilo Dashboard.jsx) */}
      <IconComponent className="absolute right-[-20px] top-[-20px] size-48 opacity-10 -rotate-12" />
      
      <div className="relative z-10">
        {/* Título minimalista */}
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-slate-400">
          {title}
        </p>
        
        {/* Valor grande */}
        <h2 className="text-5xl font-black italic tracking-tighter leading-none mb-2">
          {value}
        </h2>
        
        {/* Subtítulo opcional */}
        {subtitle && (
          <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default KPICard;