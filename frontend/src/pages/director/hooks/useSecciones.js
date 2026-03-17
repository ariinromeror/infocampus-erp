import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useSecciones = () => {
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchSecciones = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res = await academicoService.getSecciones(params);
      const raw = res.data?.data?.secciones || res.data?.data || res.data || [];
      setSecciones(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearSeccion     = async (data)     => { const r = await academicoService.crearSeccion(data);       await fetchSecciones(); return r; };
  const actualizarSeccion = async (id, data) => { const r = await academicoService.actualizarSeccion(id, data); await fetchSecciones(); return r; };
  const getNotas         = async (id)       => { const r = await academicoService.getDetalleSeccionNotas(id); return r.data?.data || r.data; };

  useEffect(() => { fetchSecciones(); }, [fetchSecciones]);

  return { secciones, loading, error, fetchSecciones, crearSeccion, actualizarSeccion, getNotas };
};

export default useSecciones;
