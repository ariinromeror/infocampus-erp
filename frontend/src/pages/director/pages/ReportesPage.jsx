import { useState, useEffect } from 'react';
import { FileText, Download, Loader2, DollarSign, BookOpen, Users, Award, BarChart2, Receipt, ChevronDown } from 'lucide-react';
import { academicoService } from '../../../services/academicoService';
import NotifModal from '../components/NotifModal';

const ReportesPage = () => {
  const [loading,   setLoading]   = useState({});
  const [periodos,  setPeriodos]  = useState([]);
  const [periodo,   setPeriodo]   = useState('');
  const [estudiante,setEstudiante]= useState('');
  const [notif,     setNotif]     = useState({ open: false, titulo: '', mensaje: '', tipo: 'error' });

  useEffect(() => {
    academicoService.getPeriodos()
      .then(r => {
        const data = r.data?.data?.periodos || r.data?.periodos || [];
        setPeriodos(data);
        const activo = data.find(p => p.activo);
        if (activo) setPeriodo(String(activo.id));
      })
      .catch(() => {});
  }, []);

  const run = async (key, fn) => {
    setLoading(p => ({ ...p, [key]: true }));
    try {
      await fn();
    } catch (e) {
      setNotif({ open: true, titulo: 'Error al generar reporte', mensaje: e.response?.data?.detail || 'No se pudo generar el PDF. Intenta de nuevo.', tipo: 'error' });
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  };

  const reportesGlobales = [
    {
      reportKey: 'tesoreria',
      label: 'Tesorería',
      sub:   'Pagos y mora · últimos 30 días',
      icon:  DollarSign,
      color: 'bg-teal-50 text-teal-600',
      fn:    () => academicoService.getReporteTesoreria(),
    },
    {
      reportKey: 'tesoreria90',
      label: 'Tesorería 90 días',
      sub:   'Reporte extendido · 3 meses',
      icon:  Receipt,
      color: 'bg-emerald-50 text-emerald-600',
      fn:    () => academicoService.getReporteTesoreria(90),
    },
    {
      reportKey: 'mora',
      label: 'Reporte de Mora',
      sub:   'Estudiantes con deuda vencida',
      icon:  BarChart2,
      color: 'bg-rose-50 text-rose-600',
      fn:    async () => {
        const res = await academicoService.getTesoreroMora();
        const mora = res.data?.data?.estudiantes || res.data?.estudiantes || [];
        if (!mora.length) { setNotif({ open: true, titulo: 'Sin morosos', mensaje: 'No hay estudiantes en mora actualmente.', tipo: 'error' }); return; }
        const csv = [
          ['Nombre', 'Cédula', 'Carrera', 'Deuda Total'],
          ...mora.map(e => [e.nombre_completo || e.nombre || '', e.cedula || '', e.carrera || '', e.deuda_total || 0]),
        ].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `mora_${Date.now()}.csv`; a.click();
      },
    },
  ];

  const reportesPorPeriodo = [
    {
      reportKey: 'matricula',
      label: 'Matrícula del Período',
      sub:   'Estudiantes inscritos en el período',
      icon:  Users,
      color: 'bg-indigo-50 text-indigo-600',
      fn:    async () => {
        if (!periodo) { setNotif({ open: true, titulo: 'Selecciona un período', mensaje: 'Elige un período antes de generar el reporte.', tipo: 'error' }); return; }
        const res = await academicoService.getSecciones({ periodo_id: periodo });
        const secs = res.data?.data?.secciones || [];
        const csv = [
          ['Sección', 'Materia', 'Carrera', 'Semestre', 'Docente', 'Inscritos', 'Cupo'],
          ...secs.map(s => [s.codigo, s.materia, '', s.semestre || '', s.docente || '', s.cupo_actual || 0, s.cupo_maximo || 0]),
        ].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `matricula_${periodo}_${Date.now()}.csv`; a.click();
      },
    },
    {
      reportKey: 'rendimiento',
      label: 'Rendimiento Académico',
      sub:   'Notas y aprobados por sección',
      icon:  BookOpen,
      color: 'bg-violet-50 text-violet-600',
      fn:    async () => {
        if (!periodo) { setNotif({ open: true, titulo: 'Selecciona un período', mensaje: 'Elige un período antes de generar el reporte.', tipo: 'error' }); return; }
        const res = await academicoService.getPeriodoEstadisticas(periodo);
        const est = res.data?.estadisticas || res.data;
        const periodo_sel = periodos.find(p => String(p.id) === String(periodo));
        const csv = [
          ['Período', 'Total Estudiantes', 'Aprobados', 'Reprobados', 'Promedio', 'Tasa Aprobación'],
          [periodo_sel?.nombre || periodo, est?.total_estudiantes || 0, est?.aprobados || 0, est?.reprobados || 0, est?.promedio_general?.toFixed ? est.promedio_general.toFixed(2) : 0, est?.tasa_aprobacion || 0],
        ].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `rendimiento_${periodo}_${Date.now()}.csv`; a.click();
      },
    },
    {
      reportKey: 'ingresos_periodo',
      label: 'Ingresos del Período',
      sub:   'Recaudación por período seleccionado',
      icon:  Award,
      color: 'bg-amber-50 text-amber-600',
      fn:    async () => {
        const res  = await academicoService.getTesoreroIngresos();
        const data = res.data?.data || res.data || [];
        const rows = Array.isArray(data) ? data : data?.periodos || [];
        const csv  = [
          ['Período', 'Ingreso Real', 'Pagos Completados', 'Pagos Pendientes'],
          ...rows.map(p => [p.periodo_codigo || p.nombre || '', p.ingreso_real || 0, p.pagos_completados || 0, p.pagos_pendientes || 0]),
        ].map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `ingresos_${Date.now()}.csv`; a.click();
      },
    },
  ];

  const ReporteCard = ({ reportKey, label, sub, icon: Icon, color, fn }) => (
    <button
      onClick={() => run(reportKey, fn)}
      disabled={loading[reportKey]}
      className="bg-white border border-slate-100 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 group"
    >
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
        {loading[reportKey] ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
      </div>
      <p className="text-base font-black italic uppercase tracking-tight text-slate-900">{label}</p>
      <p className="text-[10px] text-slate-400 mt-1">{sub}</p>
      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-black uppercase tracking-wider text-indigo-500 group-hover:text-indigo-700 transition-colors">
        <Download size={11} /> Descargar
      </div>
    </button>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Reportes</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Documentos institucionales · PDF y CSV</p>
      </div>

      {/* Reportes globales */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400 mb-4">Reportes Globales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportesGlobales.map(r => <ReporteCard {...r} key={r.reportKey} />)}
        </div>
      </div>

      {/* Selector de período */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400 mb-3">Período para reportes académicos</p>
        <div className="relative inline-block">
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="appearance-none pl-4 pr-10 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[200px]"
          >
            <option value="">Seleccionar período</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} {p.activo ? '· ACTIVO' : ''}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Reportes por período */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400 mb-4">Reportes por Período</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportesPorPeriodo.map(r => <ReporteCard {...r} key={r.reportKey} />)}
        </div>
      </div>

      {/* PDF individual */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-black italic uppercase tracking-tighter text-slate-900 mb-2">PDF Individual por Estudiante</h2>
        <p className="text-xs text-slate-500 mb-5">Ingresa la ID del estudiante para generar su PDF.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={estudiante}
            onChange={e => setEstudiante(e.target.value)}
            placeholder="ID del estudiante"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={() => run('notas_ind', () => academicoService.getReporteNotas(estudiante))}
            disabled={!estudiante || loading.notas_ind}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            {loading.notas_ind ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Boletín
          </button>
          <button
            onClick={() => run('estado_ind', () => {
              if (!estudiante) return Promise.reject(new Error('Ingrese una ID'));
              return academicoService.getEstadoCuentaPDF?.(estudiante)
                ?? academicoService.getReporteTesoreria();
            })}
            disabled={!estudiante || loading.estado_ind}
            className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black uppercase hover:bg-slate-200 transition-colors disabled:opacity-40"
          >
            {loading.estado_ind ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
            Estado Cuenta
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">También puedes generar PDFs individuales desde la ficha de cada estudiante en la sección Estudiantes.</p>
      </div>

      <NotifModal isOpen={notif.open} onClose={() => setNotif({ ...notif, open: false })} titulo={notif.titulo} mensaje={notif.mensaje} tipo={notif.tipo} />
    </div>
  );
};

export default ReportesPage;