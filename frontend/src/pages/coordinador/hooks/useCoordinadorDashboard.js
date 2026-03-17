import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';
import { withRetry } from '../../../utils/retryFetch';

const useCoordinadorDashboard = () => {
  const [resumen, setResumen] = useState(null);
  const [iaContexto, setIaContexto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [resInst, resIA] = await withRetry(() =>
        Promise.allSettled([
          academicoService.getStatsInstitucional(),
          academicoService.getIAContexto(),
        ])
      );
      if (resInst.status === 'fulfilled') {
        setResumen(resInst.value.data?.data || resInst.value.data);
      }
      if (resIA.status === 'fulfilled') {
        setIaContexto(resIA.value.data?.data || resIA.value.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    resumen,
    iaContexto,
    loading,
    error,
    refetch: fetchData,
  };
};

export default useCoordinadorDashboard;
