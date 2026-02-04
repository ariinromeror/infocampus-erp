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
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Encabezado con más presencia */}
            <div className="flex items-center gap-6 border-b border-slate-100 pb-8">
                <div className="bg-slate-900 p-5 rounded-[22px] text-white shadow-xl shadow-slate-200">
                    <BookOpen size={32} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Mis Secciones</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Control de Materias Asignadas</p>
                </div>
            </div>

            {/* Listado de Tarjetas Grandes */}
            <div className="grid gap-6">
                {secciones.map((s) => (
                    <div 
                        key={s.id} 
                        className="bg-white p-8 rounded-[35px] border-2 border-transparent shadow-sm flex flex-col md:flex-row items-center justify-between hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100 transition-all group cursor-pointer"
                        onClick={() => navigate(`/gestion-notas/${s.id}`)}
                    >
                        <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                            {/* Identificador de Sección - AHORA MUCHO MÁS GRANDE */}
                            <div className="w-24 h-24 bg-slate-900 text-white rounded-[25px] flex flex-col items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Secc</span>
                                <span className="text-3xl font-black italic">{s.codigo || s.codigo_seccion}</span>
                            </div>

                            {/* Información de la Materia */}
                            <div className="flex-1 space-y-3 text-center md:text-left">
                                <h4 className="text-2xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">
                                    {s.materia}
                                </h4>
                                
                                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                    <span className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-xs font-black text-slate-500 uppercase">
                                        <MapPin size={16} className="text-red-500" />
                                        {s.aula || 'Aula No Definida'}
                                    </span>
                                    <span className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-xs font-black text-slate-500 uppercase">
                                        <Calendar size={16} className="text-indigo-500" />
                                        {s.horario || 'Horario por definir'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Botón de Acción Claro */}
                        <div className="mt-6 md:mt-0">
                            <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                <ArrowRight size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfesorSecciones;