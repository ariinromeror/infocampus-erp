import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useSecciones = () => {
  const { user } = useAuth();
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await api.get(`/profesor/${user.id}/secciones`);
        setSecciones(response.data.data.secciones || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  return { secciones, loading, error };
};

export default useSecciones;
