import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useSecciones = () => {
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecciones = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res = await academicoService.getSecciones(params);
      setSecciones(res.data?.data?.secciones || res.data?.secciones || res.data?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearSeccion = async (data) => {
    const res = await academicoService.crearSeccion(data);
    await fetchSecciones();
    return res;
  };

  const actualizarSeccion = async (id, data) => {
    const res = await academicoService.actualizarSeccion(id, data);
    await fetchSecciones();
    return res;
  };

  useEffect(() => { fetchSecciones(); }, [fetchSecciones]);

  return {
    secciones,
    loading,
    error,
    fetchSecciones,
    crearSeccion,
    actualizarSeccion,
  };
};

export default useSecciones;
