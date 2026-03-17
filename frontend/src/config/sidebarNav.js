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
          { path: '/director/estudiantes', icon: Users,         label: 'Estudiantes' },
          { path: '/director/profesores',  icon: GraduationCap, label: 'Profesores' },
          { path: '/director/usuarios',    icon: UserCog,       label: 'Usuarios' },
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
          { path: '/coordinador/carreras',      icon: GraduationCap, label: 'Carreras' },
          { path: '/coordinador/materias',      icon: BookOpen,      label: 'Materias' },
          { path: '/coordinador/secciones',     icon: FolderKanban,  label: 'Secciones' },
          { path: '/coordinador/periodos',      icon: Calendar,      label: 'Períodos' },
          { path: '/coordinador/horarios',      icon: Clock,         label: 'Horarios' },
        ],
      },
      {
        label: 'Gestión',
        items: [
          { path: '/coordinador/estudiantes',   icon: Users,         label: 'Estudiantes' },
          { path: '/coordinador/profesores',    icon: UserCog,       label: 'Profesores' },
          { path: '/coordinador/inscripciones', icon: ClipboardList, label: 'Inscripciones' },
          { path: '/coordinador/becas',         icon: Award,         label: 'Becas' },
        ],
      },
      {
        label: 'Reportes',
        items: [
          { path: '/coordinador/reportes', icon: FileText, label: 'Reportes' },
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
          { path: '/secretaria/estudiantes', icon: Users,    label: 'Estudiantes' },
          { path: '/secretaria/secciones',   icon: BookOpen, label: 'Secciones' },
          { path: '/secretaria/mallas',      icon: BookOpen, label: 'Mallas' },
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
