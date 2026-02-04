/**
 * EstudianteDetalle.jsx
 * 
 * UBICACIÓN en tu proyecto:
 *   src/pages/estudiante/EstudianteDetalle.jsx
 * 
 * ¿Cómo crear la carpeta?
 *   1. Ve a src/pages/
 *   2. Crea una carpeta que se llame "estudiante"
 *   3. Dentro de esa carpeta, pega este archivo
 * 
 * Esta página se abre cuando el Director hace click
 * en la flecha (→) de un estudiante en la tabla del dashboard.
 * 
 * Por ejemplo si hace click en el estudiante con id 5,
 * React navega a /estudiante/5
 * y esta página trae los datos de ese estudiante del backend.
 */

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
  // useParams trae el "id" de la URL
  // Si la URL es /estudiante/5 → id = "5"
  const { id } = useParams();

  // useNavigate permite navegar a otra página desde código
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [estudiante, setEstudiante] = useState(null);
  const [error, setError] = useState(null);

  // Cuando esta página se carga, busca los datos del estudiante
  useEffect(() => {
    fetchEstudiante();
  }, [id]);

  // =====================================================
  // Habla con el backend para traer los datos
  // =====================================================
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

  // =====================================================
  // PANTALLA DE CARGA
  // =====================================================
  if (loading) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={50} />
        <p className="font-black italic uppercase tracking-tighter text-slate-400">Cargando datos del estudiante...</p>
      </div>
    </div>
  );

  // =====================================================
  // PANTALLA DE ERROR
  // =====================================================
  if (error) return (
    <div className="flex h-[70vh] items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="mx-auto text-rose-500" size={64} />
        <p className="text-xl font-black text-slate-900">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
        >
          Volver
        </button>
      </div>
    </div>
  );

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-20"
    >
      {/* BOTÓN DE VOLVER + NOMBRE DEL ESTUDIANTE */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-indigo-400 transition-all"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
            {estudiante.nombre_completo}
          </h1>
          <p className="text-slate-400 font-bold">
            Carnet: {estudiante.username} · DNI: {estudiante.dni || 'No registrado'}
          </p>
        </div>
      </div>

      {/* 3 CARDS DE INFORMACIÓN RÁPIDA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Carrera */}
        <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="text-indigo-600" size={28} />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carrera</p>
          <p className="text-lg font-black text-slate-900">
            {estudiante.carrera_detalle?.nombre || 'No asignada'}
          </p>
          {estudiante.carrera_detalle?.codigo && (
            <p className="text-xs text-slate-400 mt-1">Código: {estudiante.carrera_detalle.codigo}</p>
          )}
        </div>

        {/* Card: Estado financiero (verde si está al día, rojo si está en mora) */}
        <div className={`p-6 rounded-[35px] border shadow-sm ${
          estudiante.en_mora
            ? 'bg-rose-50 border-rose-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            estudiante.en_mora ? 'bg-rose-100' : 'bg-emerald-100'
          }`}>
            {estudiante.en_mora
              ? <AlertCircle className="text-rose-600" size={28} />
              : <CheckCircle className="text-emerald-600" size={28} />
            }
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Financiero</p>
          <p className={`text-lg font-black ${estudiante.en_mora ? 'text-rose-600' : 'text-emerald-600'}`}>
            {estudiante.en_mora ? 'En Mora' : 'Al Día'}
          </p>
        </div>

        {/* Card: Deuda total (oscuro) */}
        <div className="bg-slate-900 p-6 rounded-[35px] shadow-sm text-white">
          <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center mb-4">
            <DollarSign className="text-indigo-400" size={28} />
          </div>
          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Deuda Total</p>
          <p className="text-2xl font-black">
            ${parseFloat(estudiante.deuda_total || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* INFO ADICIONAL: Beca */}
      {estudiante.es_becado && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-[30px] flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <span className="text-amber-600 text-xl">🎓</span>
          </div>
          <div>
            <p className="font-black text-amber-800">Tiene Beca Activa</p>
            <p className="text-sm text-amber-600">Descuento del {estudiante.porcentaje_beca}% aplicado a sus inscripciones</p>
          </div>
        </div>
      )}

      {/* TABLA DE INSCRIPCIONES */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
          <BookOpen className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-slate-900 uppercase italic">Inscripciones</h2>
          <span className="ml-auto px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
            {estudiante.inscripciones?.length || 0} total
          </span>
        </div>

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
                    <p className="font-black uppercase italic text-slate-600">Sin inscripciones registradas</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default EstudianteDetalle;