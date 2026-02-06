import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, DollarSign,
  AlertCircle, CheckCircle, Loader2,
  BookOpen, GraduationCap
} from 'lucide-react';
import { academicoService } from '../../services/academicoService';

const EstudianteDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [estudiante, setEstudiante] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEstudiante();
  }, [id]);

  const fetchEstudiante = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academicoService.getEstudiante(id);
      setEstudiante(res.data);
    } catch (err) {
      console.error('Error cargando estudiante:', err);
      if (err.response?.status === 404) {
        setError('Estudiante no encontrado');
      } else if (err.response?.status === 403) {
        setError('No tiene permiso para ver estos datos');
      } else {
        setError('Error al cargar los datos. Intente de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={50} />
        <p className="font-black italic uppercase tracking-tighter text-slate-400 text-sm">Cargando datos...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-[70vh] items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertCircle className="mx-auto text-rose-500" size={48} />
        <p className="text-lg sm:text-xl font-black text-slate-900">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-indigo-600 text-white px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-10 sm:pb-20 p-4 sm:p-0"
    >
      {/* BOTÓN DE VOLVER + NOMBRE */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl hover:bg-slate-50 hover:border-indigo-400 transition-all flex-shrink-0"
        >
          <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-slate-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 uppercase italic tracking-tighter truncate">
            {estudiante.nombre_completo}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-bold truncate">
            Carnet: {estudiante.username} · DNI: {estudiante.dni || 'No registrado'}
          </p>
        </div>
      </div>

      {/* 3 CARDS DE INFORMACIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Carrera */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[35px] border border-slate-100 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <GraduationCap className="text-indigo-600" size={24} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carrera</p>
          <p className="text-base sm:text-lg font-black text-slate-900 line-clamp-2">
            {estudiante.carrera_detalle?.nombre || 'No asignada'}
          </p>
          {estudiante.carrera_detalle?.codigo && (
            <p className="text-xs text-slate-400 mt-1">Código: {estudiante.carrera_detalle.codigo}</p>
          )}
        </div>

        {/* Estado financiero */}
        <div className={`p-5 sm:p-6 rounded-2xl sm:rounded-[35px] border shadow-sm ${
          estudiante.en_mora
            ? 'bg-rose-50 border-rose-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 ${
            estudiante.en_mora ? 'bg-rose-100' : 'bg-emerald-100'
          }`}>
            {estudiante.en_mora
              ? <AlertCircle className="text-rose-600" size={24} />
              : <CheckCircle className="text-emerald-600" size={24} />
            }
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Financiero</p>
          <p className={`text-base sm:text-lg font-black ${estudiante.en_mora ? 'text-rose-600' : 'text-emerald-600'}`}>
            {estudiante.en_mora ? 'En Mora' : 'Al Día'}
          </p>
        </div>

        {/* Deuda total */}
        <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-[35px] shadow-sm text-white">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-900 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <DollarSign className="text-indigo-400" size={24} />
          </div>
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Deuda Total</p>
          <p className="text-xl sm:text-2xl font-black">
            ${parseFloat(estudiante.deuda_total || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Beca */}
      {estudiante.es_becado && (
        <div className="bg-amber-50 border border-amber-200 p-4 sm:p-5 rounded-2xl sm:rounded-[30px] flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-amber-600 text-lg sm:text-xl">🎓</span>
          </div>
          <div className="min-w-0">
            <p className="font-black text-amber-800 text-sm sm:text-base">Tiene Beca Activa</p>
            <p className="text-xs sm:text-sm text-amber-600">Descuento del {estudiante.porcentaje_beca}% aplicado</p>
          </div>
        </div>
      )}

      {/* TABLA/CARDS DE INSCRIPCIONES */}
      <div className="bg-white rounded-2xl sm:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex items-center gap-3">
          <BookOpen className="text-indigo-600 flex-shrink-0" size={20} />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase italic">Inscripciones</h2>
          <span className="ml-auto px-2 sm:px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
            {estudiante.inscripciones?.length || 0} total
          </span>
        </div>

        {/* DESKTOP - Tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Materia</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Periodo</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nota</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {estudiante.inscripciones?.length > 0 ? estudiante.inscripciones.map((insc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-900 text-sm">{insc.materia_nombre}</p>
                    <p className="text-[10px] text-slate-400">{insc.materia_codigo} · Sec {insc.seccion}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-slate-600">{insc.periodo}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className={`text-sm font-black ${
                      insc.nota_final === null ? 'text-slate-400' :
                      parseFloat(insc.nota_final) >= 7 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {insc.nota_final !== null ? insc.nota_final : '—'}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      insc.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-600' :
                      insc.estado === 'reprobado' ? 'bg-rose-50 text-rose-600' :
                      insc.estado === 'retirado' ? 'bg-slate-100 text-slate-500' :
                      'bg-indigo-50 text-indigo-600'
                    }`}>
                      {insc.estado}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {insc.pagado ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">Pagado</span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase">Pendiente</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-8 py-16 text-center">
                    <div className="opacity-30">
                      <BookOpen className="mx-auto mb-3" size={40} />
                      <p className="font-black uppercase italic text-slate-600">Sin inscripciones</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE - Cards */}
        <div className="md:hidden p-4 space-y-3">
          {estudiante.inscripciones?.length > 0 ? estudiante.inscripciones.map((insc, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
              <div>
                <p className="font-black text-slate-900 text-sm">{insc.materia_nombre}</p>
                <p className="text-[10px] text-slate-400 mt-1">{insc.materia_codigo} · Sec {insc.seccion}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Periodo</p>
                  <p className="text-xs font-bold text-slate-600">{insc.periodo}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Nota</p>
                  <p className={`text-xs font-black ${
                    insc.nota_final === null ? 'text-slate-400' :
                    parseFloat(insc.nota_final) >= 7 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {insc.nota_final !== null ? insc.nota_final : '—'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                  insc.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-600' :
                  insc.estado === 'reprobado' ? 'bg-rose-50 text-rose-600' :
                  insc.estado === 'retirado' ? 'bg-slate-100 text-slate-500' :
                  'bg-indigo-50 text-indigo-600'
                }`}>
                  {insc.estado}
                </span>
                {insc.pagado ? (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">Pagado</span>
                ) : (
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase">Pendiente</span>
                )}
              </div>
            </div>
          )) : (
            <div className="py-10 text-center opacity-30">
              <BookOpen className="mx-auto mb-3" size={40} />
              <p className="font-black uppercase italic text-slate-600 text-sm">Sin inscripciones</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EstudianteDetalle;