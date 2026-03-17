import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useProfesores = () => {
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchProfesores = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res = await academicoService.getProfesores(params);
      const raw = res.data?.data || res.data || [];
      setProfesores(Array.isArray(raw) ? raw : (raw?.profesores || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Devuelve array de secciones normalizado
  const getSecciones = async (profesorId) => {
    const res = await academicoService.getProfesorSecciones(profesorId);
    const raw = res.data?.data || res.data || [];
    return Array.isArray(raw) ? raw : (raw?.secciones || []);
  };

  const getAlumnos = async (profesorId, seccionId) => {
    const res = await academicoService.getProfesorAlumnos(profesorId, seccionId);
    const raw = res.data?.data || res.data || [];
    return Array.isArray(raw) ? raw : (raw?.alumnos || []);
  };

  const getEvaluaciones = async (profesorId, seccionId) => {
    const res = await academicoService.getProfesorEvaluaciones(profesorId, seccionId);
    const raw = res.data?.data || res.data || [];
    return Array.isArray(raw) ? raw : (raw?.evaluaciones || []);
  };

  useEffect(() => { fetchProfesores(); }, [fetchProfesores]);

  return { profesores, loading, error, fetchProfesores, getSecciones, getAlumnos, getEvaluaciones };
};

export default useProfesores;
