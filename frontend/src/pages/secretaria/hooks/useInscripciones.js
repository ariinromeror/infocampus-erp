import { useState, useCallback } from 'react';
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

const useInscripciones = () => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [esNuevo, setEsNuevo] = useState(false);

  const [secciones, setSecciones] = useState([]);
  const [seccionesFiltradas, setSeccionesFiltradas] = useState([]);
  const [loadingSec, setLoadingSec] = useState(false);
  const [seccionesSeleccionadas, setSeccionesSeleccionadas] = useState([]);

  const [carreras, setCarreras] = useState([]);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [formNuevo, setFormNuevo] = useState({
    cedula: '', first_name: '', last_name: '', 
    email: '', password: '', carrera_id: '',
    es_becado: false, porcentaje_beca: 0,
  });

  const buscarEstudiante = useCallback(async (query) => {
    if (!query?.trim() || query.length < 3) {
      setResultados([]);
      return;
    }
    try {
      setBuscando(true);
      const res = await api.get(`/tesorero/buscar-estudiante?q=${encodeURIComponent(query)}`);
      const data = res.data;
      setResultados(data?.data || data?.estudiantes || data || []);
    } catch {
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  const cargarCarreras = useCallback(async () => {
    try {
      const res = await api.get('/academico/carreras');
      const data = res.data;
      setCarreras(data?.data?.carreras || data?.carreras || []);
    } catch {}
  }, []);

  const cargarMallaCurricular = useCallback(async (carreraId) => {
    try {
      const res = await api.get(`/academico/carreras/${carreraId}/malla`);
      return res.data.data;
    } catch (err) {
      console.error('Error cargando malla:', err);
      return null;
    }
  }, []);

  const cargarSecciones = useCallback(async (carreraId = null, semestre = null) => {
    try {
      setLoadingSec(true);
      const res = await api.get('/academico/secciones');
      const data = res.data;
      let todas = data?.data?.secciones || data?.secciones || data?.data || [];
      
      if (carreraId && semestre) {
        const filtradas = todas.filter(sec => 
          String(sec.carrera_id) === String(carreraId) && 
          sec.semestre === semestre
        );
        setSeccionesFiltradas(filtradas);
      } else {
        setSeccionesFiltradas(todas);
      }
      setSecciones(todas);
    } catch {
      setSecciones([]);
      setSeccionesFiltradas([]);
    } finally {
      setLoadingSec(false);
    }
  }, []);

  const seleccionarEstudianteExistente = useCallback(async (est) => {
    setEstudianteSeleccionado(est);
    setEsNuevo(false);
    const carreraId = est.carrera_id || est.carrera_detalle?.id;
    const semestre = est.semestre_actual;
    await cargarSecciones(carreraId, semestre);
  }, [cargarSecciones]);

  const iniciarNuevoEstudiante = useCallback(async () => {
    setEsNuevo(true);
    setEstudianteSeleccionado(null);
    setFormNuevo({
      cedula: '', first_name: '', last_name: '',
      email: '', password: generarPassword(),
      carrera_id: '', es_becado: false, porcentaje_beca: 0,
    });
    await cargarCarreras();
  }, [cargarCarreras]);

  const actualizarFormNuevo = useCallback((campo, valor) => {
    setFormNuevo(prev => {
      const nuevo = { ...prev, [campo]: valor };
      if (campo === 'first_name' || campo === 'last_name') {
        const emailGenerado = generarEmailBase(nuevo.first_name, nuevo.last_name);
        nuevo.email = emailGenerado;
      }
      if (campo === 'carrera_id' && valor) {
        const carrera = carreras.find(c => String(c.id) === String(valor));
        if (carrera?.semestre_inicial) {
          cargarSecciones(valor, carrera.semestre_inicial);
        }
      }
      return nuevo;
    });
  }, [carreras, cargarSecciones]);

  const verificarEmailUnico = useCallback(async (email) => {
    if (!email) return true;
    try {
      const res = await api.get(`/administrativo/usuarios?limit=200`);
      const data = res.data;
      const usuarios = data?.data?.usuarios || data?.usuarios || [];
      const existe = usuarios.some(u => u.email?.toLowerCase() === email?.toLowerCase());
      if (existe) {
        let contador = 2;
        const [localPart, domain] = email.split('@');
        while (contador <= 99) {
          const nuevoEmail = `${localPart}${contador}@${domain}`;
          const existeNuevo = usuarios.some(u => u.email?.toLowerCase() === nuevoEmail?.toLowerCase());
          if (!existeNuevo) return nuevoEmail;
          contador++;
        }
      }
      return email;
    } catch {
      return email;
    }
  }, []);

  const crearEstudiante = useCallback(async () => {
    if (!formNuevo.cedula || !formNuevo.first_name || !formNuevo.last_name || !formNuevo.carrera_id) {
      return { ok: false, error: 'Completa todos los campos obligatorios' };
    }
    try {
      setCreando(true);
      const emailUnico = await verificarEmailUnico(formNuevo.email);
      const body = {
        cedula: formNuevo.cedula,
        email: emailUnico,
        first_name: formNuevo.first_name,
        last_name: formNuevo.last_name,
        password: formNuevo.password || generarPassword(),
        rol: 'estudiante',
        carrera_id: parseInt(formNuevo.carrera_id),
      };
      if (formNuevo.es_becado && formNuevo.porcentaje_beca > 0) {
        body.es_becado = true;
        body.porcentaje_beca = parseInt(formNuevo.porcentaje_beca);
      }

      const res = await api.post('/administrativo/usuarios', body);
      const nuevoEstudiante = {
        ...res.data,
        nombre_completo: `${formNuevo.first_name} ${formNuevo.last_name}`,
        nombre: `${formNuevo.first_name} ${formNuevo.last_name}`,
        cedula: formNuevo.cedula,
        carrera_id: parseInt(formNuevo.carrera_id),
        semestre_actual: 1,
      };
      setEstudianteSeleccionado(nuevoEstudiante);
      setEsNuevo(false);
      await cargarSecciones(parseInt(formNuevo.carrera_id), 1);
      return { ok: true, data: nuevoEstudiante };
    } catch (e) {
      return { ok: false, error: e?.response?.data?.detail || 'Error al crear estudiante' };
    } finally {
      setCreando(false);
    }
  }, [formNuevo, verificarEmailUnico, cargarSecciones]);

  const toggleSeccion = useCallback((sec) => {
    setSeccionesSeleccionadas(prev => {
      const existe = prev.find(s => s.id === sec.id);
      if (existe) {
        return prev.filter(s => s.id !== sec.id);
      }
      return [...prev, sec];
    });
  }, []);

  const inscribirSeleccionadas = useCallback(async () => {
    if (!estudianteSeleccionado || seccionesSeleccionadas.length === 0) return null;
    try {
      setInscribiendo(true);
      const resultados = [];
      for (const sec of seccionesSeleccionadas) {
        try {
          await api.post('/administrativo/inscribir-estudiante', {
            estudiante_id: estudianteSeleccionado.id,
            seccion_id: sec.id,
            generar_pago: true,
          });
          resultados.push({ seccion: sec.materia || sec.codigo, ok: true });
        } catch (e) {
          resultados.push({ seccion: sec.materia || sec.codigo, ok: false, error: e?.response?.data?.detail });
        }
      }
      const exitosas = resultados.filter(r => r.ok);
      const fallidas = resultados.filter(r => !r.ok);
      
      const nombre = estudianteSeleccionado.nombre || estudianteSeleccionado.nombre_completo;
      let msg = `${nombre} inscrito en ${exitosas.length} materia(s).`;
      if (fallidas.length > 0) {
        msg += ` ${fallidas.length} fallida(s): ${fallidas.map(f => f.seccion).join(', ')}`;
      }
      
      setResultado({ ok: exitosas.length > 0, msg });
      return { ok: true, resultados };
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Error al inscribir';
      setResultado({ ok: false, msg });
      return { ok: false, msg };
    } finally {
      setInscribiendo(false);
    }
  }, [estudianteSeleccionado, seccionesSeleccionadas]);

  const reiniciar = useCallback(() => {
    setBusqueda('');
    setResultados([]);
    setEstudianteSeleccionado(null);
    setEsNuevo(false);
    setSecciones([]);
    setSeccionesFiltradas([]);
    setSeccionesSeleccionadas([]);
    setResultado(null);
    setFormNuevo({
      cedula: '', first_name: '', last_name: '',
      email: '', password: '', carrera_id: '',
      es_becado: false, porcentaje_beca: 0,
    });
  }, []);

  return {
    busqueda, setBusqueda,
    resultados, buscando,
    estudianteSeleccionado, esNuevo,
    secciones, seccionesFiltradas, loadingSec,
    seccionesSeleccionadas, toggleSeccion,
    carreras,
    inscribiendo, creando, resultado,
    formNuevo, setFormNuevo, actualizarFormNuevo,
    buscarEstudiante,
    seleccionarEstudianteExistente,
    iniciarNuevoEstudiante,
    crearEstudiante,
    inscribirSeleccionadas,
    reiniciar,
    generarPassword,
    cargarMallaCurricular,
  };
};

export default useInscripciones;
