import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { Download, FileText, BookOpen, DollarSign, GraduationCap, CheckCircle } from 'lucide-react';

const descargar = async (url, filename, setEstado, key) => {
  setEstado(prev => ({ ...prev, [key]: 'cargando' }));
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
    setEstado(prev => ({ ...prev, [key]: 'listo' }));
    setTimeout(() => setEstado(prev => ({ ...prev, [key]: 'idle' })), 3000);
  } catch {
    setEstado(prev => ({ ...prev, [key]: 'error' }));
    setTimeout(() => setEstado(prev => ({ ...prev, [key]: 'idle' })), 3000);
  }
};

const PDFCard = ({ icon: Icon, titulo, descripcion, estado, onDescargar }) => {
  const isLoading = estado === 'cargando';
  const isReady = estado === 'listo';
  const isError = estado === 'error';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col justify-between gap-8 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-5">
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex-shrink-0">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
            {titulo}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {descripcion}
          </p>
        </div>
      </div>

      <button
        onClick={onDescargar}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase italic tracking-widest text-[11px] transition-all ${
          isReady
            ? 'bg-emerald-600 text-white'
            : isError
            ? 'bg-red-50 border-2 border-red-200 text-red-600'
            : 'bg-slate-900 text-white hover:bg-indigo-600 disabled:opacity-50'
        }`}
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generando...
          </>
        ) : isReady ? (
          <>
            <CheckCircle size={15} />
            Descargado
          </>
        ) : isError ? (
          <>
            <FileText size={15} />
            Error — reintentar
          </>
        ) : (
          <>
            <Download size={15} />
            Descargar PDF
          </>
        )}
      </button>
    </div>
  );
};

const PDFsPage = () => {
  const { user } = useAuth();
  const [estado, setEstado] = useState({
    notas: 'idle',
    pagos: 'idle',
  });

  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const documentos = [
    {
      key: 'notas',
      icon: GraduationCap,
      titulo: 'Boletín de Notas',
      descripcion: 'Calificaciones por período, parciales y nota final de cada materia',
      url: `/reportes/notas/${user?.id}`,
      filename: `boletin_notas_${hoy}.pdf`,
    },
    {
      key: 'pagos',
      icon: DollarSign,
      titulo: 'Estado de Cuenta',
      descripcion: 'Historial de pagos, deuda pendiente y beneficios vigentes',
      url: `/reportes/estado-cuenta/${user?.id}`,
      filename: `estado_cuenta_${hoy}.pdf`,
    },
  ];

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Mis <span className="text-indigo-600">Documentos</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Descarga tus reportes oficiales en PDF
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {documentos.map(({ key, icon, titulo, descripcion, url, filename }) => (
          <PDFCard
            key={key}
            icon={icon}
            titulo={titulo}
            descripcion={descripcion}
            estado={estado[key]}
            onDescargar={() => descargar(url, filename, setEstado, key)}
          />
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <FileText className="text-slate-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nota</p>
            <p className="text-sm font-bold text-slate-400">
              Los documentos se generan en tiempo real con los datos actuales de tu expediente académico y financiero.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFsPage;