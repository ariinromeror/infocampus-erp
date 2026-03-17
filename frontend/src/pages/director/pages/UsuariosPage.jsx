import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  UserCog, Plus, Search, X, Loader2, RefreshCw,
  Shield, Mail, Eye, EyeOff, User, Users,
} from 'lucide-react';
import useUsuarios from '../hooks/useUsuarios';
import NotifModal from '../components/NotifModal';

const ROL_COLORS = {
  director:      { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500'  },
  coordinador:   { bg: 'bg-violet-50',  text: 'text-violet-700',  dot: 'bg-violet-500'  },
  tesorero:      { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: 'bg-teal-500'    },
  profesor:      { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  estudiante:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  administrativo:{ bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500'    },
  admin:         { bg: 'bg-slate-100',  text: 'text-slate-700',   dot: 'bg-slate-500'   },
};

const RolBadge = ({ rol }) => {
  const c = ROL_COLORS[rol] || ROL_COLORS.admin;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {rol}
    </span>
  );
};

const ROLES_DISPONIBLES = ['director', 'coordinador', 'tesorero', 'profesor', 'estudiante', 'administrativo'];

const UsuariosPage = () => {
  const { usuarios, loading, error, fetchUsuarios, crearUsuario, actualizarUsuario } = useUsuarios();

  const [busqueda,    setBusqueda]    = useState('');
  const [rolFiltro,   setRolFiltro]   = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editando,    setEditando]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [notif,       setNotif]       = useState({ open: false, titulo: '', mensaje: '', tipo: 'success' });

  const FORM_INIT = { first_name: '', last_name: '', email: '', username: '', password: '', rol: 'profesor', cedula: '', telefono: '', activo: true };
  const [form, setForm] = useState(FORM_INIT);

  const filtrados = useMemo(() => {
    let list = usuarios;
    if (rolFiltro) list = list.filter(u => u.rol === rolFiltro);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(u =>
        (u.nombre_completo || `${u.first_name} ${u.last_name}` || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.cedula || '').includes(q)
      );
    }
    return list;
  }, [usuarios, busqueda, rolFiltro]);

  const conteoRoles = useMemo(() => {
    const c = {};
    ROLES_DISPONIBLES.forEach(r => { c[r] = 0; });
    usuarios.forEach(u => { if (c[u.rol] !== undefined) c[u.rol]++; });
    return c;
  }, [usuarios]);

  const handleOpen = (usuario = null) => {
    if (usuario) {
      setEditando(usuario);
      setForm({
        first_name: usuario.first_name || usuario.nombre_completo?.split(' ')[0] || '',
        last_name:  usuario.last_name  || usuario.nombre_completo?.split(' ').slice(1).join(' ') || '',
        email:      usuario.email || '',
        username:   usuario.username || '',
        password:   '',
        rol:        usuario.rol || 'profesor',
        cedula:     usuario.cedula || '',
        telefono:   usuario.telefono || '',
        activo:     usuario.activo !== false,
      });
    } else {
      setEditando(null);
      setForm(FORM_INIT);
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.rol) return;
    if (!editando && !form.password) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editando) {
        await actualizarUsuario(editando.id, payload);
        setNotif({ open: true, titulo: 'Usuario Actualizado', mensaje: `${form.first_name} ${form.last_name} fue actualizado correctamente.`, tipo: 'success' });
      } else {
        await crearUsuario(payload);
        setNotif({ open: true, titulo: 'Usuario Creado', mensaje: `${form.first_name} ${form.last_name} fue creado con rol ${form.rol}.`, tipo: 'success' });
      }
      setModalOpen(false);
    } catch (err) {
      setNotif({ open: true, titulo: 'Error', mensaje: err.response?.data?.detail || err.message || 'Error desconocido', tipo: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const inputCls  = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
  const selectCls = `${inputCls} bg-white`;

  return (
    <div className="space-y-7 pb-12">
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4 text-sm text-rose-700 font-bold">
          Error al cargar usuarios: {error}
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
            Usuarios
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">
            {loading ? 'Cargando...' : `${usuarios.length} usuarios registrados`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchUsuarios()} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-slate-400 hover:text-indigo-600">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => handleOpen()}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors">
            <Plus size={16} /> Nuevo Usuario
          </button>
        </div>
      </motion.div>

      {/* Conteo por rol */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ROLES_DISPONIBLES.map(rol => {
          const c = ROL_COLORS[rol];
          const activo = rolFiltro === rol;
          return (
            <button key={rol} onClick={() => setRolFiltro(activo ? '' : rol)}
              className={`p-3 rounded-2xl border text-center transition-all ${activo ? `${c.bg} border-current ${c.text} shadow-sm` : 'bg-white border-slate-100 hover:border-slate-200'}`}>
              <p className={`text-xl font-black ${activo ? c.text : 'text-slate-900'}`}>{conteoRoles[rol] || 0}</p>
              <p className={`text-[11px] font-black uppercase tracking-wider mt-0.5 ${activo ? c.text : 'text-slate-400'}`}>{rol}</p>
            </button>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, email, username o cédula..."
          className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0 animate-pulse">
              <div className="w-10 h-10 bg-slate-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-48" />
                <div className="h-2.5 bg-slate-50 rounded w-32" />
              </div>
              <div className="h-6 bg-slate-100 rounded-lg w-20" />
            </div>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl py-20 text-center">
          <Users size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-black uppercase italic text-slate-500">Sin usuarios</p>
          {(busqueda || rolFiltro) && (
            <button onClick={() => { setBusqueda(''); setRolFiltro(''); }}
              className="mt-3 text-[11px] font-black text-indigo-500 uppercase tracking-wide">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="col-span-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Usuario</p>
            </div>
            <div className="col-span-3 hidden sm:block">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Username / Cédula</p>
            </div>
            <div className="col-span-2 hidden sm:block">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Rol</p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Estado</p>
            </div>
          </div>

          {filtrados.map((u, idx) => {
            const nombre = u.nombre_completo || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
            const inicial = nombre?.[0]?.toUpperCase() || '?';
            const c = ROL_COLORS[u.rol] || ROL_COLORS.admin;
            return (
              <div key={u.id || idx}
                onClick={() => handleOpen(u)}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer group min-w-[600px]">
                {/* Nombre + email */}
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-sm font-black ${c.text}`}>{inicial}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black italic uppercase text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{nombre}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={9} className="text-slate-300 flex-shrink-0" />
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                </div>
                {/* Username/cedula */}
                <div className="col-span-3 hidden sm:flex flex-col justify-center min-w-0">
                  <p className="text-[11px] font-bold text-slate-600 truncate">{u.username}</p>
                  {u.cedula && <p className="text-[10px] text-slate-400">{u.cedula}</p>}
                </div>
                {/* Rol */}
                <div className="col-span-2 hidden sm:flex items-center">
                  <RolBadge rol={u.rol} />
                </div>
                {/* Estado */}
                <div className="col-span-2 flex items-center justify-end">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${u.activo !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {u.activo !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            );
          })}
          </div>
          </div>
        </div>
      )}

      {/* p final */}
      {!loading && filtrados.length > 0 && (
        <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wide">
          Mostrando {filtrados.length} de {usuarios.length} usuarios
          {rolFiltro && ` · Filtro: ${rolFiltro}`}
        </p>
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:pl-72">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !saving && setModalOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                  {editando ? 'Editar' : 'Crear'} Usuario
                </p>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">
                  {editando ? (editando.nombre_completo || editando.username) : 'Nuevo Usuario'}
                </h3>
              </div>
              <button onClick={() => !saving && setModalOpen(false)}
                className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Nombre *</label>
                  <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Ej: Roberto" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Apellido *</label>
                  <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Ej: Sánchez" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@infocampus.edu.ec" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Username *</label>
                  <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Ej: roberto.sanchez" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Cédula</label>
                  <input type="text" value={form.cedula} onChange={e => setForm(p => ({ ...p, cedula: e.target.value }))} placeholder="0123456789" maxLength={10} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Contraseña {editando ? '(dejar vacío para no cambiar)' : '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder={editando ? 'Nueva contraseña (opcional)' : 'Contraseña segura'}
                    className={`${inputCls} pr-12`}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Rol *</label>
                  <select value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))} className={selectCls}>
                    {ROLES_DISPONIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="0999 123 456" autoComplete="off" className={inputCls} />
                </div>
              </div>
              {editando && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">Usuario Activo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${form.activo ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.activo ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => !saving && setModalOpen(false)} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !form.first_name || !form.last_name || !form.email || (!editando && !form.password)}
                className="flex-1 py-3 rounded-xl text-sm font-black uppercase text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : (editando ? 'Guardar Cambios' : 'Crear Usuario')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <NotifModal
        isOpen={notif.open}
        onClose={() => setNotif(p => ({ ...p, open: false }))}
        titulo={notif.titulo}
        mensaje={notif.mensaje}
        tipo={notif.tipo}
      />
    </div>
  );
};

export default UsuariosPage;