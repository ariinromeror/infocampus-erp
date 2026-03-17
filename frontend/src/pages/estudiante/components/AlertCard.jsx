import React from 'react';
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * AlertCard - Estilo MINIMALISTA PURO
 * Sin emojis, sin colores neón, solo tipografía
 * Basado en el estilo de Dashboard.jsx
 */
const AlertCard = ({ 
  tipo = 'info',
  titulo = '',
  mensaje = '',
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 animate-pulse h-32" />
    );
  }

  // Configuración MINIMALISTA (sin colores neón)
  const configs = {
    urgente: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
      textColor: 'text-red-900',
      iconColor: 'text-red-600'
    },
    advertencia: {
      icon: AlertCircle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-600'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600'
    },
    exito: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      textColor: 'text-emerald-900',
      iconColor: 'text-emerald-600'
    }
  };

  const config = configs[tipo] || configs.info;
  const IconComponent = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-2xl p-8 shadow-sm animate-in fade-in duration-700`}>
      <div className="flex items-start gap-6">
        {/* Ícono */}
        <div className={`${config.iconColor} flex-shrink-0`}>
          <IconComponent size={32} />
        </div>

        {/* Contenido */}
        <div className="flex-1">
          {titulo && (
            <h3 className={`text-lg font-black uppercase italic ${config.textColor} mb-2`}>
              {titulo}
            </h3>
          )}
          <p className={`text-sm font-medium ${config.textColor} opacity-90`}>
            {mensaje}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlertCard;