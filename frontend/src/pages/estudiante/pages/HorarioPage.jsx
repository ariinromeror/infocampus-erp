import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Clock, BookOpen, MapPin, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const HorarioPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [horarioData, setHorarioData] = useState(null);

  useEffect(() => {
    const fetchHorario = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const res = await api.get(`/estudiante/${user.id}/horario`);
        setHorarioData(res.data?.data?.horario || null);
      } catch (err) {
        console.error('Error fetching horario:', err);
        setHorarioData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHorario();
  }, [user?.id]);

  const getClaseForCell = (dia, hora) => {
    if (!horarioData) return null;
    const clasesDia = horarioData[dia] || [];
    return clasesDia.find(c => {
      const horaInicio = c.hora_inicio?.substring(0, 5);
      return horaInicio === hora;
    });
  };

  const tieneHorario = horarioData && Object.values(horarioData).some(arr => arr.length > 0);
  const todasLasMaterias = Object.values(horarioData || {}).flat();

  if (loading) {
    return (
      <div className="space-y-8 overflow-x-hidden">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="bg-slate-100 rounded-2xl h-96 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Mi <span className="text-indigo-600">Horario</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Horario semanal de clases</p>
      </motion.div>

      {/* Horario Grid */}
      {!tieneHorario ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <CalendarClock size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-sm font-semibold text-slate-400">No hay clases programadas</p>
          <p className="text-xs text-slate-500 mt-1">Contacta a coordinación académica</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 w-20">
                    Hora
                  </th>
                  {DIAS.map(dia => (
                    <th key={dia} className="py-3 px-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {dia.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map(hora => (
                  <tr key={hora} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-2 text-center">
                      <span className="text-[10px] font-bold text-slate-400">{hora}</span>
                    </td>
                    {DIAS.map(dia => {
                      const clase = getClaseForCell(dia, hora);
                      return (
                        <td key={`${dia}-${hora}`} className="py-2 px-1 border-l border-slate-50">
                          {clase ? (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-center">
                              <p className="text-[11px] font-black text-indigo-700 uppercase truncate">
                                {clase.materia}
                              </p>
                              <p className="text-[8px] text-indigo-500 mt-0.5 truncate">
                                {clase.aula || 'Sin aula'}
                              </p>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Leyenda */}
      {tieneHorario && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Mis Materias</p>
          <div className="flex flex-wrap gap-2">
            {todasLasMaterias.map((h, i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-[10px] font-semibold text-indigo-700">
                  {h.materia}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HorarioPage;
