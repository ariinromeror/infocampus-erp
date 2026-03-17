# Refactor Visual Completo — InfoCampus ERP

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminar los 6 sidebars duplicados reemplazándolos por un `UniversalSidebar`, crear un `DashboardHero` para unificar el estilo oscuro/cristal en todos los dashboards, garantizar la tabla `revoked_tokens` en producción, y corregir errores de CSS y props.

**Architecture:** `UniversalSidebar` lee la config de navegación desde `src/config/sidebarNav.js` (una sola fuente de verdad). `DashboardHero` es un bloque de presentación reutilizable con fondo oscuro y efecto de cristal, que cada dashboard monta encima de su contenido específico. El backend recibe una migración SQL idempotente que garantiza `revoked_tokens`.

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4 (`@tailwindcss/postcss`), Framer Motion 12, React Router DOM 7, FastAPI + asyncpg (PostgreSQL/Supabase).

---

## Contexto importante

- Proyecto en: `c:\Users\ArinRomero\Desktop\infocampus_erp\infocampus-erp\`
- Frontend en: `frontend/`
- Backend en: `backend/`
- Scripts DB en: `scripts_db/`
- Tailwind v4: configuración vía CSS (`@import "tailwindcss"`), NO usa `@tailwind base/components/utilities`
- Los sidebars actuales están en `frontend/src/pages/<rol>/<Rol>Sidebar.jsx`
- `MainLayout` inyecta `isOpen` y `onClose` al sidebar vía `React.cloneElement`
- `StatCard` ya acepta tanto `title`/`value` como `titulo`/`valor` — NO está roto

---

## Task 1: Instalar tailwindcss-animate + corregir CSS

**Problema:** `MainLayout` usa `animate-in fade-in zoom-in-95 fill-mode-both` y `BlockedScreen` usa `animate-in fade-in zoom-in`. Sin `tailwindcss-animate` estas clases no generan CSS y el contenido puede quedar invisible durante el render inicial.

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

**Step 1: Instalar tailwindcss-animate**

```bash
cd c:\Users\ArinRomero\Desktop\infocampus_erp\infocampus-erp\frontend
npm install tailwindcss-animate
```

Expected: `tailwindcss-animate` aparece en `dependencies` de `package.json`.

**Step 2: Registrar el plugin en tailwind.config.js**

Reemplazar el contenido de `frontend/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
```

**Step 3: Limpiar index.css — quitar theme() de v3**

Reemplazar el bloque `:root` en `frontend/src/index.css`. Las llamadas `theme('colors.slate.900')` son sintaxis v3 que puede generar warnings en v4. Usar valores CSS directos:

```css
@import "tailwindcss";

/* Design System — InfoCampus ERP */
:root {
  --color-text-primary:    #0f172a;
  --color-text-secondary:  #64748b;
  --color-text-muted:      #94a3b8;
  --color-accent:          #4f46e5;
  --color-accent-hover:    #4338ca;
  --color-accent-muted:    #6366f1;
  --color-border:          #e2e8f0;
  --color-border-light:    #f1f5f9;
  --color-bg-card:         #ffffff;
  --color-bg-muted:        #f8fafc;

  --font-sans: ui-sans-serif, system-ui, sans-serif, "Segoe UI", Roboto, sans-serif;
  --radius-sm:  0.5rem;
  --radius-md:  0.75rem;
  --radius-lg:  1rem;
  --radius-xl:  1.25rem;
  --radius-2xl: 1.5rem;
}

