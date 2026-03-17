import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useEvaluaciones = (seccionId) => {
  const { user } = useAuth();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvaluaciones = async () => {
    if (!user?.id || !seccionId) {
      setEvaluaciones([]);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/profesor/${user.id}/seccion/${seccionId}/evaluaciones`);
      setEvaluaciones(response.data.data.evaluaciones || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluaciones();
  }, [user?.id, seccionId]);

  const registrarEvaluacion = async (payload) => {
    const response = await api.post('/profesor/evaluacion', payload);
    await fetchEvaluaciones();
    return response.data;
  };

  return { evaluaciones, loading, error, registrarEvaluacion, refetch: fetchEvaluaciones };
};

export default useEvaluaciones;
