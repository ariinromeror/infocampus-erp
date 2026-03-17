import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Plus, X, Save, Search, AlertCircle, CheckCircle2, ChevronDown, Mail, Lock, RefreshCw } from 'lucide-react';
import useUsuarios from './hooks/useUsuarios';
import SearchInput from '../../components/shared/SearchInput';
import EmptyState from '../../components/shared/EmptyState';
import { SkeletonTable } from '../../components/shared/Loader';
import SelectModal from './components/SelectModal';

const SecretariaUsuariosPage = () => {
  const { 
    usuarios, carreras, loading, fetchUsuarios, crearEstudiante,
    generarEmailUnico, generarPassword 
  } = useUsuarios();
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [busqueda, setBusqueda] = useState('');
  const [generandoEmail, setGenerandoEmail] = useState(false);

  const [form, setForm] = useState({
    cedula: '', email: '', first_name: '', last_name: '',
    password: '', carrera_id: '', es_becado: false, porcentaje_beca: 0,
  });

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  useEffect(() => {
    if (mostrarForm && !form.password) {
      setForm(prev => ({ ...prev, password: generarPassword() }));
    }
  }, [mostrarForm, form.password, generarPassword]);

  const usuariosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return usuarios;
    const q = busqueda.toLowerCase();
    return usuarios.filter(u =>
      (u.nombre || u.nombre_completo || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(q) ||
      (u.cedula || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  const handleNombreChange = async (campo, valor) => {
    setForm(prev => {
      const nuevo = { ...prev, [campo]: valor };
      return nuevo;
    });

    const nombre = campo === 'first_name' ? valor : form.first_name;
    const apellido = campo === 'last_name' ? valor : form.last_name;

    if (nombre && apellido && nombre.length >= 2 && apellido.length >= 2) {
      setGenerandoEmail(true);
      try {
        const emailUnico = await generarEmailUnico(nombre, apellido);
        setForm(prev => ({ ...prev, email: emailUnico }));
      } catch {
        setGenerandoEmail(false);
      }
      setGenerandoEmail(false);
    }
  };

  const regenerarPassword = () => {
    setForm(prev => ({ ...prev, password: generarPassword() }));
  };

  const handleCrearEstudiante = async () => {
    if (!form.cedula || !form.email || !form.first_name || !form.last_name || !form.password || !form.carrera_id) {
      setMsg({ text: 'Completa todos los campos obligatorios', ok: false });
      return;
    }
    setGuardando(true);
    const result = await crearEstudiante(form);
    if (result.ok) {
      setMsg({ text: `Estudiante ${form.first_name} ${form.last_name} creado exitosamente`, ok: true });
      setMostrarForm(false);
      setForm({ 
        cedula:'', email:'', first_name:'', last_name:'', 
        password:'', carrera_id:'', es_becado:false, porcentaje_beca:0 
      });
      fetchUsuarios();
      setTimeout(() => setMsg({ text:'', ok:true }), 4000);
    } else {
      setMsg({ text: result.error, ok: false });
    }
    setGuardando(false);
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setForm({ 
      cedula:'', email:'', first_name:'', last_name:'', 
      password:'', carrera_id:'', es_becado:false, porcentaje_beca:0 
    });
    setMsg({ text: '', ok: true });
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
            Directorio <span className="text-indigo-600">Usuarios</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Cargando...' : `${usuarios.length} usuarios en el sistema`}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black uppercase italic tracking-widest text-[11px] transition-all shadow-sm ${
            mostrarForm ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white hover:bg-indigo-600'
          }`}
        >
          {mostrarForm ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Nuevo Estudiante</>}
        </button>
      </div>

      {msg.text && (
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
          msg.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {mostrarForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-7 space-y-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nuevo Estudiante</p>
            <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
              Email y contraseña automáticos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cédula *</label>
              <input
                type="text"
                placeholder="0912345678"
                value={form.cedula}
                onChange={e => setForm(p => ({ ...p, cedula: e.target.value }))}
                maxLength={10}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Carrera *</label>
              <SelectModal
                options={carreras.map(c => ({ id: c.id, nombre: c.nombre }))}
                value={form.carrera_id}
                onChange={(val) => setForm(p => ({ ...p, carrera_id: val }))}
                placeholder="Seleccionar..."
                label="Seleccionar Carrera"
                valueKey="id"
                labelKey="nombre"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Nombre *</label>
              <input
                type="text"
                placeholder="Arín"
                value={form.first_name}
                onChange={e => handleNombreChange('first_name', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Apellido *</label>
              <input
                type="text"
                placeholder="Romero"
                value={form.last_name}
                onChange={e => handleNombreChange('last_name', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
                <Mail size={12} /> Email (automático)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={generandoEmail ? 'Generando...' : form.email}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                />
                {generandoEmail && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-2">
                <Lock size={12} /> Contraseña temporal
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                />
                <button
                  type="button"
                  onClick={regenerarPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Generar nueva contraseña"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Beca %</label>
              <input
                type="number" min="0" max="100"
                value={form.porcentaje_beca}
                onChange={e => setForm(p => ({ ...p, porcentaje_beca: e.target.value, es_becado: parseInt(e.target.value) > 0 }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={cerrarForm}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-400 transition-all"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={handleCrearEstudiante}
              disabled={guardando}
              className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase italic tracking-widest text-[11px] hover:bg-indigo-600 disabled:opacity-50 transition-all"
            >
              {guardando ? (
                <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
              ) : (
                <><Save size={15} /> Crear Estudiante</>
              )}
            </button>
          </div>
        </div>
      )}

      <SearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, cédula o email..."
      />

      {loading ? (
        <SkeletonTable rows={5} />
      ) : usuariosFiltrados.length === 0 ? (
        <EmptyState icon={UserPlus} titulo="Sin usuarios encontrados" />
      ) : (
        <>
          <div className="sm:hidden space-y-3">
            {usuariosFiltrados.map(u => (
              <UsuarioRow key={u.id} usuario={u} isMobile />
            ))}
          </div>

          <div className="hidden sm:block bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b-4 border-slate-900">
                  <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Usuario</th>
                  <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Cédula</th>
                  <th className="py-6 px-8 text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Email</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Rol</th>
                  <th className="py-6 px-8 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuariosFiltrados.map(u => (
                  <UsuarioRow key={u.id} usuario={u} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SecretariaUsuariosPage;
