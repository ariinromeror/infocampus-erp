# InfoCampus ERP

**ERP académico y financiero full-stack para instituciones educativas**

---

## Para reclutadores y responsables de contratación

**InfoCampus ERP** es un sistema empresarial full-stack listo para producción, desarrollado desde cero para gestionar el ciclo completo de una institución educativa: inscripciones, notas, pagos, becas e informes financieros.

### Por qué destaca este proyecto

- **Alcance real:** 6 roles de usuario (Director, Coordinador, Profesor, Estudiante, Tesorero, Secretaría), cada uno con dashboards, flujos y permisos adaptados. No es una app de juguete—modela la complejidad de un ERP universitario real.

- **Stack moderno y orientado a producción:** FastAPI (Python async), React 19, PostgreSQL, autenticación JWT, RBAC, informes PDF y chatbot IA. Desplegado en Render + Vercel con Supabase como base de datos.

- **Ownership end-to-end:** Arquitectura, API backend, UI frontend, diseño de base de datos, lógica financiera (mora, becas, planes de pago) y despliegue—todo implementado por un solo desarrollador.

- **Código limpio y mantenible:** Estructura modular, componentes compartidos, design tokens para UX consistente entre roles y separación clara de responsabilidades.

Si buscas un desarrollador que pueda entregar productos full-stack y asumir todo el pipeline—desde requisitos hasta despliegue—este proyecto lo demuestra.

**Tech highlights:** Python · FastAPI · React · PostgreSQL · JWT · RBAC · Tailwind CSS · Vite · Framer Motion

---

## Desarrollador

**Arin Romero** · Desarrollador Full-Stack · Especialista en Python

📧 ariin.romeror@gmail.com · 💼 [LinkedIn](https://linkedin.com/in/yourprofile) · 🐙 [GitHub](https://github.com/ariinromeror)

---

## Resumen técnico

### Tech Stack

| Capa | Tecnología |
|------|------------|
| **Backend** | FastAPI 0.115+ · Python 3.11+ |
| **Frontend** | React 19 · Vite 7 · Tailwind CSS 4 |
| **Base de datos** | PostgreSQL (Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **PDFs** | ReportLab |
| **IA** | Groq API (chatbot Eva) |

### Módulos por rol

| Rol | Funcionalidades principales |
|-----|-----------------------------|
| **Director** | Dashboard institucional, estadísticas, periodos, carreras, materias, secciones, estudiantes, profesores, finanzas, becas, reportes, auditoría, config |
| **Coordinador** | Dashboard académico, carreras, materias, secciones, periodos, horarios, inscripciones, becas |
| **Profesor** | Dashboard, secciones asignadas, libreta de notas, evaluaciones, asistencia, analytics |
| **Estudiante** | Dashboard personal, horario, notas, evaluaciones, asistencia, pagos, documentos |
| **Tesorero** | Dashboard financiero, búsqueda estudiante, cobro pagos, mora, becas, tarifas, reportes ingresos, certificados |
| **Secretaría** | Dashboard, primera inscripción, reinscripción, estudiantes, secciones, usuarios |

---

## Despliegue

- **Backend:** Render (FastAPI + Gunicorn)
- **Frontend:** Vercel (Vite)
- **Base de datos:** PostgreSQL 15 (Supabase)

---

Desarrollado con FastAPI + React
