import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, DollarSign, ShieldCheck, AlertTriangle,
  Save, CheckCircle2, FileText, Vault, BookOpen,
  Banknote, ArrowLeftRight, CreditCard, Building2,
} from 'lucide-react';
import useEstudianteTesorero from '../hooks/useEstudianteTesorero';
import ConfirmModal from '../components/ConfirmModal';

const fmt = n => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtFecha = f => f
  ? new Date(f).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const METODOS = [
  { value: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
  { value: 'transferencia', label: 'Transferencia',  Icon: ArrowLeftRight },
  { value: 'tarjeta',       label: 'Tarjeta',        Icon: CreditCard },
  { value: 'deposito',      label: 'Depósito',       Icon: Building2 },
];

const TABS = [
  { key: 'cuenta',   label: 'Estado de Cuenta', Icon: FileText },
  { key: 'pago',     label: 'Registrar Pago',   Icon: DollarSign },
  { key: 'convenio', label: 'Convenio',          Icon: ShieldCheck },
];

/* Skeleton while loading */
const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-6 w-32 bg-slate-100 rounded-xl" />
    <div className="h-52 bg-slate-100 rounded-2xl" />
    <div className="flex gap-3">
      {[1, 2, 3].map(i => <div key={i} className="h-11 flex-1 bg-slate-100 rounded-2xl" />)}
    </div>
    <div className="h-48 bg-slate-50 rounded-xl" />
  </div>
);

