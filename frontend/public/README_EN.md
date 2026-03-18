# InfoCampus ERP

**Full-stack academic & financial ERP for educational institutions**

---

## Development transparency

**This project was developed with AI assistance** for code writing. The AI acted as an assistant. The developer (Arin Romero) defined the architecture, made technical decisions, managed the project, and supervised the work. AI is a tool; the product ownership belongs to the developer.

---

## About this project

**InfoCampus ERP** is a full-stack ERP for educational institutions: enrollments, grades, payments, scholarships, and financial reporting.

- **6 roles:** Director, Coordinator, Professor, Student, Treasurer, Secretary — each with tailored dashboards and permissions.

- **Stack:** FastAPI (async Python), React 19, PostgreSQL, JWT, RBAC, PDF reports, and an AI chatbot. Deployed on Render + Vercel with Supabase.

- **Developed by a single developer.**

- **Code:** Modular structure, shared components, design tokens.

**Tech:** Python · FastAPI · React · PostgreSQL · JWT · RBAC · Tailwind · Vite · Framer Motion

---

## Developer

**Arin Romero** · Developer

📧 ariin.romeror@gmail.com · 💼 [LinkedIn](https://www.linkedin.com/in/arin-romero-606661129) · 🐙 [GitHub](https://github.com/ariinromeror)

---

# Complete technical documentation

## Architecture

### Tech stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI 0.115+ · Python 3.11+ |
| **Frontend** | React 19 · Vite 7 · Tailwind CSS 4 |
| **Database** | PostgreSQL 15 (Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **PDFs** | ReportLab |
| **AI** | Groq API (chatbot Eva, llama-3.3-70b-versatile) |

### Project structure

```
infocampus-erp/
├── backend/
│   ├── main.py                 # FastAPI, CORS, routers, health
│   ├── config.py               # Settings (JWT, DB, GROQ)
│   ├── database.py             # asyncpg pool (statement_cache_size=0 for pgbouncer)
│   ├── auth/
│   │   ├── dependencies.py     # RBAC, get_current_user, require_roles
│   │   ├── jwt_handler.py      # JWT create/decode/revoke
│   │   └── schemas.py
│   ├── routers/                # 14 routers
│   ├── services/
│   │   ├── pdf_generator.py    # PDF reports
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
│   ├── populate.py            # DB population
│   └── credenciales_*.txt
└── docs/
    └── DEPLOY.md
```

---

## Database

### Main tables

| Table | Description |
|-------|-------------|
| `usuarios` | Users (rol, carrera_id, es_becado, porcentaje_beca, convenio_activo) |
| `carreras` | Careers (nombre, créditos, precio_credito, dias_gracia_pago) |
| `periodos_lectivos` | Academic cycles (nombre, codigo, fecha_inicio, fecha_fin, activo) |
| `materias` | Subjects (nombre, codigo, creditos, semestre, carrera_id) |
| `prerequisitos` | Prerequisites between subjects |
| `secciones` | Sections (materia_id, periodo_id, docente_id, codigo, cupo_maximo, aula, horario JSONB) |
| `pagos` | Payments (estudiante_id, monto, fecha_pago, metodo_pago, estado, periodo_id) |
| `inscripciones` | Enrollments (estudiante_id, seccion_id, pago_id, nota_final, estado) |
| `historial_notas` | Grade correction history |
| `evaluaciones_parciales` | Partial evaluations per enrollment |
| `asistencias` | Attendance (inscripcion_id, fecha, estado, observaciones) |
| `audit_logs` | Audit (usuario_id, accion, tabla_afectada, detalles) |
| `configuracion_ia` | Chatbot configuration |
| `revoked_tokens` | Revoked JWT tokens |

---

## API (Backend)

### Routers and endpoints

| Router | Prefix | Main endpoints |
|--------|--------|----------------|
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

**Global prefix:** `/api` · Docs: `/docs` · OpenAPI: `/openapi.json`

---

## Authentication and security

- **JWT:** Tokens with 60-minute expiration
- **RBAC:** Permission checks on every endpoint (`require_roles`)
- **Roles:** estudiante, profesor, coordinador, director, tesorero, administrativo, admin
- **Rate limiting:** 5 attempts/min on login (SlowAPI)
- **Revoked tokens:** Table for logout
- **CORS:** Configure `ALLOWED_ORIGINS` in production

---

## Modules by role

| Role | Key features |
|------|--------------|
| **Director** | Institutional dashboard, stats, periods, careers, subjects, sections, students, professors, finances, scholarships, reports, audit, config |
| **Coordinator** | Academic dashboard, careers, subjects, sections, periods, schedules, enrollments, scholarships |
| **Professor** | Dashboard, assigned sections, grade book, evaluations, attendance, analytics |
| **Student** | Personal dashboard, schedule, grades, evaluations, attendance, payments, documents |
| **Treasurer** | Financial dashboard, search student, collect payments, mora, scholarships, tariffs, income reports, certificates |
| **Secretary** | Dashboard, first enrollment, re-enrollment, students, sections, users |

---

## Services

| Service | File | Functions |
|---------|------|-----------|
| **PDF** | `backend/services/pdf_generator.py` | `generar_estado_cuenta`, `generar_certificado_inscripcion`, `generar_acta_notas_seccion`, `generar_boletin_notas`, `generar_reporte_recaudacion`, `generar_recibo_pago_individual`, `generar_historial_academico` |
| **Financial calculations** | `backend/services/calculos_financieros.py` | `calcular_en_mora`, `calcular_deuda_total`, `calcular_deuda_vencida`, `calcular_costo_materia` |
| **AI (chatbot Eva)** | `backend/routers/ia_context.py` | Context by role, Groq API integration |

---

## Local setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or Supabase)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Edit credentials
uvicorn main:app --reload
```

API: `http://127.0.0.1:8000` · Docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL if needed
npm run dev
```

App: `http://localhost:5173`

---

## Environment variables

### Backend

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL |
| `SECRET_KEY_AUTH` | JWT secret key |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `GROQ_API_KEY` | (Optional) Groq key for chatbot Eva |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (e.g. `http://127.0.0.1:8000/api`) |

---

## Deployment

- **Backend:** Render (Gunicorn + Uvicorn workers)
- **Frontend:** Vercel (Vite)
- **Database:** PostgreSQL 15 (Supabase)

**Note:** Render free tier sleeps after ~15 min idle. First request may take 30–60s to wake.

---

## Key implementation details

- **asyncpg + pgbouncer:** `statement_cache_size=0` in `database.py` for Supabase compatibility
- **Design tokens:** `frontend/src/constants/uiTokens.js` for consistent UX
- **Shared components:** `StatCard`, `DashboardHero`, `SkeletonGrid`, `EmptyState`
- **Migration:** `001_revoked_tokens.sql` applied on backend startup (`main.py` lifespan)

---

Built with FastAPI + React
