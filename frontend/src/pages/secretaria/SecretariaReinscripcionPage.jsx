import { useState, useEffect } from 'react';
import { 
  Search, RefreshCw, Users, BookOpen, CheckCircle2, 
  AlertCircle, Loader2, GraduationCap
} from 'lucide-react';
import api from '../../services/api';

const SecretariaReinscripcionPage = () => {
  const [cedula, setCedula] = useState('');
  const [loading, setLoading] = useState(false);
  const [estudiante, setEstudiante] = useState(null);
  const [error, setError] = useState(null);
  const [seccionesDisponibles, setSeccionesDisponibles] = useState([]);
  const [seccionesSeleccionadas, setSeccionesSeleccionadas] = useState([]);
  const [loadingSecciones, setLoadingSecciones] = useState(false);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [resultado, setResultado] = useState(null);

  const buscarEstudiante = async () => {
    if (!cedula.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      setEstudiante(null);
      setSeccionesDisponibles([]);
      setSeccionesSeleccionadas([]);
      setResultado(null);

      const res = await api.get(`/academico/estudiantes?q=${encodeURIComponent(cedula)}`);
      const lista = res.data?.data?.estudiantes || res.data?.estudiantes || [];
      
      if (lista.length === 0) {
        setError('No se encontró ningún estudiante con esa cédula');
        return;
      }

      const est = lista.find(e => e.cedula === cedula);
      if (!est) {
        setError('No se encontró ningún estudiante con esa cédula');
        return;
      }

      setEstudiante(est);
      
      // Cargar secciones del siguiente semestre
      const siguienteSemestre = (est.semestre_actual || 1) + 1;
      await cargarSecciones(est.carrera_id, siguienteSemestre);

    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al buscar estudiante');
    } finally {
      setLoading(false);
    }
  };

  const cargarSecciones = async (carreraId, semestre) => {
    try {
      setLoadingSecciones(true);
      const res = await api.get('/academico/secciones');
      const todas = res.data?.data?.secciones || res.data?.secciones || [];
      
      const filtradas = todas.filter(sec => 
        String(sec.carrera_id) === String(carreraId) && 
        sec.semestre === semestre
      );
      
      setSeccionesDisponibles(filtradas);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingSecciones(false);
    }
  };

  const toggleSeccion = (sec) => {
    const existe = seccionesSeleccionadas.find(s => s.id === sec.id);
    if (existe) {
      setSeccionesSeleccionadas(prev => prev.filter(s => s.id !== sec.id));
    } else {
      setSeccionesSeleccionadas(prev => [...prev, sec]);
    }
  };

  const reinscribir = async () => {
    if (!estudiante || seccionesSeleccionadas.length === 0) return;

    try {
      setInscribiendo(true);
      setResultado(null);

      const resultados = [];
      for (const sec of seccionesSeleccionadas) {
        try {
          await api.post('/administrativo/inscribir-estudiante', {
            estudiante_id: estudiante.id,
            seccion_id: sec.id,
            generar_pago: true,
          });
          resultados.push({ seccion: sec.materia || sec.codigo, ok: true });
        } catch (e) {
          resultados.push({ seccion: sec.materia || sec.codigo, ok: false, error: e?.response?.data?.detail });
        }
      }

      const exitosas = resultados.filter(r => r.ok).length;
      const fallidas = resultados.filter(r => !r.ok).length;

      setResultado({
        ok: exitosas > 0,
        msg: `${estudiante.nombre} reinscrito en ${exitosas} materia(s).${fallidas > 0 ? ` ${fallidas} fallidas.` : ''}`
      });

      // Reset
      setCedula('');
      setEstudiante(null);
      setSeccionesDisponibles([]);
      setSeccionesSeleccionadas([]);

    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al reinscribir');
    } finally {
      setInscribiendo(false);
    }
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Re-<span className="text-indigo-600">inscripción</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Matricular estudiante al siguiente semestre
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-sm text-red-600 font-bold">{error}</p>
        </div>
      )}

      {resultado && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl ${resultado.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          {resultado.ok ? <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} /> : <AlertCircle className="text-red-500 flex-shrink-0" size={20} />}
          <p className={`text-sm font-bold ${resultado.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {resultado.msg}
          </p>
        </div>
      )}

      {/* Buscar estudiante */}
      <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Search className="text-indigo-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Buscar Estudiante</p>
            <p className="text-xs text-slate-500">Ingrese la cédula del estudiante</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={cedula}
            onChange={e => setCedula(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarEstudiante()}
            placeholder="Ingrese número de cédula..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
          />
          <button
            onClick={buscarEstudiante}
            disabled={loading || !cedula.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Datos del estudiante */}
      {estudiante && (
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Users className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Estudiante Encontrado</p>
              <p className="text-xs text-slate-500">Semestre actual: {estudiante.semestre_actual || 1}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Nombre</p>
              <p className="font-black text-slate-900 uppercase">{estudiante.nombre || estudiante.nombre_completo}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Cédula</p>
              <p className="font-black text-slate-900">{estudiante.cedula}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Carrera</p>
              <p className="font-black text-slate-900">{estudiante.carrera}</p>
            </div>
          </div>
        </div>
      )}

      {/* Secciones disponibles */}
      {loadingSecciones ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      ) : seccionesDisponibles.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">
              Seleccione materias para el Semestre {(estudiante?.semestre_actual || 1) + 1}
            </p>
            <p className="text-xs text-slate-500">
              {seccionesSeleccionadas.length} seleccionada(s)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seccionesDisponibles.map(sec => {
              const seleccionada = seccionesSeleccionadas.find(s => s.id === sec.id);
              const inscritos = sec.cupo_actual || 0;
              const llena = inscritos >= (sec.cupo_maximo || 0);
              
              return (
                <button
                  key={sec.id}
                  onClick={() => !llena && toggleSeccion(sec)}
                  disabled={llena}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${
                    seleccionada 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : llena 
                        ? 'border-slate-100 bg-slate-50 opacity-50' 
                        : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-black text-indigo-600 uppercase">{sec.codigo}</span>
                    {seleccionada && <CheckCircle2 size={16} className="text-indigo-600" />}
                  </div>
                  <p className="font-bold text-slate-900 text-sm mb-2">{sec.materia}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{sec.aula || '—'}</span>
                    <span>{inscritos}/{sec.cupo_maximo}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {seccionesSeleccionadas.length > 0 && (
            <button
              onClick={reinscribir}
              disabled={inscribiendo}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {inscribiendo ? (
                <><Loader2 className="animate-spin" size={18} /> Reinscribiendo...</>
              ) : (
                <><RefreshCw size={18} /> Confirmar Reinscripción</>
              )}
            </button>
          )}
        </div>
      ) : estudiante ? (
        <div className="text-center py-12 text-slate-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
          <p>No hay secciones disponibles para el siguiente semestre</p>
        </div>
      ) : null}
    </div>
  );
};

export default SecretariaReinscripcionPage;
