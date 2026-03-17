import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';
import { withRetry } from '../../../utils/retryFetch';

const useDirectorDashboard = () => {
  const [institucional, setInstitucional] = useState(null);
  const [finanzas, setFinanzas]           = useState(null);
  const [morosos, setMorosos]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [resInst, resFin, resMora] = await withRetry(() =>
        Promise.allSettled([
          academicoService.getStatsInstitucional(),
          academicoService.getStatsFinanzas(),
          academicoService.getTesoreroMora(),
        ])
      );
      if (resInst.status === 'fulfilled') setInstitucional(resInst.value.data?.data || resInst.value.data);
      if (resFin.status  === 'fulfilled') setFinanzas(resFin.value.data?.data || resFin.value.data);
      if (resMora.status === 'fulfilled') setMorosos(resMora.value.data?.data?.estudiantes || resMora.value.data?.estudiantes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { institucional, finanzas, morosos, loading, error, refetch: fetchData };
};

export default useDirectorDashboard;
