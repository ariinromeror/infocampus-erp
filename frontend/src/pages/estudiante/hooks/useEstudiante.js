import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const useEstudiante = () => {
  const { user } = useAuth();
  const [estudiante, setEstudiante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEstudiante = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const [resPerfil, resEstado] = await Promise.all([
          api.get('/auth/perfil'),
          api.get(`/estudiantes/${user.id}/estado-cuenta`)
        ]);
        setEstudiante({
          ...resPerfil.data,
          ...resEstado.data
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEstudiante();
  }, [user?.id]);

  return { estudiante, loading, error };
};

export default useEstudiante;