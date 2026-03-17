import { useState, useEffect } from 'react';
import api from '../../../services/api';

const useNotas = (seccionId) => {
  const [inscripciones, setInscripciones] = useState([]);
  const [seccion, setSeccion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!seccionId) {
        setInscripciones([]);
        setSeccion(null);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`/inscripciones/seccion/${seccionId}/notas`);
        setInscripciones(response.data.data.inscripciones || []);
        setSeccion(response.data.data.seccion || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [seccionId]);

  const registrarNota = async (inscripcionId, notaFinal) => {
    const response = await api.put(`/inscripciones/${inscripcionId}/nota`, { nota_final: notaFinal });
    setInscripciones(prev =>
      prev.map(i => i.inscripcion_id === inscripcionId ? { ...i, nota_final: notaFinal } : i)
    );
    return response.data;
  };

  return { inscripciones, seccion, loading, error, registrarNota };
};

export default useNotas;
