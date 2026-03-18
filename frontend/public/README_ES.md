# InfoCampus ERP

**ERP académico y financiero full-stack para instituciones educativas**

---

## Transparencia sobre el desarrollo

**Este proyecto fue desarrollado con asistencia de IA** para la escritura de código. La IA actuó como asistente. El desarrollador (Arin Romero) definió la arquitectura, tomó las decisiones técnicas, gestionó el proyecto y supervisó el trabajo. La IA es una herramienta; el ownership del producto es del desarrollador.

---

## Sobre el proyecto

**InfoCampus ERP** es un ERP full-stack para instituciones educativas: inscripciones, notas, pagos, becas e informes financieros.

- **6 roles:** Director, Coordinador, Profesor, Estudiante, Tesorero, Secretaría — cada uno con dashboards y permisos adaptados.

- **Stack:** FastAPI (Python async), React 19, PostgreSQL, JWT, RBAC, informes PDF y chatbot IA. Desplegado en Render + Vercel con Supabase.

- **Desarrollado por un solo desarrollador.**

- **Código:** Estructura modular, componentes compartidos, design tokens.

**Tech:** Python · FastAPI · React · PostgreSQL · JWT · RBAC · Tailwind · Vite · Framer Motion

---

## Desarrollador

**Arin Romero** · Desarrollador

