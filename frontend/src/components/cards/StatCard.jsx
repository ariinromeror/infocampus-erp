import React from 'react';
import { motion } from 'framer-motion';

/**
 * StatCard - Tarjeta de estadística reutilizable RESPONSIVA
 * 
 * @param {string} title - Título de la tarjeta
 * @param {string|number} value - Valor principal
 * @param {React.Component} icon - Ícono de Lucide
 * @param {string} color - Color del tema (blue, red, green, purple, indigo, emerald)
 * @param {string} subtitle - Subtítulo opcional
 * @param {function} onClick - Función al hacer clic
 */
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  subtitle,
  onClick 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  const textColorClasses = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-emerald-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    indigo: 'text-indigo-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`
        bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 
        flex items-center gap-3 sm:gap-4 
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all' : ''}
      `}
    >
      {/* Ícono - Tamaño responsivo */}
      <div className={`p-2.5 sm:p-3 rounded-2xl ${colorClasses[color]} flex-shrink-0`}>
        <Icon size={20} className="sm:w-6 sm:h-6" />
      </div>

      {/* Contenido - Con overflow control */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide truncate">
          {title}
        </p>
        <p className={`text-xl sm:text-2xl font-black ${textColorClasses[color]} break-words`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;