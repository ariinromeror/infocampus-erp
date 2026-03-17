import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const useSecciones = () => {
  const [secciones, setSecciones] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resSec, resPer, resMat, resPro] = await Promise.allSettled([
        api.get('/academico/secciones'),
        api.get('/academico/periodos'),
        api.get('/academico/materias'),
        api.get('/academico/profesores'),
      ]);

      if (resSec.status === 'fulfilled') {
        const d = resSec.value.data;
        setSecciones(d?.data?.secciones || d?.secciones || []);
      }
      if (resPer.status === 'fulfilled') {
        const d = resPer.value.data;
        setPeriodos(d?.data?.periodos || d?.periodos || []);
      }
      if (resMat.status === 'fulfilled') {
        const d = resMat.value.data;
        setMaterias(d?.data?.materias || d?.materias || []);
      }
      if (resPro.status === 'fulfilled') {
        const d = resPro.value.data;
        setProfesores(d?.data?.profesores || d?.profesores || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchEstudiantesSeccion = useCallback(async (seccionId) => {
    try {
      const res = await api.get(`/academico/secciones/${seccionId}/estudiantes`);
      return res.data.data;
    } catch (err) {
      console.error('Error fetching estudiantes:', err);
      return null;
    }
  }, []);

  return { 
    secciones, 
    periodos, 
    materias, 
    profesores, 
    loading, 
    error,
    refetch: fetchData,
    fetchEstudiantesSeccion
  };
};

export default useSecciones;