📧 ariin.romeror@gmail.com · 💼 [LinkedIn](https://www.linkedin.com/in/arin-romero-606661129) · 🐙 [GitHub](https://github.com/ariinromeror)

---

# Documentación técnica completa

## Arquitectura

### Tech Stack

| Capa | Tecnología |
|------|------------|
| **Backend** | FastAPI 0.115+ · Python 3.11+ |
| **Frontend** | React 19 · Vite 7 · Tailwind CSS 4 |
| **Base de datos** | PostgreSQL 15 (Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **PDFs** | ReportLab |
| **IA** | Groq API (chatbot Eva, llama-3.3-70b-versatile) |

### Estructura del proyecto

```
infocampus-erp/
├── backend/
│   ├── main.py                 # FastAPI, CORS, routers, health
│   ├── config.py               # Settings (JWT, DB, GROQ)
│   ├── database.py             # asyncpg pool (statement_cache_size=0 para pgbouncer)
│   ├── auth/
│   │   ├── dependencies.py     # RBAC, get_current_user, require_roles
│   │   ├── jwt_handler.py      # JWT create/decode/revoke
│   │   └── schemas.py
│   ├── routers/                # 14 routers
│   ├── services/
│   │   ├── pdf_generator.py    # Reportes PDF
│   │   └── calculos_financieros.py
│   └── migrations/
│       └── 001_revoked_tokens.sql
├── frontend/
│   └── src/
│       ├── config/sidebarNav.js
│       ├── constants/uiTokens.js
│       ├── context/AuthContext.jsx
│       ├── components/         # ChatIA, ErrorBoundary, shared/
│       ├── layouts/
│       ├── pages/              # director, coordinador, tesorero, profesor, estudiante, secretaria
│       └── services/           # api, academicoService, tesoreroService, etc.
├── scripts_db/
│   ├── populate.py            # Población de BD
│   └── credenciales_*.txt
└── docs/
    └── DEPLOY.md
```

---

## Base de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Usuarios (rol, carrera_id, es_becado, porcentaje_beca, convenio_activo) |
| `carreras` | Carreras (nombre, créditos, precio_credito, dias_gracia_pago) |
| `periodos_lectivos` | Ciclos académicos (nombre, codigo, fecha_inicio, fecha_fin, activo) |
| `materias` | Materias (nombre, codigo, creditos, semestre, carrera_id) |
| `prerequisitos` | Prerrequisitos entre materias |
| `secciones` | Secciones (materia_id, periodo_id, docente_id, codigo, cupo_maximo, aula, horario JSONB) |
| `pagos` | Pagos (estudiante_id, monto, fecha_pago, metodo_pago, estado, periodo_id) |
| `inscripciones` | Inscripciones (estudiante_id, seccion_id, pago_id, nota_final, estado) |
| `historial_notas` | Historial de correcciones de notas |
| `evaluaciones_parciales` | Evaluaciones parciales por inscripción |
| `asistencias` | Asistencias (inscripcion_id, fecha, estado, observaciones) |
| `audit_logs` | Auditoría (usuario_id, accion, tabla_afectada, detalles) |
| `configuracion_ia` | Configuración del chatbot |
| `revoked_tokens` | Tokens JWT revocados |

---

## API (Backend)

### Routers y endpoints

| Router | Prefijo | Endpoints principales |
|--------|---------|----------------------|
| **auth** | `/api/auth` | POST /login, POST /logout, GET /perfil, GET /verify |
| **dashboards** | `/api/dashboards` | GET /institucional, /finanzas, /profesor, /resumen |
| **inscripciones** | `/api/inscripciones` | PUT /{id}/nota, GET /seccion/{id}/notas, GET /estudiante/mis-inscripciones |
| **estudiantes** | `/api/estudiantes` | POST /{id}/registrar-pago, GET /{id}, GET /{id}/estado-cuenta |
| **periodos** | `/api/periodos` | POST /cerrar-ciclo, GET /activo, GET /{id}/estadisticas |
| **reportes** | `/api/reportes` | GET /inscripcion/{id}, /estado-cuenta/{id}, /tesoreria, /notas/{id} |
| **estudiante_dashboard** | `/api/estudiante` | GET /{id}/dashboard-summary, /notas, /asistencias, /pagos |
| **estudiante_routes** | `/api/estudiante` | GET /{id}/horario |
| **tesorero** | `/api/tesorero` | GET /resumen-kpis, /pagos, /estudiantes-mora, /ingresos-por-periodo, POST /becas/{id} |
| **profesor** | `/api/profesor` | GET /{id}/secciones, /{id}/seccion/{id}/alumnos, POST /asistencia, POST /evaluacion |
| **academico** | `/api/academico` | CRUD carreras, materias, secciones, periodos, GET /estudiantes, /profesores |
| **administrativo** | `/api/administrativo` | POST /inscribir-estudiante, CRUD usuarios, POST /primera-matricula |
| **ia** | `/api/ia` | GET /contexto, POST /chat |
| **director** | `/api/director` | GET /historial-notas, /configuracion, PUT /configuracion/{clave} |

**Prefijo global:** `/api` · Docs: `/docs` · OpenAPI: `/openapi.json`

---

## Autenticación y seguridad

- **JWT:** Tokens con expiración de 60 minutos
- **RBAC:** Permission checks en cada endpoint (`require_roles`)
- **Roles:** estudiante, profesor, coordinador, director, tesorero, administrativo, admin
- **Rate limiting:** 5 intentos/min en login (SlowAPI)
- **Revoked tokens:** Tabla para logout
- **CORS:** Configure `ALLOWED_ORIGINS` en producción

---

## Módulos por rol

| Rol | Funcionalidades principales |
|-----|-----------------------------|
| **Director** | Dashboard institucional, estadísticas, periodos, carreras, materias, secciones, estudiantes, profesores, finanzas, becas, reportes, auditoría, config |
| **Coordinador** | Dashboard académico, carreras, materias, secciones, periodos, horarios, inscripciones, becas |
| **Profesor** | Dashboard, secciones asignadas, libreta de notas, evaluaciones, asistencia, analytics |
| **Estudiante** | Dashboard personal, horario, notas, evaluaciones, asistencia, pagos, documentos |
| **Tesorero** | Dashboard financiero, búsqueda estudiante, cobro pagos, mora, becas, tarifas, reportes ingresos, certificados |
| **Secretaría** | Dashboard, primera inscripción, reinscripción, estudiantes, secciones, usuarios |

---

## Servicios

| Servicio | Archivo | Funciones |
|----------|---------|-----------|
| **PDF** | `backend/services/pdf_generator.py` | `generar_estado_cuenta`, `generar_certificado_inscripcion`, `generar_acta_notas_seccion`, `generar_boletin_notas`, `generar_reporte_recaudacion`, `generar_recibo_pago_individual`, `generar_historial_academico` |
| **Cálculos financieros** | `backend/services/calculos_financieros.py` | `calcular_en_mora`, `calcular_deuda_total`, `calcular_deuda_vencida`, `calcular_costo_materia` |
| **IA (chatbot Eva)** | `backend/routers/ia_context.py` | Contexto por rol, integración Groq API |

---

## Setup local

### Requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL (o Supabase)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Editar credenciales
uvicorn main:app --reload
```

API: `http://127.0.0.1:8000` · Docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL si es necesario
npm run dev
```

App: `http://localhost:5173`

---

## Variables de entorno

### Backend

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL |
| `SECRET_KEY_AUTH` | Clave secreta JWT |
| `ALLOWED_ORIGINS` | Orígenes CORS (separados por coma) |
| `GROQ_API_KEY` | (Opcional) Clave Groq para chatbot Eva |

### Frontend

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend (ej. `http://127.0.0.1:8000/api`) |

---

## Despliegue

- **Backend:** Render (Gunicorn + Uvicorn workers)
- **Frontend:** Vercel (Vite)
- **Base de datos:** PostgreSQL 15 (Supabase)

**Nota:** Render free tier entra en sleep tras ~15 min inactivo. La primera petición puede tardar 30–60 s.

---

## Implementación clave

- **asyncpg + pgbouncer:** `statement_cache_size=0` en `database.py` para compatibilidad con Supabase
- **Design tokens:** `frontend/src/constants/uiTokens.js` para UX consistente
- **Componentes compartidos:** `StatCard`, `DashboardHero`, `SkeletonGrid`, `EmptyState`
- **Migración:** `001_revoked_tokens.sql` se aplica al arrancar el backend (`main.py` lifespan)

---

Desarrollado con FastAPI + React