/* Scrollbar personalizada */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 99px; }
```

**Step 4: Corregir lang en index.html**

En `frontend/index.html`, cambiar `<html lang="en">` a `<html lang="es">`.

---

## Task 2: Crear sidebarNav.js — fuente de verdad de navegación

**Problema:** La config de navegación está duplicada en 6 archivos sidebar. Centralizar en un solo archivo.

**Files:**
- Create: `frontend/src/config/sidebarNav.js`

**Step 1: Crear el archivo con toda la nav**

```js
// frontend/src/config/sidebarNav.js
import {
  LayoutDashboard, TrendingUp, Calendar, GraduationCap,
  BookOpen, Eye, Clock, ClipboardList, Award,
  Users, UserCog, CreditCard, AlertTriangle, DollarSign,
  BarChart2, Shield, Settings, FileText, Receipt,
  BadgeCheck, History, LogOut, Search, ShieldCheck,
  BarChart3, FileCheck, FolderKanban, CheckSquare,
  Star, TableProperties, CalendarCheck2, UserSearch,
  BookOpenCheck, CheckCircle2, LibraryBig,
  BadgeDollarSign, FileDown, CalendarClock, RefreshCw,
} from 'lucide-react';

export const SIDEBAR_NAV = {
  director: {
    roleLabel: 'Dirección',
    sections: [
      {
        label: 'Principal',
        items: [
          { path: '/director/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/director/estadisticas', icon: TrendingUp,      label: 'Estadísticas' },
        ],
      },
      {
        label: 'Académico',
        items: [
          { path: '/director/periodos',      icon: Calendar,      label: 'Períodos' },
          { path: '/director/carreras',      icon: GraduationCap, label: 'Carreras' },
          { path: '/director/materias',      icon: BookOpen,      label: 'Materias' },
          { path: '/director/secciones',     icon: Eye,           label: 'Secciones' },
          { path: '/director/horarios',      icon: Clock,         label: 'Horarios' },
          { path: '/director/inscripciones', icon: ClipboardList, label: 'Inscripciones' },
          { path: '/director/notas',         icon: Award,         label: 'Notas' },
        ],
      },
      {
        label: 'Personas',
        items: [
          { path: '/director/estudiantes', icon: Users,   label: 'Estudiantes' },
          { path: '/director/profesores',  icon: GraduationCap, label: 'Profesores' },
          { path: '/director/usuarios',    icon: UserCog, label: 'Usuarios' },
        ],
      },
      {
        label: 'Finanzas',
        items: [
          { path: '/director/cobrar',    icon: CreditCard,    label: 'Cobrar' },
          { path: '/director/mora',      icon: AlertTriangle, label: 'Mora' },
          { path: '/director/pagos',     icon: DollarSign,    label: 'Pagos' },
          { path: '/director/ingresos',  icon: BarChart2,     label: 'Ingresos' },
          { path: '/director/becas',     icon: Award,         label: 'Becas' },
          { path: '/director/convenios', icon: Shield,        label: 'Convenios' },
          { path: '/director/tarifas',   icon: Settings,      label: 'Tarifas' },
        ],
      },
      {
        label: 'Reportes',
        items: [
          { path: '/director/reportes',       icon: FileText,   label: 'Reportes PDF' },
          { path: '/director/estados-cuenta', icon: Receipt,    label: 'Estados Cuenta' },
          { path: '/director/certificados',   icon: BadgeCheck, label: 'Certificados' },
        ],
      },
      {
        label: 'Sistema',
        items: [
          { path: '/director/auditoria',     icon: History,  label: 'Auditoría Notas' },
          { path: '/director/configuracion', icon: Settings, label: 'Configuración' },
        ],
      },
    ],
  },

  coordinador: {
    roleLabel: 'Coordinación',
    sections: [
      {
        label: 'Principal',
        items: [
          { path: '/coordinador/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ],
      },
      {
        label: 'Gestión Académica',
        items: [
          { path: '/coordinador/carreras',     icon: GraduationCap, label: 'Carreras' },
          { path: '/coordinador/materias',     icon: BookOpen,      label: 'Materias' },
          { path: '/coordinador/secciones',    icon: FolderKanban,  label: 'Secciones' },
          { path: '/coordinador/periodos',     icon: Calendar,      label: 'Períodos' },
          { path: '/coordinador/horarios',     icon: Clock,         label: 'Horarios' },
        ],
      },
      {
        label: 'Gestión',
        items: [
          { path: '/coordinador/estudiantes',  icon: Users,         label: 'Estudiantes' },
          { path: '/coordinador/profesores',   icon: UserCog,       label: 'Profesores' },
          { path: '/coordinador/inscripciones',icon: ClipboardList, label: 'Inscripciones' },
          { path: '/coordinador/becas',        icon: Award,         label: 'Becas' },
        ],
      },
      {
        label: 'Reportes',
        items: [
          { path: '/coordinador/reportes',  icon: FileText, label: 'Reportes' },
        ],
      },
      {
        label: 'Administrativo',
        items: [
          { path: '/coordinador/usuarios', icon: UserCog, label: 'Usuarios' },
        ],
      },
    ],
  },

  tesorero: {
    roleLabel: 'Tesorería',
    sections: [
      {
        label: 'Menú Principal',
        items: [
          { path: '/tesorero/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/tesorero/estudiante', icon: Search,          label: 'Buscar Estudiante' },
          { path: '/tesorero/mora',       icon: AlertTriangle,   label: 'Lista de Mora' },
          { path: '/tesorero/pagos',      icon: Receipt,         label: 'Historial Pagos' },
        ],
      },
      {
        label: 'Gestión',
        items: [
          { path: '/tesorero/convenios', icon: ShieldCheck,   label: 'Convenios de Pago' },
          { path: '/tesorero/becas',     icon: GraduationCap, label: 'Gestión de Becas' },
          { path: '/tesorero/tarifas',   icon: Settings,      label: 'Configurar Tarifas' },
        ],
      },
      {
        label: 'Reportes',
        items: [
          { path: '/tesorero/ingresos',       icon: BarChart3,  label: 'Ingresos por Período' },
          { path: '/tesorero/reportes',       icon: FileText,   label: 'Reportes PDF' },
          { path: '/tesorero/estados-cuenta', icon: FileCheck,  label: 'Estados de Cuenta' },
          { path: '/tesorero/certificados',   icon: FileText,   label: 'Certificados' },
        ],
      },
    ],
  },

  secretaria: {
    roleLabel: 'Secretaría',
    showUserName: true,
    sections: [
      {
        label: null,
        items: [
          { path: '/secretaria/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ],
      },
      {
        label: 'Acciones',
        items: [
          { path: '/secretaria/primera-matricula', icon: DollarSign,    label: 'Primera Matrícula' },
          { path: '/secretaria/reinscripcion',     icon: RefreshCw,     label: 'Re-inscripción' },
          { path: '/secretaria/inscripciones',     icon: ClipboardList, label: 'Inscripciones' },
        ],
      },
      {
        label: 'Directorio',
        items: [
          { path: '/secretaria/estudiantes', icon: Users,   label: 'Estudiantes' },
          { path: '/secretaria/secciones',   icon: BookOpen,label: 'Secciones' },
          { path: '/secretaria/mallas',      icon: BookOpen,label: 'Mallas' },
        ],
      },
    ],
  },

  profesor: {
    roleLabel: 'Docente',
    sections: [
      {
        label: 'Menú Principal',
        items: [
          { path: '/profesor/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/profesor/secciones',    icon: BookOpen,        label: 'Mis Secciones' },
          { path: '/profesor/asistencia',   icon: CheckSquare,     label: 'Pasar Lista' },
          { path: '/profesor/evaluaciones', icon: Star,            label: 'Evaluaciones' },
        ],
      },
      {
        label: 'Herramientas',
        items: [
          { path: '/profesor/libro',                icon: TableProperties, label: 'Libro de Notas' },
          { path: '/profesor/analiticas',           icon: BarChart3,       label: 'Analíticas' },
          { path: '/profesor/asistencia-historica', icon: CalendarCheck2,  label: 'Asistencia Hist.' },
          { path: '/profesor/alumnos',              icon: UserSearch,      label: 'Perfil Alumno' },
        ],
      },
    ],
  },

  estudiante: {
    roleLabel: 'Estudiante',
    showUserName: true,
    sections: [
      {
        label: null,
        items: [
          { path: '/estudiante/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/estudiante/horario',     icon: CalendarClock,   label: 'Mi Horario' },
          { path: '/estudiante/notas',       icon: BookOpenCheck,   label: 'Mis Notas' },
          { path: '/estudiante/asistencia',  icon: CheckCircle2,    label: 'Asistencia' },
          { path: '/estudiante/materias',    icon: LibraryBig,      label: 'Mis Materias' },
        ],
      },
      {
        label: 'Mi Cuenta',
        items: [
          { path: '/estudiante/evaluaciones', icon: ClipboardList,   label: 'Evaluaciones' },
          { path: '/estudiante/pagos',        icon: BadgeDollarSign, label: 'Pagos' },
          { path: '/estudiante/estatus',      icon: ShieldCheck,     label: 'Estatus' },
          { path: '/estudiante/documentos',   icon: FileDown,        label: 'Documentos' },
        ],
      },
    ],
  },
};
```

---

## Task 3: Crear UniversalSidebar.jsx

**Problema:** 6 archivos de sidebar con código casi idéntico. Uno reemplaza a todos.

**Files:**
- Create: `frontend/src/components/UniversalSidebar.jsx`

**Step 1: Crear el componente**

```jsx
// frontend/src/components/UniversalSidebar.jsx
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SIDEBAR_NAV } from '../config/sidebarNav';

const NavItem = ({ item, onClose }) => (
  <NavLink
    to={item.path}
    onClick={() => window.innerWidth < 1024 && onClose?.()}
    className={({ isActive }) =>
      `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 translate-x-1'
          : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
      }`
    }
  >
    <item.icon
      size={18}
      strokeWidth={1.5}
      className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
    />
    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">{item.label}</span>
  </NavLink>
);

const NavSection = ({ section, onClose }) => (
  <div className="my-2 px-2">
    {section.label && (
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 px-3 mb-2 opacity-50">
        {section.label}
      </p>
    )}
    <div className="flex flex-col gap-1">
      {section.items.map(item => (
        <NavItem key={item.path} item={item} onClose={onClose} />
      ))}
    </div>
  </div>
);

const UniversalSidebar = ({ role, isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const config = SIDEBAR_NAV[role];

  if (!config) return null;

  const nombre = user?.nombre?.split(' ').slice(0, 2).join(' ') || '—';

  return (
    <>
      {/* Overlay móvil */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 lg:hidden transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#0f172a] flex flex-col border-r border-white/5
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-72'}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-500/30 flex-shrink-0">
              IC
            </div>
            <span className="font-black italic text-white tracking-tighter uppercase text-lg">
              InfoCampus
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Badge de rol + nombre (solo si showUserName) */}
        {config.showUserName && (
          <div className="px-8 py-4 border-b border-white/5 flex-shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 opacity-50">
              {config.roleLabel}
            </p>
            <p className="text-sm font-black italic text-white uppercase tracking-tight truncate">
              {nombre}
            </p>
          </div>
        )}

        {/* Navegación */}
        <nav
          className="flex-1 py-6 px-2 flex flex-col overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {config.sections.map((section, i) => (
            <NavSection key={i} section={section} onClose={onClose} />
          ))}
        </nav>

        {/* Logout */}
        <div className="p-6 border-t border-white/5 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-2xl transition-all duration-300 group"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default UniversalSidebar;
```

---

## Task 4: Actualizar los *App.jsx para usar UniversalSidebar

**Archivos a modificar:** Los 6 `*App.jsx`. El patrón es el mismo: reemplazar el import del sidebar específico por `UniversalSidebar` y pasarle la prop `role`.

**Files:**
- Modify: `frontend/src/pages/director/DirectorApp.jsx`
- Modify: `frontend/src/pages/coordinador/CoordinadorApp.jsx`
- Modify: `frontend/src/pages/tesorero/TesoreroApp.jsx`
- Modify: `frontend/src/pages/secretaria/SecretariaApp.jsx`
- Modify: `frontend/src/pages/profesor/ProfesorApp.jsx`
- Modify: `frontend/src/pages/estudiante/EstudianteApp.jsx`

**Step 1: DirectorApp.jsx** — Cambiar:
```jsx
// QUITAR:
import DirectorSidebar from './DirectorSidebar';
// AÑADIR:
import UniversalSidebar from '../../components/UniversalSidebar';
```
Y cambiar `<MainLayout sidebar={<DirectorSidebar />}>` por:
```jsx
<MainLayout sidebar={<UniversalSidebar role="director" />}>
```

**Step 2: CoordinadorApp.jsx** — Igual:
```jsx
import UniversalSidebar from '../../components/UniversalSidebar';
// ...
<MainLayout sidebar={<UniversalSidebar role="coordinador" />}>
```

**Step 3: TesoreroApp.jsx**
```jsx
import UniversalSidebar from '../../components/UniversalSidebar';
// ...
<MainLayout sidebar={<UniversalSidebar role="tesorero" />}>
```

**Step 4: SecretariaApp.jsx**
```jsx
import UniversalSidebar from '../../components/UniversalSidebar';
// ...
<MainLayout sidebar={<UniversalSidebar role="secretaria" />}>
```

**Step 5: ProfesorApp.jsx**
```jsx
import UniversalSidebar from '../../components/UniversalSidebar';
// ...
<MainLayout sidebar={<UniversalSidebar role="profesor" />}>
```

**Step 6: EstudianteApp.jsx**
```jsx
import UniversalSidebar from '../../components/UniversalSidebar';
// ...
<MainLayout sidebar={<UniversalSidebar role="estudiante" />}>
```

---

## Task 5: Eliminar los 6 archivos sidebar obsoletos

**Files a eliminar:**
- `frontend/src/pages/director/DirectorSidebar.jsx`
- `frontend/src/pages/coordinador/CoordinadorSidebar.jsx`
- `frontend/src/pages/tesorero/TesoreroSidebar.jsx`
- `frontend/src/pages/secretaria/SecretariaSidebar.jsx`
- `frontend/src/pages/profesor/ProfesorSidebar.jsx`
- `frontend/src/pages/estudiante/EstudianteSidebar.jsx`

**Step 1:** Verificar que el build compila sin errores antes de borrar.
**Step 2:** Borrar los 6 archivos. Si hay imports restantes, el build fallará y guiará qué corregir.

---

## Task 6: Crear DashboardHero.jsx — componente de banner oscuro

**Problema:** Director y Tesorero tienen un banner oscuro elegante. Coordinador, Secretaría y Profesor no. Crear un componente reutilizable.

**Files:**
- Create: `frontend/src/components/DashboardHero.jsx`

**Step 1: Crear el componente**

```jsx
// frontend/src/components/DashboardHero.jsx
import { motion } from 'framer-motion';

/**
 * DashboardHero — Banner oscuro con efecto cristal para cabeceras de dashboards.
 * Props:
 *   - greeting: string   — "Hola, María"
 *   - subtitle: string   — "Panel de Coordinación — Período 2026-I"
 *   - badge: string      — texto del badge superior (ej. "Panel Académico")
 *   - accentColor: string — color Tailwind para el badge y decoraciones (default: 'indigo')
 *   - actions: ReactNode — botones de acción (optional)
 */
const DashboardHero = ({
  greeting,
  subtitle,
  badge,
  accentColor = 'indigo',
  actions = null,
}) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="relative bg-slate-900 rounded-2xl p-8 sm:p-10 text-white overflow-hidden"
  >
    {/* Decoraciones de fondo */}
    <div className="absolute -right-8 -top-8 w-48 h-48 bg-indigo-600/10 rounded-full pointer-events-none" />
    <div className="absolute right-24 bottom-0 w-24 h-24 bg-indigo-500/5 rounded-full pointer-events-none" />

    <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
      <div>
        {badge && (
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">
            {badge}
          </p>
        )}
        <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter leading-none mb-3">
          {greeting}
        </h1>
        {subtitle && (
          <p className="text-slate-400 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  </motion.div>
);

export default DashboardHero;
```

---

## Task 7: Aplicar DashboardHero al Dashboard del Coordinador

**Files:**
- Modify: `frontend/src/pages/coordinador/Dashboard.jsx`

**Step 1:** Añadir el import:
```jsx
import DashboardHero from '../../components/DashboardHero';
```

**Step 2:** Reemplazar el bloque header actual:
```jsx
// QUITAR:
<motion.div variants={item} className="flex flex-col gap-2">
  <h1 className="text-3xl font-bold text-slate-900">
    Hola, <span className="text-indigo-600">{nombre}</span>
  </h1>
  <p className="text-sm text-slate-500 mt-1">
    Panel de Coordinación
    {resumen?.periodo && <span className="ml-2 text-indigo-500">— {resumen.periodo}</span>}
  </p>
</motion.div>

// PONER:
<motion.div variants={item}>
  <DashboardHero
    badge="Panel Académico"
    greeting={`Hola, ${nombre}`}
    subtitle={`Panel de Coordinación${resumen?.periodo ? ` — ${resumen.periodo}` : ''}`}
  />
</motion.div>
```

---

## Task 8: Aplicar DashboardHero al Dashboard de Secretaría

**Files:**
- Modify: `frontend/src/pages/secretaria/SecretariaDashboard.jsx`

**Step 1:** Añadir import:
```jsx
import DashboardHero from '../../components/DashboardHero';
```

**Step 2:** Reemplazar el bloque header:
```jsx
// QUITAR:
<motion.div variants={item} className="flex flex-col gap-2">
  <h1 className="text-3xl font-bold text-slate-900">
    Hola, <span className="text-indigo-600">{nombre}</span>
  </h1>
  <p className="text-sm text-slate-500 mt-1">
    Panel de secretaría
    {periodo?.nombre && <span className="ml-2 text-indigo-500">— {periodo.nombre}</span>}
  </p>
</motion.div>

// PONER:
<motion.div variants={item}>
  <DashboardHero
    badge="Panel de Secretaría"
    greeting={`Hola, ${nombre}`}
    subtitle={`Gestión académica${periodo?.nombre ? ` — ${periodo.nombre}` : ''}`}
  />
</motion.div>
```

---

## Task 9: Aplicar DashboardHero al Dashboard del Tesorero

El `TesoreroDashboard.jsx` ya tiene un header simple (`<h1>` + `<p>`). Actualizarlo para consistencia.

**Files:**
- Modify: `frontend/src/pages/tesorero/TesoreroDashboard.jsx`

**Step 1:** Añadir import:
```jsx
import DashboardHero from '../../components/DashboardHero';
```

**Step 2:** Reemplazar el bloque header (lines ~103-109):
```jsx
// QUITAR:
<div>
  <h1 className="text-3xl font-bold text-slate-800">
    Hola, <span className="text-indigo-600">{nombre}</span>
  </h1>
  <p className="text-sm text-slate-500 mt-1">Panel del período activo</p>
</div>

// PONER:
<DashboardHero
  badge="Panel Financiero"
  greeting={`Hola, ${nombre}`}
  subtitle="Panel del período activo"
/>
```

---

## Task 10: Garantizar tabla revoked_tokens en el backend

**Contexto:** `backend/auth/jwt_handler.py` consulta `public.revoked_tokens` en cada request. Si la tabla no existe en producción (Supabase), el backend falla silenciosamente en modo permisivo. El `scripts_db/populate.py` la crea, pero si la BD se provisiona manualmente puede faltar.

**Files:**
- Create: `backend/migrations/001_revoked_tokens.sql`
- Modify: `backend/main.py` — ejecutar migración al arrancar

**Step 1: Crear el archivo SQL idempotente**

```sql
-- backend/migrations/001_revoked_tokens.sql
-- Idempotente: puede ejecutarse múltiples veces sin error
CREATE TABLE IF NOT EXISTS public.revoked_tokens (
    jti        VARCHAR PRIMARY KEY,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para limpiezas periódicas por fecha
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_revoked_at
    ON public.revoked_tokens (revoked_at);

-- Comentario
COMMENT ON TABLE public.revoked_tokens IS
    'JWTs revocados. El jti (JWT ID) se inserta al hacer logout.';
```

**Step 2: Ejecutar la migración al arrancar FastAPI**

En `backend/main.py`, añadir al evento `startup`:

```python
# Añadir import al top:
import os

# Añadir evento startup (si no existe, crearlo):
@app.on_event("startup")
async def run_migrations():
    """Aplica migraciones SQL idempotentes al arrancar."""
    migration_file = os.path.join(os.path.dirname(__file__), "migrations", "001_revoked_tokens.sql")
    if os.path.exists(migration_file):
        with open(migration_file, "r") as f:
            sql = f.read()
        try:
            async with get_db() as conn:
                await conn.execute(sql)
            logger.info("✅ Migración 001_revoked_tokens aplicada")
        except Exception as e:
            logger.error(f"❌ Error en migración: {e}")
```

Añadir también el import de `get_db` y `logger` si no están ya en `main.py`.

---

## Task 11: Añadir ErrorBoundary por ruta en MainLayout

**Problema:** El `ErrorBoundary` solo está en el nivel de `App`, lo que hace que cualquier error en una página desmonte toda la interfaz (incluyendo el sidebar). Envolverlo en el nivel de `main` para aislar errores por página.

**Files:**
- Modify: `frontend/src/layouts/MainLayout.jsx`

**Step 1:** Importar `ErrorBoundary`:
```jsx
import ErrorBoundary from '../components/ErrorBoundary';
```

**Step 2:** Envolver `{children || <Outlet />}` con `ErrorBoundary`:
```jsx
// ANTES:
<div className="animate-in fade-in zoom-in-95 duration-700 fill-mode-both">
  {children || <Outlet />}
</div>

// DESPUÉS:
<ErrorBoundary>
  <div className="animate-in fade-in zoom-in-95 duration-700 fill-mode-both">
    {children || <Outlet />}
  </div>
</ErrorBoundary>
```

---

## Task 12: Verificación final

**Step 1: Build de producción**
```bash
cd c:\Users\ArinRomero\Desktop\infocampus_erp\infocampus-erp\frontend
npm run build
```
Expected: Build exitoso sin errores. Warning sobre tamaño de chunks es aceptable.

**Step 2: Verificar que no queden imports de sidebars antiguos**
```bash
# En PowerShell:
Select-String -Path "frontend\src\**\*.jsx" -Pattern "DirectorSidebar|CoordinadorSidebar|TesoreroSidebar|SecretariaSidebar|ProfesorSidebar|EstudianteSidebar" -Recurse
```
Expected: 0 resultados.

**Step 3: Verificar que UniversalSidebar es importado correctamente en los 6 App**
```bash
Select-String -Path "frontend\src\pages\**\*App.jsx" -Pattern "UniversalSidebar" -Recurse
```
Expected: 6 resultados (uno por cada *App.jsx).

**Step 4: Verificar DashboardHero en dashboards**
```bash
Select-String -Path "frontend\src\pages\**\*.jsx" -Pattern "DashboardHero" -Recurse
```
Expected: Coordinador, Secretaría, Tesorero (mínimo 3 resultados).

**Step 5: Verificar migración SQL**
```bash
# El archivo debe existir:
Test-Path "backend\migrations\001_revoked_tokens.sql"
```
Expected: `True`

---

## Orden de ejecución recomendado

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10 → Task 11 → Task 12
```

Cada task es independiente excepto:
- Task 4 depende de Task 3 (UniversalSidebar debe existir antes de importarlo)
- Task 5 depende de Task 4 (borrar sidebars solo cuando los App ya no los importan)
- Tasks 7-9 dependen de Task 6 (DashboardHero debe existir)
- Task 12 solo se ejecuta al final
