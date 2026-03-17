import { useState, useEffect } from 'react';
import api from '../../../services/api';

const useSecretariaDashboard = () => {
  const [resumen, setResumen] = useState(null);
  const [periodo, setPeriodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resInst, resPer] = await Promise.allSettled([
          api.get('/dashboards/institucional'),
          api.get('/periodos/activo'),
        ]);
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
    };
    fetchData();
  }, []);

  return { resumen, periodo, loading, error };
};

export default useSecretariaDashboard;
