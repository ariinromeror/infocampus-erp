import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const useEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCarreras = useCallback(async () => {
    try {
      const res = await api.get('/academico/carreras');
      const data = res.data;
      setCarreras(data?.data?.carreras || data?.carreras || []);
    } catch {}
  }, []);

  const fetchEstudiantes = useCallback(async (filtros = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.page) params.append('page', filtros.page);
      if (filtros.limit) params.append('limit', filtros.limit);
      if (filtros.q) params.append('q', filtros.q);
      if (filtros.carrera_id) params.append('carrera_id', filtros.carrera_id);
      if (filtros.semestre) params.append('semestre', filtros.semestre);
      if (filtros.es_becado) params.append('es_becado', 'true');

      const res = await api.get(`/academico/estudiantes?${params}`);
      const data = res.data;
      const lista = data?.data?.estudiantes || data?.estudiantes || [];
      const totalReg = data?.data?.total || data?.total || lista.length;
      
      setEstudiantes(lista);
      setTotal(totalReg);
    } catch (err) {
      setError(err.message);
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarreras();
  }, [fetchCarreras]);

  return { 
    estudiantes, 
    carreras, 
    total, 
    loading, 
    error, 
    fetchEstudiantes,
    fetchCarreras
  };
};

export default useEstudiantes;
