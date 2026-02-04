import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Loader2, Clock } from 'lucide-react';
import { academicoService } from '../../services/academicoService';

const Horarios = () => {
    const [clases, setClases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarHorario = async () => {
            try {
                
                const response = await academicoService.getMisInscripciones();
                setClases(response.data);
            } catch (err) {
                console.error("Error cargando horario:", err);
            } finally {
                setLoading(false);
            }
        };
        cargarHorario();
    }, []);

    if (loading) return (
        <div className="flex h-60 items-center justify-center">
            <Loader2 className="animate-spin text-slate-900" size={40} />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-slate-900 p-4 rounded-2xl text-white">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Mi Horario Actual</h1>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Sincronizado con Registro Académico</p>
                    </div>
                </div>

                <div className="grid gap-4">
                    {clases.length > 0 ? clases.map((item) => (
                        <div key={item.id} className="group bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Secc</span>
                                    <span className="text-sm font-black text-slate-900">{item.seccion_detalle?.codigo_seccion}</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">
                                        {item.seccion_detalle?.materia_detalle?.nombre}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase">
                                        <div className="flex items-center gap-1"><Clock size={12}/> Lunes a Viernes</div>
                                        <div className="flex items-center gap-1 text-red-500"><MapPin size={12}/> Aula: {item.seccion_detalle?.aula}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center py-10 text-slate-400 font-bold uppercase text-xs">No tienes materias inscritas este ciclo.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Horarios;