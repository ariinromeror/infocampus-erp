import { motion } from 'framer-motion';

/**
 * DashboardHero — Banner oscuro con decoraciones de cristal para cabeceras de dashboards.
 * Props:
 *   greeting  {string}    — Nombre de bienvenida, ej: "Hola, María"
 *   subtitle  {string}    — Subtítulo descriptivo
 *   badge     {string}    — Texto pequeño en indigo sobre el greeting (opcional)
 *   actions   {ReactNode} — Botones de acción en la esquina superior derecha (opcional)
 */
const DashboardHero = ({ greeting, subtitle, badge, actions = null }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="relative bg-slate-900 rounded-2xl p-5 sm:p-8 lg:p-10 text-white overflow-hidden"
  >
    {/* Decoraciones glassmorphism */}
    <div className="absolute -right-8 -top-8 w-48 h-48 bg-indigo-600/10 rounded-full pointer-events-none" />
    <div className="absolute right-24 bottom-0 w-24 h-24 bg-indigo-500/5 rounded-full pointer-events-none" />

    <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
      <div>
        {badge && (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">
            {badge}
          </p>
        )}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none mb-2 sm:mb-3">
          {greeting}
        </h1>
        {subtitle && (
          <p className="text-slate-400 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  </motion.div>
);

export default DashboardHero;
