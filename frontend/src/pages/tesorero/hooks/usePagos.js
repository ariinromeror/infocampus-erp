import { useState, useCallback } from 'react';
import api from '../../../services/api';

const usePagos = () => {
  const [pagos, setPagos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPagos = useCallback(async (filtros = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', filtros.page || 1);
      params.append('limit', filtros.limit || 20);
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.periodo_id) params.append('periodo_id', filtros.periodo_id);
      if (filtros.estudiante_id) params.append('estudiante_id', filtros.estudiante_id);
      if (filtros.carrera_id) params.append('carrera_id', filtros.carrera_id);
      if (filtros.semestre) params.append('semestre', filtros.semestre);

      const res = await api.get(`/tesorero/pagos?${params}`);
      const data = res.data?.data || res.data;
      setPagos(Array.isArray(data?.pagos) ? data.pagos : []);
      setTotal(data?.total || 0);
      setTotalPages(data?.total_pages || 1);
    } catch (err) {
      setError(err.message);
      setPagos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { pagos, total, totalPages, loading, error, fetchPagos };
};

export default usePagos;
