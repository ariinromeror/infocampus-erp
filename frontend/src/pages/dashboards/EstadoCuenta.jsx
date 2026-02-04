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
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in duration-500">
            <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-slate-500 hover:text-indigo-600 font-bold transition-colors gap-2 text-xs uppercase tracking-widest"
            >
                <ArrowLeft size={16} /> Volver al panel
            </button>

            <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-10 text-white">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2">Finanzas Institucionales</p>
                    <h1 className="text-3xl font-black italic tracking-tighter">Estado de Cuenta</h1>
                </div>

                <div className="p-10 space-y-8">
                    {/* Tarjeta de Saldo */}
                    <div className="bg-slate-50 border border-slate-100 p-8 rounded-[32px] flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deuda Total Pendiente</p>
                            <h2 className={`text-4xl font-black ${user?.en_mora ? 'text-red-600' : 'text-slate-900'}`}>
                                ${user?.deuda_total || "0.00"}
                            </h2>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${user?.en_mora ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {user?.en_mora ? 'Estado: En Mora' : 'Estado: Solvente'}
                        </div>
                    </div>

                    {/* Acción de Descarga */}
                    <button 
                        onClick={handleDescarga}
                        disabled={user?.en_mora}
                        className={`w-full py-5 rounded-2xl font-black text-xs transition-all tracking-widest flex items-center justify-center gap-3 ${
                            user?.en_mora 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-dashed border-slate-200' 
                            : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl'
                        }`}
                    >
                        {user?.en_mora ? <AlertCircle size={18} /> : <Download size={18} />}
                        {user?.en_mora ? 'DESCARGA BLOQUEADA POR MORA' : 'GENERAR EXPEDIENTE OFICIAL PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EstadoCuenta;