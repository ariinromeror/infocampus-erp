import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useAsistencia = () => {
  const { user } = useAuth();
  const [asistencias, setAsistencias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsistencia = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await api.get(`/estudiante/${user.id}/asistencias`);
        setAsistencias(response.data.data.asistencias || []);
        setEstadisticas(response.data.data.estadisticas || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAsistencia();
  }, [user?.id]);

  return { asistencias, estadisticas, loading, error };
};

export default useAsistencia;