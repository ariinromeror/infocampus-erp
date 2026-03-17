import { useState, useCallback } from 'react';
import api from '../../../services/api';

const useEstudianteTesorero = () => {
  const [estudiante, setEstudiante] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEstudiante = useCallback(async (id) => {
    if (!id) return null;
    try {
      setLoading(true);
      const [resEst, resCuenta] = await Promise.allSettled([
        api.get(`/estudiantes/${id}`),
        api.get(`/estudiantes/${id}/estado-cuenta`),
      ]);
      if (resEst.status === 'fulfilled') {
        const data = resEst.value.data?.data || resEst.value.data;
        setEstudiante(data);
      }
      if (resCuenta.status === 'fulfilled') {
        const data = resCuenta.value.data?.data || resCuenta.value.data;
        setEstadoCuenta(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const registrarPago = useCallback(async (estudianteId, metodoPago, comprobante = '') => {
    try {
      const res = await api.post(`/estudiantes/${estudianteId}/registrar-pago`, {
        metodo_pago: metodoPago,
        comprobante,
      });
      return { ok: true, data: res.data };
    } catch (err) {
      return { ok: false, error: err?.response?.data?.detail || 'Error al registrar pago' };
    }
  }, []);

  const actualizarConvenio = useCallback(async (estudianteId, convenioActivo, fechaLimite = null) => {
    try {
      const body = { convenio_activo: convenioActivo };
      if (convenioActivo && fechaLimite) body.fecha_limite_convenio = fechaLimite;
      await api.put(`/administrativo/usuarios/${estudianteId}`, body);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.response?.data?.detail || 'Error al actualizar convenio' };
    }
  }, []);

  const limpiar = useCallback(() => {
    setEstudiante(null);
    setEstadoCuenta(null);
    setError(null);
  }, []);

  return {
    estudiante, estadoCuenta, loading, error,
    fetchEstudiante, registrarPago, actualizarConvenio, limpiar,
  };
};

export default useEstudianteTesorero;
