import { useState, useEffect } from 'react';
import { FileText, Loader2, Download, DollarSign, User, Search, ClipboardList } from 'lucide-react';
import { reportesService } from '../../../services/reportesService';
import { academicoService } from '../../../services/academicoService';

const ReportesPage = () => {
  const [loading, setLoading] = useState(false);
  const [reporteGenerando, setReporteGenerando] = useState(null);
  const [modalReporte, setModalReporte] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [notif, setNotif] = useState({ show: false, type: 'success', message: '' });
  const [carreras, setCarreras] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [carreraFiltro, setCarreraFiltro] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState('');

  useEffect(() => {
    cargarData();
  }, []);

  useEffect(() => {
    filtrarEstudiantes();
  }, [busqueda, carreraFiltro, periodoFiltro, estudiantes]);

  const cargarData = async () => {
    try {
      const [estRes, carRes, perRes] = await Promise.all([
        academicoService.getEstudiantes({ limit: 100 }),
        academicoService.getCarreras(),
        academicoService.getPeriodos()
      ]);
      setEstudiantes(estRes.data?.data?.estudiantes || estRes.data?.estudiantes || []);
      setCarreras(carRes.data?.data?.carreras || carRes.data?.carreras || []);
      setPeriodos(perRes.data?.data?.periodos || perRes.data?.periodos || []);
      setResultados((estRes.data?.data?.estudiantes || estRes.data?.estudiantes || []).slice(0, 10));
    } catch (error) {
      console.error(error);
    }
  };

  const filtrarEstudiantes = () => {
    let filtered = estudiantes;
    
    if (carreraFiltro) {
      filtered = filtered.filter(e => e.carrera_id === parseInt(carreraFiltro));
    }
    
    if (periodoFiltro) {
      filtered = filtered.filter(e => e.periodo_id === parseInt(periodoFiltro));
    }
    
    if (busqueda.length >= 2) {
      const q = busqueda.toLowerCase();
      filtered = filtered.filter(e =>
        (e.nombre || '').toLowerCase().includes(q) ||
        (e.cedula || '').includes(q)
      );
    }
    
    setResultados(filtered.slice(0, 15));
  };

  const handleGenerarReporte = async (tipo) => {
    if (tipo !== 'tesoreria' && !estudianteSeleccionado) {
      setNotif({ show: true, type: 'error', message: 'Selecciona un estudiante' });
      return;
    }

    setReporteGenerando(tipo);
    try {
      let blob;
      let filename;

      switch (tipo) {
        case 'tesoreria':
          blob = await reportesService.getReporteTesoreria();
          filename = `reporte_tesoreria_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'estado_cuenta':
          blob = await reportesService.getEstadoCuenta(estudianteSeleccionado.id);
          filename = `estado_cuenta_${estudianteSeleccionado.cedula}_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'boletin':
          blob = await reportesService.getBoletinNotas(estudianteSeleccionado.id);
          filename = `boletin_notas_${estudianteSeleccionado.cedula}_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        default:
          break;
      }

      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setModalReporte(null);
        setEstudianteSeleccionado(null);
        setBusqueda('');
        setResultados([]);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setNotif({ show: true, type: 'error', message: 'Error al generar el reporte' });
    } finally {
      setReporteGenerando(null);
    }
  };

  const openModal = (tipo) => {
    setModalReporte(tipo);
    setEstudianteSeleccionado(null);
    setBusqueda('');
    setCarreraFiltro('');
    setPeriodoFiltro('');
    setResultados(estudiantes.slice(0, 15));
  };

  const reportes = [
    {
      id: 'tesoreria',
      titulo: 'Reporte de Tesorería',
      descripcion: 'Resumen financiero del período: ingresos, gastos, estado de cuentas',
      icono: DollarSign,
      color: 'bg-emerald-50 text-emerald-600',
      requiereEstudiante: false,
      disponible: true
    },
    {
      id: 'estado_cuenta',
      titulo: 'Estado de Cuenta',
      descripcion: 'Estado de cuenta detallado de un estudiante específico',
      icono: FileText,
      color: 'bg-blue-50 text-blue-600',
      requiereEstudiante: true,
      disponible: true
    },
    {
      id: 'boletin',
      titulo: 'Boletín de Notas',
      descripcion: 'Historial académico completo de un estudiante',
      icono: ClipboardList,
      color: 'bg-purple-50 text-purple-600',
      requiereEstudiante: true,
      disponible: true
    }
  ];

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500">Generar y descargar reportes del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportes.map((reporte) => (
          <div
            key={reporte.id}
            className="bg-white rounded-xl border border-slate-100 p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${reporte.color}`}>
                <reporte.icono size={24} />
              </div>
              {reporte.disponible && (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Disponible
                </span>
              )}
            </div>
            
            <h3 className="text-base font-black uppercase italic text-slate-900 mb-2">{reporte.titulo}</h3>
            <p className="text-xs text-slate-500 mb-5">{reporte.descripcion}</p>

            {reporte.disponible ? (
              <button
                onClick={() => openModal(reporte.id)}
                disabled={reporteGenerando === reporte.id}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50"
              >
                {reporteGenerando === reporte.id ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <Download size={16} />
                    Descargar PDF
                  </>
                )}
              </button>
            ) : (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-not-allowed"
              >
                <FileText size={16} />
                Próximamente
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal para seleccionar estudiante */}
      {modalReporte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModalReporte(null)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <button 
              onClick={() => setModalReporte(null)}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600"
            >
              ✕
            </button>

            <h2 className="text-lg font-black text-slate-900 mb-2">
              {modalReporte === 'tesoreria' ? 'Reporte de Tesorería' : 'Seleccionar Estudiante'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {modalReporte === 'tesoreria' 
                ? 'Generar reporte financiero del período'
                : 'Selecciona un estudiante para generar el reporte'}
            </p>

            {modalReporte !== 'tesoreria' ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={carreraFiltro}
                    onChange={(e) => setCarreraFiltro(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
                  >
                    <option value="">Todas las carreras</option>
                    {carreras.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <select
                    value={periodoFiltro}
                    onChange={(e) => setPeriodoFiltro(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-1"
                  >
                    <option value="">Todos los períodos</option>
                    {periodos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar Estudiante</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nombre o cédula..."
                    />
                  </div>
                  {resultados.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                      {resultados.map((est) => (
                        <button
                          key={est.id}
                          onClick={() => {
                            setEstudianteSeleccionado(est);
                            setBusqueda(est.nombre_completo || est.nombre);
                            setResultados([]);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                            estudianteSeleccionado?.id === est.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <p className="font-medium text-slate-800 text-sm">{est.nombre_completo || est.nombre}</p>
                          <p className="text-xs text-slate-400">{est.cedula}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <button
              onClick={() => handleGenerarReporte(modalReporte)}
              disabled={reporteGenerando || (modalReporte !== 'tesoreria' && !estudianteSeleccionado)}
              className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {reporteGenerando ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : (
                'Descargar PDF'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notif.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl text-sm font-bold ${
          notif.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {notif.message}
          <button onClick={() => setNotif({ ...notif, show: false })} className="ml-2">✕</button>
        </div>
      )}

      <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="font-black uppercase italic text-indigo-900 mb-2">Nota Importante</h3>
        <p className="text-xs text-indigo-700">
          Los reportes financieros están disponibles solo para visualización. 
          Si necesitas datos específicos o reportes personalizados, contacta al director.
        </p>
      </div>
    </div>
  );
};

export default ReportesPage;