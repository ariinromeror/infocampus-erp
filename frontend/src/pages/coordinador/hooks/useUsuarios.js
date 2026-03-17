import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsuarios = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const res = await academicoService.getUsuarios(params);
      const data = res.data?.data || res.data || [];
      setUsuarios(Array.isArray(data) ? data : (data.items || []));
      setTotal(res.data?.total || data.length || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearUsuario = async (data) => {
    const res = await academicoService.crearUsuario(data);
    await fetchUsuarios();
    return res;
  };

  const actualizarUsuario = async (id, data) => {
    const res = await academicoService.actualizarUsuario(id, data);
    await fetchUsuarios();
    return res;
  };

  const inscribirEstudiante = async (data) => {
    const res = await academicoService.inscribirEstudiante(data);
    return res;
  };

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  return {
    usuarios,
    total,
    loading,
    error,
    fetchUsuarios,
    crearUsuario,
    actualizarUsuario,
    inscribirEstudiante,
  };
};

export default useUsuarios;
