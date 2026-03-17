import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useNotas = () => {
  const { user } = useAuth();
  const [notas, setNotas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotas = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await api.get(`/estudiante/${user.id}/notas`);
        setNotas(response.data.data.notas || []);
        setPeriodos(response.data.data.periodos || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotas();
  }, [user?.id]);

  return { notas, periodos, loading, error };
};

export default useNotas;