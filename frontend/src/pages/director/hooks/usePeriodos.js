import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const usePeriodos = () => {
  const [periodos,      setPeriodos]      = useState([]);
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const fetchPeriodos = useCallback(async () => {
    try {
      setLoading(true);
      const [resPer, resActivo] = await Promise.allSettled([
        academicoService.getPeriodos(),
        academicoService.getPeriodoActivo(),
      ]);
      if (resPer.status    === 'fulfilled') {
        const d = resPer.value.data?.data?.periodos || resPer.value.data?.periodos || resPer.value.data?.data || resPer.value.data || [];
        setPeriodos(Array.isArray(d) ? d : []);
      }
      if (resActivo.status === 'fulfilled') {
        setPeriodoActivo(resActivo.value.data?.data || resActivo.value.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearPeriodo = async (data) => {
    const r = await academicoService.crearPeriodo(data);
    await fetchPeriodos();
    return r;
  };

  const cerrarCiclo = async () => {
    const r = await academicoService.cerrarCiclo();
    await fetchPeriodos();
    return r;
  };

  // CORRECCIÓN CRÍTICA: el backend devuelve { periodo:{...}, estadisticas:{...} }
  // antes se retornaba el wrapper completo; ahora se extrae estadisticas directamente
  const getEstadisticas = async (id) => {
    const r = await academicoService.getPeriodoEstadisticas(id);
    const d = r.data?.data || r.data;
    // Si viene con wrapper estadisticas, extraerlo; si no, devolver tal cual
    return d?.estadisticas || d;
  };

  useEffect(() => { fetchPeriodos(); }, [fetchPeriodos]);

  return { periodos, periodoActivo, loading, error, fetchPeriodos, crearPeriodo, cerrarCiclo, getEstadisticas };
};

export default usePeriodos;