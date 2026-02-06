import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { academicoService } from '../../services/academicoService';
import { BookOpen, ArrowRight, MapPin, Calendar, Loader2, Hash } from 'lucide-react';

const ProfesorSecciones = () => {
    const navigate = useNavigate();
    const [secciones, setSecciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await academicoService.getStatsProfesor();
                setSecciones(res.data.mis_clases || []);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetch();
    }, []);

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-10 sm:pb-20 p-4 sm:p-0">
            {/* Encabezado */}
            <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-100 pb-6 sm:pb-8">
                <div className="bg-slate-900 p-3 sm:p-5 rounded-2xl sm:rounded-[22px] text-white shadow-xl shadow-slate-200">
                    <BookOpen size={24} className="sm:w-8 sm:h-8" />
                </div>
                <div>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Mis Secciones</h2>
                    <p className="text-[10px] sm:text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Control de Materias Asignadas</p>
                </div>
            </div>

            {/* Listado de Tarjetas */}
            <div className="grid gap-4 sm:gap-6">
                {secciones.map((s) => (
                    <div 
                        key={s.id} 
                        className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[35px] border-2 border-transparent shadow-sm flex flex-col items-center justify-between hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100 transition-all group cursor-pointer"
                        onClick={() => navigate(`/gestion-notas/${s.id}`)}
                    >
                        <div className="flex flex-col items-center gap-4 sm:gap-8 w-full">
                            {/* Identificador de Sección */}
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 text-white rounded-2xl sm:rounded-[25px] flex flex-col items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Secc</span>
                                <span className="text-2xl sm:text-3xl font-black italic">{s.codigo || s.codigo_seccion}</span>
                            </div>

                            {/* Información de la Materia */}
                            <div className="flex-1 space-y-2 sm:space-y-3 text-center w-full">
                                <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors px-2">
                                    {s.materia}
                                </h4>
                                
                                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-4">
                                    <span className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 px-3 sm:px-4 py-2 rounded-xl text-xs font-black text-slate-500 uppercase">
                                        <MapPin size={14} className="text-red-500 flex-shrink-0" />
                                        <span className="truncate">{s.aula || 'Aula No Definida'}</span>
                                    </span>
                                    <span className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 px-3 sm:px-4 py-2 rounded-xl text-xs font-black text-slate-500 uppercase">
                                        <Calendar size={14} className="text-indigo-500 flex-shrink-0" />
                                        <span className="truncate">{s.horario || 'Horario por definir'}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Botón de Acción */}
                            <div className="mt-2 sm:mt-4">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                    <ArrowRight size={20} className="sm:w-6 sm:h-6" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {secciones.length === 0 && (
                    <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">
                        No tienes secciones asignadas
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProfesorSecciones;