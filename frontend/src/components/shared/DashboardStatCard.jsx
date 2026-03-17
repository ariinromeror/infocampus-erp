/**
 * DashboardStatCard — Unified stat card for all dashboards.
 * Design: Slate-900 text, Indigo-600 accents, rounded-xl/2xl.
 * Replaces duplicate StatCard implementations across modules.
 */
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

const DashboardStatCard = ({
  label,
  value,
  sub = null,
  icon = 'Activity',
  loading = false,
  onClick = null,
  warn = false,
  delay = 0,
}) => {
  const IconComp = typeof icon === 'function' ? icon : (LucideIcons[icon] || LucideIcons.Activity);

  if (loading) {
    return (
      <div className="rounded-xl p-4 sm:p-5 border border-slate-100 bg-slate-50 animate-pulse h-24 sm:h-28" />
    );
  }

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? { onClick, type: 'button', className: 'cursor-pointer text-left w-full' }
    : { className: 'text-left w-full' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Wrapper
        {...wrapperProps}
        className={`
          bg-white border rounded-xl p-4 sm:p-5 shadow-sm transition-all duration-200
          ${warn ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200'}
          ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]' : ''}
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${warn ? 'bg-amber-100' : 'bg-indigo-50'}`}>
            <IconComp size={16} className={warn ? 'text-amber-600' : 'text-indigo-600'} strokeWidth={1.5} />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {sub && (
          <p className="text-[10px] font-medium text-slate-400 mt-1">{sub}</p>
        )}
        {onClick && (
          <p className="text-[10px] font-semibold text-indigo-600 mt-2">Ver detalle →</p>
        )}
      </Wrapper>
    </motion.div>
  );
};

export default DashboardStatCard;
