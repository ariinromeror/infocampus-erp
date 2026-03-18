import { useState, useEffect } from 'react';
import { Clock, Loader2, MapPin, User } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';

const HorariosPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [secciones, setSecciones] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState(null);
  const [filtroCarrera, setFiltroCarrera] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [periodosRes, carrerasRes] = await Promise.all([
        academicoService.getPeriodos(),
        academicoService.getCarreras()
      ]);
      const periodosData = periodosRes.data?.data?.periodos || periodosRes.data?.periodos || [];
      setPeriodos(periodosData);
      setCarreras(carrerasRes.data?.data?.carreras || carrerasRes.data?.carreras || []);
      const periodoActivo = periodosData.find(p => p.activo) || periodosData[0];
      if (periodoActivo) setFiltroPeriodo(periodoActivo.id);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filtroPeriodo) fetchHorarios();
  }, [filtroPeriodo, filtroCarrera]);

  const fetchHorarios = async () => {
    setLoadingHorarios(true);
    try {
      const params = {};
      if (filtroPeriodo) params.periodo_id = filtroPeriodo;
      if (filtroCarrera) params.carrera_id = filtroCarrera;
      const res = await academicoService.getHorarios(params);
      const raw = res.data?.data?.secciones || res.data?.data?.horarios || res.data?.secciones || res.data?.horarios || (Array.isArray(res.data?.data) ? res.data.data : null) || (Array.isArray(res.data) ? res.data : []);
      const normalized = (raw || []).map(s => ({
        ...s,
        id: s.id || s.seccion_id,
        materia_nombre: s.materia_nombre || s.materia,
        codigo: s.codigo || s.seccion_codigo,
        docente: s.docente || s.profesor,
      }));
      setSecciones(normalized);
    } catch (error) {
      console.error('Error fetching horarios:', error);
      setSecciones([]);
    } finally {
      setLoadingHorarios(false);
    }
  };

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diasMap = { 'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Sábado': 5 };

  const getClasesPorDia = (dia) => {
    const diaIndex = diasMap[dia];
    return secciones
      .filter(s => {
        const h = s.horario;
        if (!h) return false;
        if (typeof h === 'string') return h.toLowerCase().includes(dia.toLowerCase());
        if (Array.isArray(h.dias)) {
          return h.dias.includes(dia) || h.dias.includes(diaIndex);
        }
        if (typeof h.dias === 'string') return h.dias.toLowerCase().includes(dia.toLowerCase());
        return false;
      })
      .map(s => {
        const h = s.horario;
        const isString = typeof h === 'string';
        return {
          seccion: s,
          horarioStr: isString ? h : null,
          hora_inicio: isString ? '' : (h?.hora_inicio || h?.horaInicio || ''),
          hora_fin:    isString ? '' : (h?.hora_fin    || h?.horaFin    || ''),
        };
      });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">

      {/* Título */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Horarios</h1>
        <p className="text-sm text-slate-500 mt-1">Vista de horarios por período</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={filtroPeriodo || ''}
          onChange={(e) => {
            setFiltroPeriodo(e.target.value ? parseInt(e.target.value) : null);
            setSecciones([]);
          }}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Todos los períodos</option>
          {periodos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <select
          value={filtroCarrera || ''}
          onChange={(e) => setFiltroCarrera(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Todas las carreras</option>
          {carreras.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {loadingHorarios ? (
          <div className="col-span-6 flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : diasSemana.map((dia) => (
          <div key={dia} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900">{dia}</h3>
            </div>
            <div className="p-3 space-y-2 min-h-[200px]">
              {getClasesPorDia(dia).length > 0 ? (
                getClasesPorDia(dia).map((clase, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="font-bold text-slate-800 text-xs truncate">
                      {clase.seccion?.materia_nombre || clase.seccion?.materia || clase.seccion?.materia?.nombre || '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">{clase.seccion?.codigo || clase.seccion?.seccion_codigo}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={10} />
                      <span>
                        {clase.horarioStr
                          ? clase.horarioStr
                          : clase.hora_inicio && clase.hora_fin
                            ? `${clase.hora_inicio} - ${clase.hora_fin}`
                            : 'Sin hora'}
                      </span>
                    </div>
                    {clase.seccion?.aula && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <MapPin size={10} />
                        <span>{clase.seccion.aula}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 mt-1">
                      <User size={10} />
                      <span className="truncate">
                        {clase.seccion?.docente || clase.seccion?.profesor_nombre || clase.seccion?.profesor || 'Sin asignar'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm font-medium text-slate-500 py-8">Sin clases</p>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default HorariosPage;