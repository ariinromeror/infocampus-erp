import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetchEstudiantes = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res  = await academicoService.getEstudiantes(params);
      const data = res.data?.data || res.data || [];
      setEstudiantes(Array.isArray(data) ? data : data.items || data.estudiantes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getEstudiante    = async (id) => { const r = await academicoService.getEstudiante(id); return r.data?.data || r.data; };
  const getEstadoCuenta  = async (id) => { const r = await academicoService.getEstadoCuenta(id); return r.data?.data || r.data; };

  useEffect(() => { fetchEstudiantes(); }, [fetchEstudiantes]);

  return { estudiantes, loading, error, fetchEstudiantes, getEstudiante, getEstadoCuenta };
};

export default useEstudiantes;
