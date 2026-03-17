import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Download, User, BookOpen, Calendar } from 'lucide-react';
import SelectModal from '../components/SelectModal';
import api from '../../../services/api';

const CertificadosPage = () => {
  const [loading, setLoading] = useState(true);
  const [estudiantes, setEstudiantes] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [loadingInsc, setLoadingInsc] = useState(false);

  useEffect(() => {
    const fetchEstudiantes = async () => {
      try {
        setLoading(true);
        const params = { limit: 200 };
        if (filtroCarrera) params.carrera_id = filtroCarrera;
        if (filtroSemestre) params.semestre = filtroSemestre;
        
        const [resEst, resCarr] = await Promise.all([
          api.get('/academico/estudiantes', { params }),
          api.get('/academico/carreras'),
        ]);
        
        setEstudiantes(Array.isArray(resEst.data?.data?.estudiantes) ? resEst.data.data.estudiantes : Array.isArray(resEst.data?.data) ? resEst.data.data : Array.isArray(resEst.data) ? resEst.data : []);
        setCarreras(Array.isArray(resCarr.data?.data?.carreras) ? resCarr.data.data.carreras : Array.isArray(resCarr.data?.data) ? resCarr.data.data : Array.isArray(resCarr.data) ? resCarr.data : []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEstudiantes();
  }, [filtroCarrera, filtroSemestre]);

  const filtrados = (estudiantes || []).filter(e =>
    !busqueda ||
    (e.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.cedula || '').includes(busqueda)
  );

  const handleSeleccionar = async (est) => {
    setSeleccionado(est);
    setLoadingInsc(true);
    try {
      const res = await api.get(`/estudiantes/${est.id}`);
      const data = res.data?.data || res.data;
      setInscripciones(Array.isArray(data?.inscripciones) ? data.inscripciones : []);
    } catch (err) {
      console.error('Error:', err);
      setInscripciones([]);
    } finally {
      setLoadingInsc(false);
    }
  };

  const handleDescargarCertificado = async (inscripcionId) => {
    try {
      const res = await api.get(`/reportes/inscripcion/${inscripcionId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificado_Inscripcion_${inscripcionId}_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDescargarBoletin = async () => {
    if (!seleccionado) return;
    try {
      const res = await api.get(`/reportes/notas/${seleccionado.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Boletin_Notas_${seleccionado.id}_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="space-y-7 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto max-h-[60vh] sm:max-h-none"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera</label>
            <SelectModal
              options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
              value={filtroCarrera}
              onChange={setFiltroCarrera}
              placeholder="Todas"
              label="Seleccionar Carrera"
              valueKey="id"
              labelKey="nombre"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Semestre</label>
            <SelectModal
              options={[{ id: '', nombre: 'Todos' }, ...[1,2,3,4,5,6,7,8,9,10].map(s => ({ id: s, nombre: `Semestre ${s}` }))]}
              value={filtroSemestre}
              onChange={setFiltroSemestre}
              placeholder="Todos"
              label="Seleccionar Semestre"
              valueKey="id"
              labelKey="nombre"
            />
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
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <div className="space-y-4">

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
              {filtrados.length === 0 ? (
                <div className="p-8 text-center">
                  <User size={32} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-[10px] font-black text-slate-500 uppercase">No encontrado</p>
                </div>
              ) : (
                filtrados.map(est => (
                  <button
                    key={est.id}
                    onClick={() => handleSeleccionar(est)}
                    className={`w-full flex items-center gap-3 p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      seleccionado?.id === est.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                    }`}
                  >
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <User size={16} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 uppercase text-xs truncate">{est.nombre}</p>
                      <p className="text-[11px] text-slate-400">{est.cedula}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="space-y-4">
          {seleccionado ? (
            <>
              {/* Boletin general */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={18} className="text-indigo-600" />
                  <p className="font-black text-slate-900 uppercase text-sm">Boletín de Notas</p>
                </div>
                <p className="text-[10px] text-slate-400 mb-4">Descargar historial académico completo del estudiante</p>
                <button
                  onClick={handleDescargarBoletin}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-indigo-700 transition-colors"
                >
                  <Download size={14} />
                  Descargar Boletín PDF
                </button>
              </div>

              {/* Inscripciones */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen size={18} className="text-indigo-600" />
                  <p className="font-black text-slate-900 uppercase text-sm">Certificados de Inscripción</p>
                </div>
                
                {loadingInsc ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-slate-100 rounded animate-pulse" />
                    <div className="h-8 bg-slate-100 rounded animate-pulse" />
                  </div>
                ) : inscripciones.length > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {inscripciones.map(insc => (
                      <div key={insc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase truncate">{insc.materia_nombre}</p>
                          <p className="text-[11px] text-slate-400">{insc.seccion} · {insc.periodo}</p>
                        </div>
                        <button
                          onClick={() => handleDescargarCertificado(insc.id)}
                          className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">Sin inscripciones</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center">
              <FileText size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccione un estudiante</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificadosPage;
