import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Loader2, CheckCircle } from 'lucide-react';
import { academicoService } from '../../services/academicoService';

const GestionNotas = () => {
    const { seccionId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notasTemporales, setNotasTemporales] = useState({});
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                // Aquí usamos el endpoint que creamos en Django
                const res = await academicoService.getDetalleSeccionNotas(seccionId);
                setData(res.data);
                
                // Inicializamos el estado local con las notas que ya existen
                const inicial = {};
                res.data.alumnos.forEach(al => {
                    inicial[al.inscripcion_id] = al.nota_actual;
                });
                setNotasTemporales(inicial);
            } catch (err) {
                console.error("Error al cargar alumnos", err);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, [seccionId]);

    const handleNotaChange = (id, valor) => {
        // Validamos que no exceda 10 en el cliente para feedback rápido
        if (valor > 10) return;
        setNotasTemporales({ ...notasTemporales, [id]: valor });
    };

    const guardarNotas = async () => {
        setGuardando(true);
        try {
            const payload = {
                notas: Object.keys(notasTemporales).map(id => ({
                    inscripcion_id: parseInt(id),
                    nota: parseFloat(notasTemporales[id])
                }))
            };
            await academicoService.postNotasSeccion(seccionId, payload);
            alert("¡Notas guardadas exitosamente!");
        } catch (err) {
            alert(err.response?.data?.error || "Error al guardar");
        } finally {
            setGuardando(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Botón Volver */}
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase hover:text-indigo-600 transition-colors">
                <ArrowLeft size={14} /> Volver a Secciones
            </button>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                {/* Header de la Planilla */}
                <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter">{data?.materia}</h2>
                        <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-1">Sección: {data?.codigo}</p>
                    </div>
                    <button 
                        onClick={guardarNotas}
                        disabled={guardando}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 transition-all disabled:opacity-50"
                    >
                        {guardando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Cambios
                    </button>
                </div>

                {/* Tabla de Estudiantes */}
                <div className="p-6">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                                <th className="px-6 py-4">Estudiante</th>
                                <th className="px-6 py-4">Carnet</th>
                                <th className="px-6 py-4 text-center">Calificación (0-10)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data?.alumnos.map((alumno) => (
                                <tr key={alumno.inscripcion_id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                {alumno.alumno_nombre.charAt(0)}
                                            </div>
                                            <span className="font-bold text-slate-700">{alumno.alumno_nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-400">
                                        {alumno.alumno_carnet}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex justify-center">
                                            <input 
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="10"
                                                value={notasTemporales[alumno.inscripcion_id] || ''}
                                                onChange={(e) => handleNotaChange(alumno.inscripcion_id, e.target.value)}
                                                disabled={alumno.nota_actual > 0} // BLOQUEO: Si ya tiene nota, el profesor no toca
                                                className={`w-20 text-center p-3 rounded-xl font-black text-lg border-2 transition-all 
                                                    ${alumno.nota_actual > 0 
                                                        ? 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed' 
                                                        : 'bg-white border-slate-100 text-indigo-600 focus:border-indigo-500 outline-none shadow-sm'
                                                    }`}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GestionNotas;