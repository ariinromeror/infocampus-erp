import { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, Users, CheckCircle2, AlertCircle, 
  CreditCard, Receipt, Loader2, User, Mail, FileText, Download
} from 'lucide-react';
import api from '../../services/api';
import SelectModal from './components/SelectModal';
import { generarCertificadoInscripcion } from '../../utils/pdfGenerator';

const limpiarTexto = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
};

const generarEmail = (nombre, apellido) => {
  const nombreLimpio = limpiarTexto(nombre);
  const apellidoLimpio = limpiarTexto(apellido);
  if (!nombreLimpio || !apellidoLimpio) return '';
  return `${nombreLimpio}.${apellidoLimpio}@estudiante.infocampus.edu.ec`;
};

const SecretariaPrimeraMatriculaPage = () => {
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPago, setLoadingPago] = useState(false);
  const [loadingCarrera, setLoadingCarrera] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Datos del estudiante
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    tipo_documento: 'dni',
    cedula: '',
    email: '',
    carrera_id: '',
    es_becado: false,
    porcentaje_beca: 0,
  });

  // Datos del pago
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [valorInscripcion, setValorInscripcion] = useState(50);

  // Datos automáticos
  const [precioCredito, setPrecioCredito] = useState(0);
  const [creditos, setCreditos] = useState(0);
  const [materiasSemestre, setMateriasSemestre] = useState([]);

  const fetchCarreras = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/academico/carreras');
      const data = res.data;
      setCarreras(data?.data?.carreras || data?.carreras || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarreras();
  }, [fetchCarreras]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generar email cuando cambia nombre o apellido
    if (field === 'first_name' || field === 'last_name') {
      const nombre = field === 'first_name' ? value : formData.first_name;
      const apellido = field === 'last_name' ? value : formData.last_name;
      if (nombre && apellido) {
        const emailGenerado = generarEmail(nombre, apellido);
        setFormData(prev => ({ ...prev, email: emailGenerado }));
      }
    }
  };

  const handleCarreraChange = async (carreraId) => {
    setFormData(prev => ({ ...prev, carrera_id: carreraId }));
    
    if (!carreraId) {
      setPrecioCredito(0);
      setCreditos(0);
      setMateriasSemestre([]);
      return;
    }

    try {
      setLoadingCarrera(true);
      const res = await api.get(`/academico/carreras/${carreraId}/primer-semestre`);
      const data = res.data?.data;
      
      if (data) {
        setPrecioCredito(data.carrera.precio_credito);
        setCreditos(data.total_creditos);
        setMateriasSemestre(data.materias || []);
      }
    } catch (err) {
      console.error('Error cargando carrera:', err);
    } finally {
      setLoadingCarrera(false);
    }
  };

  const montoCreditos = creditos * precioCredito;
  const montoDescuento = formData.es_becado ? ((montoCreditos + valorInscripcion) * formData.porcentaje_beca) / 100 : 0;
  const totalPagar = (montoCreditos + valorInscripcion) - montoDescuento;

  const registrarPago = async () => {
    if (!formData.first_name || !formData.last_name || !formData.cedula || !formData.carrera_id) {
      setError('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setLoadingPago(true);
      setError(null);
      setSuccess(null);

      const res = await api.post('/administrativo/primera-matricula', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        cedula: formData.cedula,
        email: formData.email,
        carrera_id: parseInt(formData.carrera_id),
        metodo_pago: metodoPago,
        referencia: referencia || null,
        valor_inscripcion: valorInscripcion,
        creditos: creditos,
        precio_credito: precioCredito,
        es_becado: formData.es_becado,
        porcentaje_beca: formData.es_becado ? formData.porcentaje_beca : 0,
      });

      setSuccess(res.data);

      // Generar PDF de comprobante
      if (res.data.estudiante && res.data.pago) {
        generarCertificadoInscripcion(
          {
            id: res.data.estudiante.id,
            first_name: res.data.estudiante.nombre.split(' ')[0],
            last_name: res.data.estudiante.nombre.split(' ').slice(1).join(' '),
            cedula: res.data.estudiante.cedula,
          },
          { nombre: res.data.estudiante.carrera, precio_credito: res.data.pago.precio_credito },
          res.data.pago.creditos ? [{ creditos: res.data.pago.creditos, materia: 'Primer Período' }] : [],
          { nombre: 'Período Actual' },
          new Date().toISOString()
        );
      }

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        tipo_documento: 'dni',
        cedula: '',
        email: '',
        carrera_id: '',
        es_becado: false,
        porcentaje_beca: 0,
      });
      setPrecioCredito(0);
      setCreditos(0);
      setMateriasSemestre([]);
      setReferencia('');

    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al registrar');
    } finally {
      setLoadingPago(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
          Primera <span className="text-indigo-600">Matrícula</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Crear nuevo estudiante y registrar pago de primera matrícula
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-sm text-red-600 font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-600">Estudiante creado exitosamente</p>
            <p className="text-xs text-emerald-500">
              {success.estudiante?.nombre} - Cédula: {success.estudiante?.cedula}
            </p>
            <p className="text-xs text-emerald-500">
              Total pagado: {success.pago?.total_pagado?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DATOS DEL ESTUDIANTE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <User className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Datos del Estudiante</p>
              <p className="text-xs text-slate-500">Ingrese los datos del nuevo estudiante</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Nombre(s) *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={e => handleInputChange('first_name', e.target.value)}
                placeholder="Juan"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Apellido(s) *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => handleInputChange('last_name', e.target.value)}
                placeholder="Pérez García"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Documento de identidad *</label>
              <div className="flex gap-2">
                <select
                  value={formData.tipo_documento || 'dni'}
                  onChange={e => handleInputChange('tipo_documento', e.target.value)}
                  className="w-28 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                >
                  <option value="dni">DNI</option>
                  <option value="nie">NIE</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
                <input
                  type="text"
                  value={formData.cedula}
                  onChange={e => handleInputChange('cedula', e.target.value)}
                  placeholder={formData.tipo_documento === 'pasaporte' ? 'AB123456' : '12345678'}
                  maxLength={formData.tipo_documento === 'pasaporte' ? 15 : 12}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder="juan.perez@estudiante.infocampus.edu.ec"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">Se genera automáticamente</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera *</label>
            <SelectModal
              options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
              value={formData.carrera_id}
              onChange={handleCarreraChange}
              placeholder="Seleccionar carrera..."
              label="Seleccionar Carrera"
              valueKey="id"
              labelKey="nombre"
            />
          </div>

          {/* Beca */}
          <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <input
              type="checkbox"
              checked={formData.es_becado}
              onChange={e => setFormData(prev => ({ ...prev, es_becado: e.target.checked }))}
              className="w-5 h-5 rounded text-indigo-600"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-700">¿Tiene beca?</p>
              {formData.es_becado && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-amber-600 mb-1 block">Porcentaje (%)</label>
                  <input
                    type="number"
                    value={formData.porcentaje_beca}
                    onChange={e => setFormData(prev => ({ ...prev, porcentaje_beca: parseInt(e.target.value) || 0 }))}
                    placeholder="0-100"
                    max={100}
                    className="w-full px-4 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-slate-700"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARRERA Y PAGO */}
        <div className="space-y-6">
          {/* Información de la Carrera */}
          {loadingCarrera ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm flex items-center justify-center h-48">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : formData.carrera_id ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <FileText className="text-indigo-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Primer Período</p>
                  <p className="text-xs text-slate-500">{creditos} créditos</p>
                </div>
              </div>

              {materiasSemestre.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Materias del primer semestre:</p>
                  {materiasSemestre.map(m => (
                    <div key={m.id} className="flex justify-between text-sm p-2 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-700">{m.codigo} - {m.nombre}</span>
                      <span className="font-black text-indigo-600">{m.creditos} cr</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-indigo-500 uppercase">Precio por Crédito</p>
                  <p className="text-xl font-black text-indigo-600">{precioCredito} €</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-500 uppercase">Total Créditos</p>
                  <p className="text-xl font-black text-indigo-600">{creditos}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
              <p className="text-sm text-slate-500 text-center">Seleccione una carrera para ver los detalles</p>
            </div>
          )}

          {/* Pago */}
          <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Pago</p>
                <p className="text-xs text-slate-500">Configure el monto y método de pago</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Valor Inscripción (€)</label>
              <input
                type="number"
                value={valorInscripcion}
                onChange={e => setValorInscripcion(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'bizum', label: 'Bizum' },
                  { value: 'tarjeta_debito', label: 'Tarjeta Débito' },
                  { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMetodoPago(m.value)}
                    className={`p-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      metodoPago === m.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {(metodoPago === 'transferencia' || metodoPago === 'bizum' || metodoPago.includes('tarjeta')) && (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Referencia</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  placeholder="N° de transacción"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                />
              </div>
            )}

            {/* Resumen */}
            <div className="p-4 bg-indigo-50 rounded-2xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Valor Inscripción:</span>
                <span className="font-bold text-slate-700">{valorInscripcion.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Créditos ({creditos} × ${precioCredito}):</span>
                <span className="font-bold text-slate-700">${montoCreditos.toFixed(2)}</span>
              </div>
              {formData.es_becado && formData.porcentaje_beca > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Descuento ({formData.porcentaje_beca}%):</span>
                  <span className="font-bold text-amber-600">-{montoDescuento.toFixed(2)} €</span>
                </div>
              )}
              <div className="border-t border-indigo-200 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-indigo-700">TOTAL:</span>
                  <span className="font-black text-xl text-indigo-600">{totalPagar.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            <button
              onClick={registrarPago}
              disabled={loadingPago || !formData.first_name || !formData.last_name || !formData.cedula || !formData.carrera_id}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest text-[11px] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
            >
              {loadingPago ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Receipt size={18} />
                  Crear Estudiante y Confirmar Pago
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretariaPrimeraMatriculaPage;
