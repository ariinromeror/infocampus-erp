import { useState, useMemo } from 'react';
import { Users, Plus, Pencil } from 'lucide-react';
import useUsuarios from '../hooks/useUsuarios';
import ModalForm from '../components/ModalForm';
import SearchInput from '../../../components/shared/SearchInput';
import EmptyState from '../../../components/shared/EmptyState';
import { SkeletonTable } from '../../../components/shared/Loader';

const ROLES = [
  { value: '', label: 'Todos' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'profesor', label: 'Profesor' },
  { value: 'administrativo', label: 'Administrativo' },
];

const UsuarioRow = ({ usuario, onEdit }) => {
  const iniciales = (usuario.nombre || usuario.nombre_completo || 'U')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const rolLabels = {
    estudiante: 'Estudiante',
    profesor: 'Profesor',
    administrativo: 'Administrativo',
    coordinador: 'Coordinador',
    director: 'Director',
    tesorero: 'Tesorero',
  };

  return (
    <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
      <div className="h-11 w-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-black text-slate-600">{iniciales}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black italic uppercase text-slate-900 truncate">
          {usuario.nombre || usuario.nombre_completo}
        </p>
        <span className="text-[10px] font-medium text-slate-500">{usuario.email || usuario.username}</span>
      </div>
      <span className="px-3 py-1 bg-slate-100 rounded-full text-[11px] font-black uppercase tracking-wider text-slate-600 hidden sm:inline">
        {rolLabels[usuario.rol] || usuario.rol}
      </span>
      <div className="flex items-center gap-1">
        {usuario.activo !== false ? (
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
        ) : (
          <span className="w-2 h-2 bg-slate-300 rounded-full" />
        )}
      </div>
      <button
        onClick={() => onEdit(usuario)}
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
};

const DEMO_PASSWORD = 'campus2026';

const UsuariosPage = () => {
  const { usuarios, loading, crearUsuario, actualizarUsuario } = useUsuarios();
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    cedula: '',
    first_name: '',
    last_name: '',
    email: '',
    rol: 'estudiante',
    carrera_id: '',
    activo: true,
  });

  const handleEdit = (usuario) => {
    setEditando(usuario);
    const nombreCompleto = usuario.nombre || usuario.nombre_completo || '';
    const parts = nombreCompleto.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    setForm({
      cedula: usuario.cedula || '',
      first_name: first,
      last_name: last,
      email: usuario.email || '',
      rol: usuario.rol || 'estudiante',
      carrera_id: usuario.carrera_id || '',
      activo: usuario.activo !== false,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditando(null);
    setForm({ cedula: '', first_name: '', last_name: '', email: '', rol: 'estudiante', carrera_id: '', activo: true });
  };

  const filtrados = useMemo(() => {
    let lista = usuarios.filter(u => ['estudiante', 'profesor', 'administrativo'].includes(u.rol));
    if (filtroRol) {
      lista = lista.filter(u => u.rol === filtroRol);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(u =>
        (u.nombre || u.nombre_completo || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.cedula || '').includes(q)
      );
    }
    return lista;
  }, [usuarios, busqueda, filtroRol]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await actualizarUsuario(editando.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          carrera_id: form.carrera_id ? parseInt(form.carrera_id) : null,
          activo: form.activo,
        });
      } else {
        await crearUsuario({
          cedula: form.cedula,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: DEMO_PASSWORD,
          rol: form.rol,
          carrera_id: form.carrera_id ? parseInt(form.carrera_id) : null,
        });
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">
          {loading ? 'Cargando...' : `${filtrados.length} usuarios visibles`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o email..." />
        </div>
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ROLES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtrados.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {filtrados.map(usuario => (
            <UsuarioRow key={usuario.id} usuario={usuario} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl">
          <EmptyState icon={Users} titulo="Sin usuarios" descripcion="No hay usuarios que coincidan con los filtros" />
        </div>
      )}

      <ModalForm
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editando ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Cédula</label>
              <input
                type="text"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="DNI/NIE/Pasaporte"
                required={!editando}
                disabled={!!editando}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Nombre</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Apellidos</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Apellidos"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ROLES.filter(r => r.value).map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {!editando && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">
                  Contraseña: <span className="font-mono font-semibold">{DEMO_PASSWORD}</span> (portafolio demo)
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              {editando ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </ModalForm>
    </div>
  );
};

export default UsuariosPage;