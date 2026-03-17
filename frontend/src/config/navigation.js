import { 
  LayoutDashboard, BookOpen, Calendar, DollarSign, 
  Clock, FileText, Users, TrendingUp, GraduationCap,
  Award, BarChart3, Briefcase, ClipboardList, 
  UserCheck, Wallet, MapPin, Settings
} from 'lucide-react';

/**
 * CONFIGURACIÓN CENTRALIZADA DE NAVEGACIÓN
 * Cada rol tiene su configuración de menú definida aquí
 */

export const NAVIGATION_CONFIG = {
  estudiante: {
    main: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/estudiante/dashboard',
        icon: LayoutDashboard
      },
      {
        id: 'notas',
        label: 'Mis Notas',
        path: '/estudiante/notas',
        icon: Award
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        path: '/estudiante/asistencia',
        icon: Calendar
      },
      {
        id: 'horarios',
        label: 'Horarios',
        path: '/estudiante/horarios',
        icon: Clock
      },
      {
        id: 'estado-cuenta',
        label: 'Estado de Cuenta',
        path: '/estudiante/estado-cuenta',
        icon: DollarSign,
        badge: (user) => user?.en_mora ? { text: 'Mora', color: 'red' } : null
      }
    ],
    secondary: []
  },

  profesor: {
    main: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/profesor/dashboard',
        icon: LayoutDashboard
      },
      {
        id: 'secciones',
        label: 'Mis Secciones',
        path: '/profesor/secciones',
        icon: Users
      },
      {
        id: 'calificaciones',
        label: 'Calificaciones',
        path: '/profesor/calificaciones',
        icon: ClipboardList
      }
    ],
    secondary: []
  },

  director: {
    main: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/director/dashboard',
        icon: LayoutDashboard
      },
      {
        id: 'estadisticas',
        label: 'Estadísticas',
        path: '/director/estadisticas',
        icon: TrendingUp
      }
    ],
    secondary: []
  },

  coordinador: {
    main: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/coordinador/dashboard',
        icon: LayoutDashboard
      },
      {
        id: 'secciones',
        label: 'Secciones',
        path: '/coordinador/secciones',
        icon: BookOpen
      }
    ],
    secondary: []
  },

  tesorero: {
    main: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/tesorero/dashboard',
        icon: LayoutDashboard
      },
      {
        id: 'validar-pagos',
        label: 'Validar Pagos',
        path: '/tesorero/validar-pagos',
        icon: Wallet
      },
      {
        id: 'morosidad',
        label: 'Morosidad',
        path: '/tesorero/morosidad',
        icon: Users
      }
    ],
    secondary: []
  }
};

export const getNavigationForRole = (role) => {
  return NAVIGATION_CONFIG[role] || NAVIGATION_CONFIG.estudiante;
};