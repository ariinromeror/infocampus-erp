/**
 * Contenido para la sección "¿Qué es InfoCampus?" en el modal de proyecto
 */
export const SOBRE_INFOCAMPUS = {
  pitch: 'ERP académico y financiero listo para producción. Gestiona inscripciones, notas, pagos, becas e informes en un solo sistema.',
  porQueDestaca: [
    '6 roles con dashboards y permisos distintos (Director, Coordinador, Profesor, Estudiante, Tesorero, Secretaría)',
    'Stack moderno: FastAPI, React 19, PostgreSQL, JWT, RBAC',
    'Informes PDF, chatbot IA, lógica financiera (mora, becas)',
    'Desarrollado de punta a punta por un solo desarrollador',
  ],
  tech: ['Python', 'FastAPI', 'React', 'PostgreSQL', 'JWT', 'Tailwind', 'Vite', 'Framer Motion'],
  modulosPorRol: [
    { rol: 'Director', features: 'Dashboard institucional, estadísticas, periodos, carreras, materias, secciones, estudiantes, profesores, finanzas, becas, reportes, auditoría, config' },
    { rol: 'Coordinador', features: 'Dashboard académico, carreras, materias, secciones, periodos, horarios, inscripciones, becas' },
    { rol: 'Profesor', features: 'Dashboard, secciones asignadas, libreta de notas, evaluaciones, asistencia, analytics' },
    { rol: 'Estudiante', features: 'Dashboard personal, horario, notas, evaluaciones, asistencia, pagos, documentos' },
    { rol: 'Tesorero', features: 'Dashboard financiero, búsqueda estudiante, cobro pagos, mora, becas, tarifas, reportes ingresos, certificados' },
    { rol: 'Secretaría', features: 'Dashboard, primera inscripción, reinscripción, estudiantes, secciones, usuarios' },
  ],
  desarrollador: {
    nombre: 'Arin Romero',
    rol: 'Full-Stack Developer · Python Specialist',
    email: 'ariin.romeror@gmail.com',
    linkedin: 'https://linkedin.com/in/yourprofile',
    github: 'https://github.com/ariinromeror',
  },
};
