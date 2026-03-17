/**
 * StatCard — Alias for DashboardStatCard. Backward-compatible props.
 */
import DashboardStatCard from './DashboardStatCard';

const StatCard = ({
  titulo,
  title,
  valor,
  value,
  sub,
  icon,
  variant,
  loading,
  delay,
  onClick,
  warn,
}) => (
  <DashboardStatCard
    label={titulo ?? title ?? 'Métrica'}
    value={valor ?? value ?? '—'}
    sub={sub}
    icon={icon}
    loading={loading}
    delay={delay}
    onClick={onClick}
    warn={warn}
  />
);

export default StatCard;
