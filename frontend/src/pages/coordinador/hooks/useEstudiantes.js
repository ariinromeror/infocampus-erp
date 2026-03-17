import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEstudiantes = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const queryParams = { ...params, limit: 100 };
      const res = await academicoService.getEstudiantes(queryParams);
      const data = res.data?.data?.estudiantes || res.data?.estudiantes || res.data?.data || res.data || [];
      setEstudiantes(Array.isArray(data) ? data : (data.items || []));
      setTotal(res.data?.total || res.data?.data?.total || data.length || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getEstudiante = async (id) => {
    const res = await academicoService.getEstudiante(id);
    return res.data?.data || res.data;
  };

  const getEstadoCuenta = async (id) => {
    const res = await academicoService.getEstadoCuenta(id);
    return res.data?.data || res.data;
  };

  useEffect(() => { fetchEstudiantes(); }, [fetchEstudiantes]);

  return {
    estudiantes,
    total,
    loading,
    error,
    fetchEstudiantes,
    getEstudiante,
    getEstadoCuenta,
  };
};

export default useEstudiantes;
