import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useNotas = () => {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotas = useCallback(async (seccionId) => {
    if (!seccionId) return;
    try {
      setLoading(true);
      const res = await academicoService.getDetalleSeccionNotas(seccionId);
      setNotas(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const corregirNota = async (inscripcionId, data) => {
    const res = await academicoService.corregirNota(inscripcionId, data);
    return res;
  };

  const clearNotas = () => {
    setNotas([]);
  };

  const actualizarNota = async (inscripcionId, data) => {
    const res = await academicoService.actualizarNota(inscripcionId, data);
    return res;
  };

  return {
    notas,
    loading,
    error,
    fetchNotas,
    corregirNota,
    actualizarNota,
    clearNotas,
  };
};

export default useNotas;
