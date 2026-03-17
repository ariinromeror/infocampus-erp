import { useState, useCallback } from 'react';
import api from '../../../services/api';

const useIngresos = () => {
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIngresos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tesorero/ingresos-por-periodo');
      const data = res.data?.data || res.data;
      setPeriodos(data?.periodos || []);
    } catch (err) {
      setError(err.message);
      setPeriodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const descargarReporte = useCallback(async (dias = 30) => {
    try {
      const res = await api.get(`/reportes/tesoreria?dias=${dias}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_tesoreria_${dias}dias.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Error al descargar reporte' };
    }
  }, []);

  return { periodos, loading, error, fetchIngresos, descargarReporte };
};

export default useIngresos;
