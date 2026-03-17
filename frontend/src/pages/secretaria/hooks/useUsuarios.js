import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const limpiarTexto = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
};

const generarEmailBase = (nombre, apellido) => {
  const nombreLimpio = limpiarTexto(nombre);
  const apellidoLimpio = limpiarTexto(apellido);
  if (!nombreLimpio || !apellidoLimpio) return '';
  return `${nombreLimpio}.${apellidoLimpio}@estudiante.infocampus.edu.ec`;
};

const generarPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = 'Temp';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pass += '!';
  return pass;
};

const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsuarios = useCallback(async (filtros = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', filtros.page || 1);
      params.append('limit', filtros.limit || 50);
      if (filtros.rol) params.append('rol', filtros.rol);
      if (filtros.activo !== undefined) params.append('activo', filtros.activo);

      const res = await api.get(`/administrativo/usuarios?${params}`);
      const data = res.data;
      setUsuarios(data?.data?.usuarios || data?.usuarios || []);
      setTotal(data?.data?.total || data?.total || 0);
    } catch (err) {
      setError(err.message);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCarreras = useCallback(async () => {
    try {
      const res = await api.get('/academico/carreras');
      const data = res.data;
      setCarreras(data?.data?.carreras || data?.carreras || []);
    } catch {}
  }, []);

  const verificarEmailDisponible = useCallback(async (email) => {
    try {
      const res = await api.get(`/administrativo/usuarios?limit=100`);
      const data = res.data;
      const usuarios = data?.data?.usuarios || data?.usuarios || [];
      return !usuarios.some(u => u.email?.toLowerCase() === email?.toLowerCase());
    } catch {
      return true;
    }
  }, []);

  const generarEmailUnico = useCallback(async (nombre, apellido) => {
    let emailBase = generarEmailBase(nombre, apellido);
    if (!emailBase) return '';

    const disponible = await verificarEmailDisponible(emailBase);
    if (disponible) return emailBase;

    let contador = 2;
    while (contador <= 99) {
      const [localPart, domain] = emailBase.split('@');
      const nuevoEmail = `${localPart}${contador}@${domain}`;
      const disponibleNuevo = await verificarEmailDisponible(nuevoEmail);
      if (disponibleNuevo) return nuevoEmail;
      contador++;
    }
    return emailBase;
  }, [verificarEmailDisponible]);

  const crearEstudiante = useCallback(async (formData) => {
    try {
      const body = {
        cedula: formData.cedula,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        rol: 'estudiante',
      };
      if (formData.carrera_id) body.carrera_id = parseInt(formData.carrera_id);
      if (formData.es_becado) {
        body.es_becado = true;
        body.porcentaje_beca = parseInt(formData.porcentaje_beca) || 0;
      }

      const res = await api.post('/administrativo/usuarios', body);
      return { ok: true, data: res.data };
    } catch (e) {
      return { ok: false, error: e?.response?.data?.detail || 'Error al crear estudiante' };
    }
  }, []);

  useEffect(() => {
    fetchCarreras();
  }, [fetchCarreras]);

  return {
    usuarios,
    carreras,
    total,
    loading,
    error,
    fetchUsuarios,
    fetchCarreras,
    crearEstudiante,
    generarEmailUnico,
    generarPassword,
    limpiarTexto,
  };
};

export default useUsuarios;
