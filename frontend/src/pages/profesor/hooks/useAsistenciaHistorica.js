import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useAsistenciaHistorica = (seccionId) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!user?.id || !seccionId) {
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/profesor/${user.id}/seccion/${seccionId}/asistencia-historica`);
      setData(response.data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, seccionId]);

  return { data, loading, error, refetch: fetchData };
};

export default useAsistenciaHistorica;
