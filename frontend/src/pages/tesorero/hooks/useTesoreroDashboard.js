import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { withRetry } from '../../../utils/retryFetch';

const useTesoreroDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [finanzas, setFinanzas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [resKpis, resFinanzas] = await withRetry(() =>
        Promise.allSettled([
          api.get('/tesorero/resumen-kpis'),
          api.get('/dashboards/finanzas'),
        ])
      );
      if (resKpis.status === 'fulfilled') {
        setKpis(resKpis.value.data?.data || resKpis.value.data);
      }
      if (resFinanzas.status === 'fulfilled') {
        setFinanzas(resFinanzas.value.data?.data || resFinanzas.value.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const recaudadoTotal = kpis?.recaudado_total || finanzas?.ingreso_real || 0;
  const pendienteCobro = kpis?.pendiente_cobro || (finanzas?.ingreso_proyectado - finanzas?.ingreso_real) || 0;
  const estudiantesMora = kpis?.estudiantes_mora || finanzas?.listado_cobranza?.length || 0;
  const tasaCobranza = finanzas?.tasa_cobranza || 0;
  const ingresosMensuales = kpis?.ingresos_ultimos_6_meses || [];

  return {
    kpis, finanzas,
    recaudadoTotal, pendienteCobro,
    estudiantesMora, tasaCobranza,
    ingresosMensuales, loading, error,
    refetch: fetchData,
  };
};

export default useTesoreroDashboard;
