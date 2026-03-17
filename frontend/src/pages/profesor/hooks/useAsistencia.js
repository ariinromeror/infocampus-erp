import { useState } from 'react';
import api from '../../../services/api';

const useAsistencia = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const registrarAsistencia = async (seccionId, fecha, registros) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      await api.post('/profesor/asistencia', {
        seccion_id: seccionId,
        fecha,
        registros,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return { registrarAsistencia, loading, error, success, setSuccess };
};

export default useAsistencia;
