import { useState, useCallback } from 'react';
import api from '../../../services/api';

const useMora = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMora = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tesorero/estudiantes-mora');
      const data = res.data?.data || res.data;
      setEstudiantes(Array.isArray(data?.estudiantes) ? data.estudiantes : []);
    } catch (err) {
      setError(err.message);
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarEstudiante = useCallback(async (query) => {
    if (!query?.trim() || query.length < 3) return [];
    try {
      const res = await api.get(`/tesorero/buscar-estudiante?q=${encodeURIComponent(query)}`);
      const data = res.data?.data || res.data;
      return data?.estudiantes || [];
    } catch {
      return [];
    }
  }, []);

  return { estudiantes, loading, error, fetchMora, buscarEstudiante };
};

export default useMora;