const TesoreroEstudiantePage = () => {
  const { estudianteId } = useParams();
  const navigate = useNavigate();
  const {
    estudiante, estadoCuenta, loading,
    fetchEstudiante, registrarPago, actualizarConvenio, limpiar,
  } = useEstudianteTesorero();

  const [tab, setTab] = useState('cuenta');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [comprobante, setComprobante] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [convenioActivo, setConvenioActivo] = useState(false);
  const [fechaLimite, setFechaLimite] = useState('');
  const [guardandoConvenio, setGuardandoConvenio] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (estudianteId) fetchEstudiante(estudianteId);
    return () => limpiar();
  }, [estudianteId, fetchEstudiante, limpiar]);

  useEffect(() => {
    if (estudiante) {
      setConvenioActivo(estudiante.convenio_activo || false);
      if (estudiante.fecha_limite_convenio) {
        setFechaLimite(estudiante.fecha_limite_convenio.split('T')[0]);
      }
    }
  }, [estudiante]);

  if (loading) return <PageSkeleton />;
  if (!estudiante) return (
    <div className="p-10 bg-rose-50 border border-rose-100 rounded-2xl text-indigo-600 text-center">
      <p className="font-black uppercase tracking-widest text-sm">Estudiante no encontrado</p>
    </div>
  );

  const nombre = estudiante.nombre_completo || `${estudiante.first_name || ''} ${estudiante.last_name || ''}`.trim();
  const enMora = estadoCuenta?.en_mora;
  const deudaTotal = estadoCuenta?.deuda_total || 0;
  const deudaVencida = estadoCuenta?.deuda_vencida || 0;
  const totalPagado = estadoCuenta?.total_pagado || 0;
  const tieneConvenio = estudiante.convenio_activo;

  const handleRegistrarPago = async () => {
    setShowModal(false);
    setProcesando(true);
    const res = await registrarPago(estudianteId, metodoPago, comprobante);
    setProcesando(false);
    if (res.ok) {
      setResultado({
        ok: true,
        msg: `✓ Pago registrado: ${res.data?.pagos_registrados || 0} materias — ${fmt(res.data?.monto_total)}`,
      });
      fetchEstudiante(estudianteId);
      setTab('cuenta');
    } else {
      setResultado({ ok: false, msg: res.error });
    }
  };

  const handleGuardarConvenio = async () => {
    setGuardandoConvenio(true);
    const res = await actualizarConvenio(estudianteId, convenioActivo, convenioActivo ? fechaLimite : null);
    setGuardandoConvenio(false);
    if (res.ok) {
      fetchEstudiante(estudianteId);
      setResultado({ ok: true, msg: 'Convenio actualizado correctamente' });
    } else {
      setResultado({ ok: false, msg: res.error });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors group"
      >
        <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver
      </button>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden"
      >
        {/* Background watermark */}
        <div className="absolute right-0 bottom-0 opacity-[0.04] pointer-events-none">
          <Vault size={220} strokeWidth={0.8} />
        </div>

        <div className="relative z-10">
          {/* Status badges row */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tieneConvenio && estudiante.fecha_limite_convenio ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-teal-500/30 text-indigo-300">
                <ShieldCheck size={11} />
                Convenio hasta {fmtFecha(estudiante.fecha_limite_convenio)}
              </span>
            ) : enMora ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-indigo-300">
                <AlertTriangle size={11} /> En Mora
              </span>
            ) : deudaTotal <= 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-teal-500/30 text-indigo-300">
                <CheckCircle2 size={11} /> Al día
              </span>
            ) : null}

            {estudiante.es_becado && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300">
                Beca {estudiante.porcentaje_beca}%
              </span>
            )}
          </div>

          {/* Name + info */}
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">
            Expediente Financiero
          </p>
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter leading-none truncate">
            {nombre}
          </h2>
          <p className="text-sm font-semibold text-slate-400 mt-2">
            {estudiante.cedula || '—'} · {estudiante.email || '—'}
          </p>
          {estudiante.carrera_detalle?.nombre && (
            <p className="text-sm font-bold text-indigo-400 mt-1">{estudiante.carrera_detalle.nombre}</p>
          )}

          {/* Financial metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
            {[
              { label: 'Total Pagado', value: fmt(totalPagado), color: 'text-indigo-400' },
              { label: 'Deuda Total',  value: fmt(deudaTotal),  color: deudaTotal > 0 ? 'text-indigo-400' : 'text-white' },
              { label: 'Vencida',      value: fmt(deudaVencida), color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1.5">{label}</p>
                <p className={`text-lg sm:text-2xl font-black italic leading-none ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          </div>
        </motion.div>

      {/* Result feedback */}
      <AnimatePresence>
        {resultado && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl overflow-hidden ${
              resultado.ok
                ? 'bg-indigo-50 border border-teal-200 text-indigo-700'
                : 'bg-rose-50 border border-rose-200 text-indigo-700'
            }`}
          >
            {resultado.ok
              ? <CheckCircle2 size={16} className="flex-shrink-0" />
              : <AlertTriangle size={16} className="flex-shrink-0" />
            }
            <p className="text-[10px] font-black uppercase tracking-widest">{resultado.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setResultado(null); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all
              ${tab === key
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-300'
              }`}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {/* ESTADO DE CUENTA */}
          {tab === 'cuenta' && (
            <div className="bg-white border border-slate-100 rounded-xl p-8 shadow-sm space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                Resumen Financiero
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Inscripciones pendientes',
                    value: estadoCuenta?.inscripciones_pendientes || 0,
                    cls: (estadoCuenta?.inscripciones_pendientes || 0) > 0
                      ? 'border-rose-100 bg-rose-50'
                      : 'border-slate-100',
                    vCls: (estadoCuenta?.inscripciones_pendientes || 0) > 0 ? 'text-indigo-600' : 'text-slate-900',
                  },
                  {
                    label: 'Inscripciones pagadas',
                    value: estadoCuenta?.inscripciones_pagadas || 0,
                    cls: 'border-teal-100 bg-indigo-50',
                    vCls: 'text-indigo-600',
                  },
                ].map(({ label, value, cls, vCls }) => (
                  <div key={label} className={`border rounded-2xl p-5 ${cls}`}>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{label}</p>
                    <p className={`font-black text-3xl ${vCls}`}>{value}</p>
                  </div>
                ))}

                {estudiante.es_becado && (
                  <div className="border border-violet-100 bg-violet-50 rounded-2xl p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-400 mb-2">Beca activa</p>
                    <p className="font-black text-3xl text-violet-700">{estudiante.porcentaje_beca}%</p>
                  </div>
                )}
              </div>

              {deudaTotal > 0 && (
                <div className="flex items-center justify-between px-5 py-4 bg-rose-50 border border-rose-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-indigo-500 flex-shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                      Deuda pendiente
                    </p>
                  </div>
                  <p className="font-black italic text-indigo-600 text-lg">{fmt(deudaTotal)}</p>
                </div>
              )}
            </div>
          )}

          {/* REGISTRAR PAGO */}
          {tab === 'pago' && (
            <div className="bg-white border border-slate-100 rounded-xl p-8 shadow-sm space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                Registrar Pago
              </p>

              {deudaTotal <= 0 ? (
                <div className="flex items-center gap-3 px-6 py-5 bg-indigo-50 border border-teal-200 rounded-2xl">
                  <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    El estudiante no tiene deudas pendientes
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Se liquidarán todas las inscripciones pendientes — {fmt(deudaTotal)}
                    </p>
                  </div>

                  {/* Method selector */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-3">
                      Método de Pago *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {METODOS.map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          onClick={() => setMetodoPago(value)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-wide
                            ${metodoPago === value
                              ? 'border-teal-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                          <Icon size={14} />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comprobante */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Referencia / Comprobante (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="N° de transferencia, recibo..."
                      value={comprobante}
                      onChange={e => setComprobante(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setShowModal(true)}
                      disabled={procesando}
                      className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase italic tracking-widest text-[11px] hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98]"
                    >
                      {procesando ? (
                        <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</>
                      ) : (
                        <><DollarSign size={16} />Registrar — {fmt(deudaTotal)}</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CONVENIO */}
          {tab === 'convenio' && (
            <div className="bg-white border border-slate-100 rounded-xl p-8 shadow-sm space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                Convenio de Pago
              </p>

              <div className="px-5 py-4 bg-indigo-50 border border-teal-200 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                  El convenio protege al estudiante de figurar en mora hasta la fecha límite acordada.
                </p>
              </div>

              <div className="space-y-5">
                {/* Toggle */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setConvenioActivo(v => !v)}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                      ${convenioActivo ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300
                      ${convenioActivo ? 'left-7' : 'left-0.5'}`}
                    />
                  </button>
                  <div>
                    <p className="font-black text-slate-900 text-sm">
                      {convenioActivo ? 'Convenio activo' : 'Sin convenio activo'}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {convenioActivo
                        ? 'El estudiante no será marcado como en mora'
                        : 'Activa para establecer fecha límite de convenio'
                      }
                    </p>
                  </div>
                </div>

                {/* Date picker */}
                <AnimatePresence>
                  {convenioActivo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                        Fecha límite del convenio *
                      </label>
                      <input
                        type="date"
                        value={fechaLimite}
                        onChange={e => setFechaLimite(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full sm:w-64 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGuardarConvenio}
                  disabled={guardandoConvenio || (convenioActivo && !fechaLimite)}
                  className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest text-[11px] hover:bg-indigo-600 disabled:opacity-40 transition-all active:scale-[0.98]"
                >
                  {guardandoConvenio
                    ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                    : <><Save size={15} />Guardar Convenio</>
                  }
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleRegistrarPago}
        titulo="Confirmar Pago"
        mensaje={`Se registrará el pago de ${fmt(deudaTotal)} para ${nombre} usando ${METODOS.find(m => m.value === metodoPago)?.label}.`}
        textoConfirmar="Confirmar Pago"
        variante="success"
        loading={procesando}
      />
    </div>
  );
};

export default TesoreroEstudiantePage;
