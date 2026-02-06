import React from 'react';
import { CreditCard, Landmark, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { academicoService } from '../../services/academicoService';

const EstadoCuenta = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleDescarga = async () => {
        try {
            const response = await academicoService.descargarPDF();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.body.appendChild(document.createElement('a'));
            link.href = url;
            link.setAttribute('download', `Estado_Cuenta_${user.username}.pdf`);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Error en descarga", err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in zoom-in duration-500">
            {/* Botón volver - Responsivo */}
            <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-slate-500 hover:text-indigo-600 font-bold transition-colors gap-2 text-xs uppercase tracking-widest"
            >
                <ArrowLeft size={16} /> 
                <span className="hidden sm:inline">Volver al panel</span>
                <span className="sm:hidden">Volver</span>
            </button>

            {/* Card principal - Responsivo */}
            <div className="bg-white rounded-3xl sm:rounded-[40px] shadow-xl overflow-hidden border border-slate-100">
                {/* Header - Padding responsivo */}
                <div className="bg-slate-900 p-6 sm:p-10 text-white">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">Finanzas Institucionales</p>
                    <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter">Estado de Cuenta</h1>
                </div>

                {/* Contenido - Padding y spacing responsivo */}
                <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                    {/* Tarjeta de Saldo - Layout responsivo */}
                    <div className="bg-slate-50 border border-slate-100 p-6 sm:p-8 rounded-3xl sm:rounded-[32px]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deuda Total Pendiente</p>
                                <h2 className={`text-3xl sm:text-4xl font-black ${user?.en_mora ? 'text-red-600' : 'text-slate-900'}`}>
                                    ${user?.deuda_total || "0.00"}
                                </h2>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${user?.en_mora ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {user?.en_mora ? 'Estado: En Mora' : 'Estado: Solvente'}
                            </div>
                        </div>
                    </div>

                    {/* Acción de Descarga - Texto responsivo */}
                    <button 
                        onClick={handleDescarga}
                        disabled={user?.en_mora}
                        className={`w-full py-4 sm:py-5 rounded-2xl font-black text-[10px] sm:text-xs transition-all tracking-widest flex items-center justify-center gap-2 sm:gap-3 ${
                            user?.en_mora 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-dashed border-slate-200' 
                            : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl'
                        }`}
                    >
                        {user?.en_mora ? <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Download size={16} className="sm:w-[18px] sm:h-[18px]" />}
                        <span className="hidden sm:inline">
                            {user?.en_mora ? 'DESCARGA BLOQUEADA POR MORA' : 'GENERAR EXPEDIENTE OFICIAL PDF'}
                        </span>
                        <span className="sm:hidden">
                            {user?.en_mora ? 'BLOQUEADO' : 'DESCARGAR PDF'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EstadoCuenta;