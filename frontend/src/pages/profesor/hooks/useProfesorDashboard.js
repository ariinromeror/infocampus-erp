import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { withRetry } from '../../../utils/retryFetch';

const useProfesorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await withRetry(() => api.get('/dashboards/profesor'));
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export default useProfesorDashboard;
