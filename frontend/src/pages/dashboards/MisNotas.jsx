import React, { useState, useEffect } from 'react';
import { Award, FileText, CheckCircle, Loader2, TrendingUp, ShieldCheck } from 'lucide-react';
import { academicoService } from '../../services/academicoService';

const MisNotas = () => {
    const [inscripciones, setInscripciones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotas = async () => {
            try {
                const res = await academicoService.getMisInscripciones();
                setInscripciones(res.data);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchNotas();
    }, []);

    const notasValidas = inscripciones.filter(i => i.nota_final !== null && i.nota_final !== undefined && parseFloat(i.nota_final) > 0);
    const promedio = notasValidas.length > 0 
        ? (notasValidas.reduce((acc, curr) => acc + parseFloat(curr.nota_final), 0) / notasValidas.length).toFixed(2)
        : "0.00";
    
    // Función auxiliar para obtener el estado de la nota
    const getNotaDisplay = (nota) => {
        if (nota === null || nota === undefined) return { valor: 'En Curso', esNumerica: false };
        const notaNum = parseFloat(nota);
        if (isNaN(notaNum) || notaNum <= 0) return { valor: 'En Curso', esNumerica: false };
        return { valor: notaNum.toFixed(1), esNumerica: true };
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-900" size={40} /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-700">
            {/* ENCABEZADO TIPO DOCUMENTO */}
            <div className="bg-white border border-slate-200 rounded-3xl sm:rounded-[32px] overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-slate-900 p-5 sm:p-8 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 bg-white/10 rounded-xl backdrop-blur-md">
                                <FileText size={24} className="sm:w-7 sm:h-7" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tighter">Boletín de Calificaciones</h1>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Registro Académico Oficial</p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black text-indigo-400 uppercase">Ciclo Lectivo</p>
                            <p className="text-base sm:text-lg font-black italic">2026 - SEMESTRE I</p>
                        </div>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="text-indigo-600" size={20} />
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Promedio Actual</p>
                            <p className="text-xl font-black text-slate-900">{promedio}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:border-x border-slate-200 sm:px-6">
                        <Award className="text-amber-500" size={20} />
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Materias Aprobadas</p>
                            <p className="text-xl font-black text-slate-900">{inscripciones.filter(i => i.nota_final >= 7).length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        <div className="sm:text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Estado de Alumno</p>
                            <p className="text-xs font-black text-emerald-600 uppercase">Regular / Activo</p>
                        </div>
                    </div>
                </div>

                {/* TABLA - Desktop */}
                <div className="hidden md:block p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-y border-slate-100 bg-white">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignatura</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nota Final</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {inscripciones.map((ins) => (
                                <tr key={ins.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-8 py-5">
                                        <span className="font-mono text-xs font-bold text-slate-500">{ins.seccion_detalle?.codigo_seccion}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-black text-slate-800 uppercase leading-tight">
                                            {ins.seccion_detalle?.materia_detalle?.nombre}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        {(() => {
                                            const notaInfo = getNotaDisplay(ins.nota_final);
                                            return (
                                                <span className={`text-lg font-black ${
                                                    notaInfo.esNumerica && parseFloat(ins.nota_final) >= 7 ? 'text-indigo-600' : 
                                                    notaInfo.esNumerica ? 'text-slate-400' : 'text-amber-600'
                                                }`}>
                                                    {notaInfo.valor}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        {(() => {
                                            const notaInfo = getNotaDisplay(ins.nota_final);
                                            const esAprobada = notaInfo.esNumerica && parseFloat(ins.nota_final) >= 7;
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                    esAprobada
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                    : notaInfo.esNumerica ? 'bg-slate-100 text-slate-400 border border-slate-200'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    {esAprobada ? <CheckCircle size={10} /> : null}
                                                    {esAprobada ? 'Acreditada' : notaInfo.esNumerica ? 'No Acreditada' : 'En Curso'}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* CARDS - Móvil */}
                <div className="md:hidden p-4 space-y-3">
                    {inscripciones.map((ins) => (
                        <div key={ins.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0">
                                    <span className="font-mono text-[10px] font-bold text-indigo-500 uppercase">
                                        {ins.seccion_detalle?.codigo_seccion}
                                    </span>
                                    <h3 className="text-sm font-black text-slate-800 uppercase leading-tight mt-1 break-words">
                                        {ins.seccion_detalle?.materia_detalle?.nombre}
                                    </h3>
                                </div>
                                <div className="ml-3 flex-shrink-0">
                                    {(() => {
                                        const notaInfo = getNotaDisplay(ins.nota_final);
                                        const esAprobada = notaInfo.esNumerica && parseFloat(ins.nota_final) >= 7;
                                        return (
                                            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 ${
                                                esAprobada ? 'bg-indigo-50 border-indigo-100' : 
                                                notaInfo.esNumerica ? 'bg-slate-50 border-slate-100' :
                                                'bg-amber-50 border-amber-100'
                                            }`}>
                                                <span className={`text-xl font-black ${
                                                    esAprobada ? 'text-indigo-600' : 
                                                    notaInfo.esNumerica ? 'text-slate-400' : 'text-amber-600'
                                                }`}>
                                                    {notaInfo.valor}
                                                </span>
                                                <span className={`text-[7px] font-black uppercase ${
                                                    notaInfo.esNumerica ? 'text-slate-400' : 'text-amber-600'
                                                }`}>
                                                    {notaInfo.esNumerica ? 'Nota' : 'Pendiente'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                {(() => {
                                    const notaInfo = getNotaDisplay(ins.nota_final);
                                    const esAprobada = notaInfo.esNumerica && parseFloat(ins.nota_final) >= 7;
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                                            esAprobada 
                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                            : notaInfo.esNumerica ? 'bg-slate-100 text-slate-400 border border-slate-200'
                                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                                        }`}>
                                            {esAprobada ? <CheckCircle size={10} /> : null}
                                            {esAprobada ? 'Acreditada' : notaInfo.esNumerica ? 'No Acreditada' : 'En Curso'}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* PIE DE BOLETÍN */}
                <div className="p-5 sm:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 italic">
                    <p className="text-[9px] text-slate-400 font-medium text-center sm:text-left">
                        Este documento es una representación digital del historial académico del estudiante. Generado: {new Date().toLocaleDateString()}
                    </p>
                    <div className="w-24 h-8 bg-slate-50 rounded border border-slate-200 flex items-center justify-center opacity-50 grayscale">
                        <span className="text-[8px] font-black text-slate-400">SELLO DIGITAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MisNotas;