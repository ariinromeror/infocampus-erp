import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useSeccionAlumnos = (seccionId) => {
  const { user } = useAuth();
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !seccionId) {
        setAlumnos([]);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`/profesor/${user.id}/seccion/${seccionId}/alumnos`);
        setAlumnos(response.data.data.alumnos || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id, seccionId]);

  return { alumnos, loading, error, setAlumnos };
};

export default useSeccionAlumnos;
