import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useEstadoCuenta = () => {
  const { user } = useAuth();
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEstadoCuenta = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await api.get(`/estudiante/${user.id}/pagos`);
        setPagos(response.data.data.pagos || []);
        setResumen(response.data.data.resumen || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEstadoCuenta();
  }, [user?.id]);

  return { pagos, resumen, loading, error };
};

export default useEstadoCuenta;