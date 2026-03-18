/**
 * Moneda para InfoCampus (España)
 */
export const CURRENCY = { symbol: '€', locale: 'es-ES' };

export const formatMoney = (n) =>
  `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`;
