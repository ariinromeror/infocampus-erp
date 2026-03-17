import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Search, Plus, CheckCircle, User, X, Save } from 'lucide-react';
import api from '../../../services/api';
import SelectModal from '../components/SelectModal';

const TIPOS_BECA = [
  { value: 'académica', label: 'Académica' },
  { value: 'deportiva', label: 'Deportiva' },
  { value: 'económica', label: 'Económica' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'institucional', label: 'Institucional' },
];

const BecasPage = () => {
  const [loading, setLoading] = useState(true);
  const [estudiantes, setEstudiantes] = useState([]);
  const [todosEstudiantes, setTodosEstudiantes] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [busqueda, setBusqueda] = useState('');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState('');
  const [porcentaje, setPorcentaje] = useState(50);
  const [tipoBeca, setTipoBeca] = useState('académica');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resEst, resCarr, resTodos] = await Promise.all([
          api.get('/academico/estudiantes', { params: { limit: 200, es_becado: true } }),
          api.get('/academico/carreras'),
          api.get('/academico/estudiantes', { params: { limit: 500 } }),
        ]);
        
        setEstudiantes(Array.isArray(resEst.data?.data?.estudiantes) ? resEst.data.data.estudiantes : Array.isArray(resEst.data?.data) ? resEst.data.data : Array.isArray(resEst.data) ? resEst.data : []);
        setCarreras(Array.isArray(resCarr.data?.data?.carreras) ? resCarr.data.data.carreras : Array.isArray(resCarr.data?.data) ? resCarr.data.data : Array.isArray(resCarr.data) ? resCarr.data : []);
        setTodosEstudiantes(Array.isArray(resTodos.data?.data?.estudiantes) ? resTodos.data.data.estudiantes : Array.isArray(resTodos.data?.data) ? resTodos.data.data : Array.isArray(resTodos.data) ? resTodos.data : []);
      } catch (err) {
        console.error('Error fetching:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filtroCarrera]);

  useEffect(() => {
    if (!busqueda.trim()) return;
    const filtrados = (estudiantes || []).filter(e =>
      (e.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.cedula || '').includes(busqueda)
    );
    setEstudiantes(prev => prev.length === filtrados.length ? prev : filtrados);
  }, [busqueda]);

  const totalBecados = estudiantes.length;
  const promedioBeca = estudiantes.length > 0 
    ? (estudiantes.reduce((a, e) => a + (e.porcentaje_beca || 0), 0) / estudiantes.length).toFixed(1)
    : 0;

  const handleCrearBeca = async () => {
    if (!estudianteSeleccionado) {
      setMensaje({ ok: false, text: 'Selecciona un estudiante' });
      return;
    }
    if (porcentaje < 0 || porcentaje > 100) {
      setMensaje({ ok: false, text: 'El porcentaje debe estar entre 0 y 100' });
      return;
    }
    
    try {
      setGuardando(true);
      setMensaje(null);
      await api.post(`/tesorero/becas/${estudianteSeleccionado}`, null, {
        params: { porcentaje_beca: porcentaje, tipo_beca: tipoBeca }
      });
      
      setMensaje({ ok: true, text: 'Beca asignada correctamente' });
      setModalOpen(false);
      setEstudianteSeleccionado('');
      setPorcentaje(50);
      setTipoBeca('académica');
      
      // Recargar datos
      const resEst = await api.get('/academico/estudiantes', { params: { limit: 200, es_becado: true } });
      setEstudiantes(Array.isArray(resEst.data?.data?.estudiantes) ? resEst.data.data.estudiantes : Array.isArray(resEst.data?.data) ? resEst.data.data : Array.isArray(resEst.data) ? resEst.data : []);
    } catch (err) {
      setMensaje({ ok: false, text: err.response?.data?.detail || 'Error al asignar beca' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Header */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
            Gestión de <span className="text-indigo-600">Becas</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Administración de becas institucionales</p>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-slate-500">Estudiantes Becados</p>
            <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-xl">
              <GraduationCap size={16} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-indigo-600">{loading ? '—' : totalBecados}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-slate-500">Promedio Beca</p>
            <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-xl">
              <CheckCircle size={16} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-4xl font-bold text-indigo-600">{loading ? '—' : `${promedioBeca}%`}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm font-medium text-slate-500">Nueva Beca</p>
            <div className="p-1.5 sm:p-2 bg-slate-100 rounded-xl">
              <Plus size={16} className="text-slate-600" />
            </div>
          </div>
          <button 
            onClick={() => setModalOpen(true)}
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:underline mt-2"
          >
            Crear →
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto max-h-[60vh] sm:max-h-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera</label>
            <select
              value={filtroCarrera}
              onChange={(e) => setFiltroCarrera(e.target.value)}
              className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 truncate"
            >
              <option value="">Todas</option>
              {carreras.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o cédula..."
                className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 sm:pl-9 pr-2 sm:pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : estudiantes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <GraduationCap size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">No hay estudiantes becados</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Estudiante</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Carrera</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase">% Beca</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est) => (
                <tr key={est.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 uppercase text-sm truncate">{est.nombre}</p>
                        <p className="text-xs text-slate-400">{est.cedula}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-slate-600">{est.carrera_nombre || '—'}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="font-bold text-indigo-600 text-lg">{est.porcentaje_beca || 0}%</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-xs text-slate-500">{est.tipo_beca || 'Institucional'}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
                      Activa
                    </span>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
        </div>
      )}

      {/* Modal Crear Beca */}
    {modalOpen && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:pl-72">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Nueva Beca</h3>
            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {mensaje && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${mensaje.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {mensaje.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Estudiante</label>
              <SelectModal
                options={todosEstudiantes.map(e => ({ id: e.id, nombre: e.nombre, cedula: e.cedula }))}
                value={estudianteSeleccionado}
                onChange={setEstudianteSeleccionado}
                placeholder="Buscar estudiante..."
                label="Seleccionar Estudiante"
                valueKey="id"
                labelKey="nombre"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Porcentaje de Beca (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={porcentaje}
                onChange={(e) => setPorcentaje(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Tipo de Beca</label>
              <select
                value={tipoBeca}
                onChange={(e) => setTipoBeca(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {TIPOS_BECA.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCrearBeca}
              disabled={guardando}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {guardando ? 'Guardando...' : 'Asignar Beca'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default BecasPage;