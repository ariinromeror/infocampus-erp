import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { withRetry } from '../../../utils/retryFetch';

const useSecretariaDashboard = () => {
  const [resumen, setResumen] = useState(null);
  const [periodo, setPeriodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [resInst, resPer] = await withRetry(() =>
        Promise.allSettled([
          api.get('/dashboards/institucional'),
          api.get('/periodos/activo'),
        ])
      );
      if (resInst.status === 'fulfilled') {
        const d = resInst.value.data;
        setResumen(d?.data || d);
      }
      if (resPer.status === 'fulfilled') {
        const d = resPer.value.data;
        setPeriodo(d?.data || d);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { resumen, periodo, loading, error, refetch: fetchData };
};

export default useSecretariaDashboard;
