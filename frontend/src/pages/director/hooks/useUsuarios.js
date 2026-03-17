import { useState, useEffect, useCallback } from 'react';
import { academicoService } from '../../../services/academicoService';

const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchUsuarios = useCallback(async (params = { limit: 200 }) => {
    try {
      setLoading(true);
      const res  = await academicoService.getUsuarios(params);
      const data = res.data?.data?.usuarios || res.data?.data || res.data?.usuarios || res.data || [];
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearUsuario     = async (data)     => { const r = await academicoService.crearUsuario(data);         await fetchUsuarios(); return r; };
  const actualizarUsuario = async (id, data) => { const r = await academicoService.actualizarUsuario(id, data); await fetchUsuarios(); return r; };

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  return { usuarios, loading, error, fetchUsuarios, crearUsuario, actualizarUsuario };
};

export default useUsuarios;
