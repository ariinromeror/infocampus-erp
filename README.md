# 🎓 InfoCampus ERP

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Full-stack academic & financial ERP for educational institutions**

**Live on Render · Vercel · Supabase — Installable as PWA**

[🌐 Live Demo](https://ariinromeror-infocampus-erp.vercel.app/login) · [📖 API Docs](https://infocampus-backend.onrender.com/docs) · [📦 Legacy (Django)](https://github.com/ariinromeror/InfoCampus-Erp-Legacy)

---

> **Personal project · First production deployment · Built from scratch as an autodidact using AI as a development tool.**
>
> Started in February 2025. Fully operational in production.

</div>

---

## 📌 What is InfoCampus ERP?

InfoCampus is a full-stack ERP built for educational institutions. It handles the complete lifecycle of academic management: student enrollment, grades, attendance, financial payments, scholarships, late fees (mora), and institutional reporting.

The system supports **6 independent roles**, each with its own dashboard, navigation, permissions, and workflows — all sharing a single PostgreSQL database with strict RBAC enforced on every API endpoint.

### Why this project exists

This started as a personal challenge: build something real, complex, and functional from zero — without a computer science background. The original version was built with Django. After learning more about async architecture and API design, the entire backend was migrated to **FastAPI with asyncpg**, keeping all features intact and improving performance, maintainability, and deployment flexibility.

This repository is the **FastAPI version**. The Django legacy version is archived at [`infocampus-erp-legacy`](#legacy).

---

## ✨ Key Features

- **6 fully independent role dashboards** — Director, Coordinator, Professor, Student, Treasurer, Secretary
- **Complete academic management** — enrollment, sections, schedules, grades, evaluations, attendance
- **Financial engine** — payments, late fees (mora) with business rules, scholarships, payment plans (convenios), PDF certificates
- **AI chatbot "Eva"** — contextual chatbot powered by Groq API, with real-time access to each student's own academic and financial data
- **PDF report generation** — institutional reports and financial certificates via ReportLab
- **JWT authentication + RBAC** — every endpoint protected, role validation on all routes
- **Rate limiting** — 5 login attempts/minute via SlowAPI
- **Token revocation** — revoked token table with advisory-lock safe migrations
- **PWA (Progressive Web App)** — installable on iOS and Android as a native-like app
- **Deployed to production** — Render (backend) + Vercel (frontend) + Supabase (PostgreSQL)

---

## 📸 Screenshots

### Login & Mobile
| Login | Mobile Login | Mobile Dashboard |
|-------|-------------|-----------------|
| ![Login](https://github.com/user-attachments/assets/88af95a5-cb40-400c-a46b-e5183e190136) | ![Mobile Login](https://github.com/user-attachments/assets/2f83faf4-921e-4f26-a113-287614b60186) | ![Mobile Coordinador](https://github.com/user-attachments/assets/e7427eba-1db8-46ee-a930-e81fc9f890db) |

### Role Dashboards
| Director | Student |
|----------|---------|
| ![Director Dashboard](https://github.com/user-attachments/assets/4f7af8f2-864f-4928-a163-7c330fbc4ba0) | ![Student Dashboard](https://github.com/user-attachments/assets/4b7ab8a4-eb95-4c36-97bb-b949eb9bf85c) |

| Treasurer | Secretary — First Enrollment |
|-----------|------------------------------|
| ![Treasurer Dashboard](https://github.com/user-attachments/assets/759fdc7d-315d-411d-9598-3936d31079b3) | ![Secretary Enrollment](https://github.com/user-attachments/assets/abe0b853-dbb6-476e-aa87-5877c5e0955b) |

### AI Chatbot Eva
| Eva — contextual assistant with real student data |
|---------------------------------------------------|
| ![Eva Chatbot](https://github.com/user-attachments/assets/f138a67a-445b-4468-bbb9-c6f0021eed4c) |

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Backend** | FastAPI 0.115 · Python 3.12 | Async, production-ready |
| **Database driver** | asyncpg | Raw async SQL, no ORM |
| **Frontend** | React 19 · Vite 7 | SPA, component-based |
| **Styling** | Tailwind CSS 4 · Framer Motion | Design tokens, animations |
| **Database** | PostgreSQL 15 via Supabase | pgbouncer-compatible pool |
| **Auth** | JWT (python-jose) · bcrypt | 60-min tokens, revocation table |
| **PDFs** | ReportLab | Server-side generation |
| **AI** | Groq API (llama3) | Contextual chatbot Eva |
| **Rate limiting** | SlowAPI | Login endpoint protection |
| **Deployment** | Render · Vercel · Supabase | Free tier, production config |

### Project Structure

```
infocampus-erp/
│
├── backend/
│   ├── auth/
│   │   ├── dependencies.py       # JWT validation, RBAC require_roles() factory
│   │   ├── jwt_handler.py        # Token creation & decoding
│   │   └── schemas.py            # Auth Pydantic models
│   │
│   ├── routers/                  # 14 API routers
│   │   ├── auth.py               # Login, logout, token verify
│   │   ├── academico.py          # Careers, subjects, sections, schedules
│   │   ├── administrativo.py     # Users, bulk enrollment management
│   │   ├── dashboards.py         # Role-based dashboard KPI aggregation
│   │   ├── director_router.py    # Institutional audit & config
│   │   ├── estudiante_dashboard.py  # Student personal data & KPIs
│   │   ├── estudiante_routes.py  # Student documents & schedule
│   │   ├── estudiantes.py        # Student CRUD
│   │   ├── ia_context.py         # Eva chatbot with DB context injection
│   │   ├── inscripciones.py      # First enrollment & re-enrollment
│   │   ├── periodos.py           # Academic period management
│   │   ├── profesor_routes.py    # Grades, attendance, evaluations
│   │   ├── reportes.py           # PDF generation, financial reports
│   │   └── tesorero.py           # Payments, mora, scholarships, tariffs
│   │
│   ├── services/
│   │   ├── calculos_financieros.py  # Financial logic with Decimal precision
│   │   └── pdf_generator.py         # ReportLab PDF builder
│   │
│   ├── migrations/
│   │   └── 001_revoked_tokens.sql   # Idempotent, advisory-lock protected
│   │
│   ├── config.py                 # pydantic-settings, env vars
│   ├── database.py               # asyncpg pool, pgbouncer fix
│   └── main.py                   # App factory, CORS, middleware, routers
│
├── frontend/
│   └── src/
│       ├── components/           # ChatIA, ErrorBoundary, UniversalSidebar
│       │   └── shared/           # StatCard, DashboardHero, EmptyState, Loader
│       ├── config/               # sidebarNav (all 6 roles), uiTokens
│       ├── constants/            # uiTokens.js — design token system
│       ├── context/              # AuthContext (global user state)
│       ├── layouts/              # MainLayout, UniversalSidebar
│       ├── pages/
│       │   ├── director/         # Dashboard, stats, students, config, audit
│       │   ├── coordinador/      # Careers, subjects, sections, enrollments
│       │   ├── tesorero/         # Payments, mora, scholarships, reports
│       │   ├── profesor/         # Sections, grade book, attendance, analytics
│       │   ├── estudiante/       # Schedule, grades, payments, documents
│       │   └── secretaria/       # Enrollments, students, users
│       ├── services/             # api.js (Axios + JWT interceptor), domain services
│       └── utils/                # PDF client-side utils, retryFetch
│
├── scripts_db/
│   └── populate.py               # 1,645-line data population script (Faker)
│
├── docs/
│   └── DEPLOY.md                 # Step-by-step Render + Vercel deployment
│
├── render.yaml                   # Render deployment config
└── README.md
```

---

## 👥 Modules by Role

| Role | Dashboards & Features |
|------|-----------------------|
| **Director** | Institutional KPIs, student & professor management, academic periods, careers & subjects, financial overview, scholarships, PDF reports, system audit log, system configuration |
| **Coordinator** | Academic dashboard, career management, subject catalog, sections & schedules, period management, enrollment oversight, scholarship tracking |
| **Professor** | Assigned sections, grade book per evaluation, attendance registry, historical attendance, student profile view, section analytics |
| **Student** | Personal dashboard, class schedule, grades by subject & evaluation, attendance history, account balance, payment history, installment documents |
| **Treasurer** | Financial dashboard, student search & account view, payment collection, late fee (mora) management, scholarship assignment, tariff configuration, income reports, payment certificates |
| **Secretary** | First enrollment (primera matrícula), re-enrollment, student management, section assignment, user creation & management |

---

## 🔐 Security Architecture

### Authentication flow

```
Client → POST /api/auth/login
       ← JWT token (60 min expiry)

Client → Any protected endpoint
       → Authorization: Bearer <token>
       → JWT decoded → user_id extracted
       → DB lookup: usuarios WHERE id=$1 AND activo=true
       → Role check: require_roles(['director', 'tesorero'])
       ← 200 OK or 401/403
```

### RBAC implementation

Roles are enforced via a `require_roles()` factory function that returns a FastAPI dependency. This means role validation is declared at the router level, not inside business logic:

```python
# Every protected endpoint declares its own allowed roles
@router.get("/pagos")
async def get_pagos(current_user = Depends(require_roles(['tesorero', 'director']))):
    ...
```

**Defined roles:** `estudiante` · `profesor` · `coordinador` · `director` · `tesorero` · `administrativo`

### Additional security layers

- **Rate limiting:** 5 login attempts per minute per IP (SlowAPI)
- **Token revocation:** Dedicated `revoked_tokens` table — logout invalidates the token server-side
- **CORS:** Configurable via `ALLOWED_ORIGINS` env variable; wildcard only for public demo
- **Password hashing:** bcrypt via passlib
- **Global 500 handler:** All unhandled exceptions return `{"detail": "Internal server error"}` — no stack traces in production

---

## 🤖 AI Chatbot — Eva

Eva is an AI assistant embedded in the student dashboard. What makes it more than a simple chatbot wrapper:

**Context injection per user:** Before each message is sent to Groq, the backend queries the database and injects the student's real data into the system prompt — current enrollments, grade averages per subject, payment status, mora status, scholarship details, and upcoming schedule.

This means Eva answers questions like:
- *"¿Cuánto debo?"* → actual balance from DB
- *"¿Cuándo es mi próxima clase?"* → actual schedule from DB
- *"¿Estoy en mora?"* → calculated from business rules, not static data

**Stack:** Groq API (llama3-8b-8192) · AsyncGroq · FastAPI async endpoint · conversation history maintained client-side

---

## 💰 Financial Engine

The financial calculation module (`services/calculos_financieros.py`) implements the institution's business rules using Python's `Decimal` type for precision — never floats for money.

**Mora (late fee) rules — three-tier logic:**
1. Student has an active, valid payment plan (convenio) → **no mora**, regardless of outstanding balance
2. Unpaid enrollments from **previous periods** → **immediate mora**
3. Enrollments from the **current period** → evaluate grace days before marking mora

**Other calculations:** total debt aggregation, outstanding balance per period, scholarship percentage application, credit-hour pricing per career.

---

## ⚙️ Key Technical Decisions

### asyncpg over SQLAlchemy

The backend uses raw async SQL with `asyncpg` rather than an ORM. This gives full control over queries, avoids N+1 problems, and maps directly to what PostgreSQL executes.

```python
async with get_db() as conn:
    rows = await conn.fetch(
        "SELECT * FROM inscripciones WHERE estudiante_id = $1 AND periodo_id = $2",
        student_id, period_id
    )
```

### pgbouncer compatibility

Supabase uses pgbouncer in transaction pooling mode, which does not support PostgreSQL prepared statements. Without the fix, the error `prepared statement does not exist` appears under load.

```python
_async_pool = await asyncpg.create_pool(
    dsn=settings.DATABASE_URL,
    statement_cache_size=0,  # Required for pgbouncer transaction mode
)
```

### Advisory lock on startup migrations

When Gunicorn starts multiple workers simultaneously, each worker runs the lifespan hook. Without coordination, concurrent migrations cause deadlocks. The solution uses PostgreSQL advisory locks:

```python
await conn.execute(f"SELECT pg_advisory_lock({MIGRATION_LOCK_ID})")
try:
    await conn.execute(migration_sql)
finally:
    await conn.execute(f"SELECT pg_advisory_unlock({MIGRATION_LOCK_ID})")
```

### Smart 401 handling on the frontend

A naive JWT interceptor would log out the user on any 401 response. This caused a bug where optional dashboard endpoints (that can legitimately return 401) were silently expelling authenticated users. The fix distinguishes critical auth endpoints from optional ones:

```javascript
const esCritico =
    url.includes('/auth/login') ||
    url.includes('/auth/verify') ||
    url.includes('/auth/perfil');

if (esCritico) {
    localStorage.removeItem('campus_user');
    window.location.href = '/login';
} else {
    console.warn(`[API] 401 en endpoint no crítico: ${url}`);
    // Don't log out — just warn
}
```

### Design token system

All colors, spacing, and visual constants are centralized in `constants/uiTokens.js`. This ensures visual consistency across 6 role dashboards built by iterative development — changing a token propagates everywhere.

---

## 🚀 Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15 (or Supabase project)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Fill in your credentials
uvicorn main:app --reload
```

API available at: `http://127.0.0.1:8000`
Interactive docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env             # Set VITE_API_URL if needed
npm run dev
```

App available at: `http://localhost:5173`

### Environment Variables

**Backend** (`backend/.env`):

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `SECRET_KEY_AUTH` | JWT signing secret (32+ chars) | ✅ |
| `ALLOWED_ORIGINS` | CORS origins, comma-separated | ✅ prod |
| `ALGORITHM` | JWT algorithm (`HS256`) | ✅ |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes | ✅ |
| `GROQ_API_KEY` | Groq API key for chatbot Eva | Optional |

**Frontend** (`frontend/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (e.g. `http://127.0.0.1:8000/api`) |

### Populate with test data

```bash
cd scripts_db
cp .env.example .env    # Set DATABASE_URL
python populate.py
```

This generates realistic students, professors, sections, enrollments, grades, and payment records using Faker.

---

## 🌐 Deployment

### Backend — Render

| Field | Value |
|-------|-------|
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `cd backend && gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |
| Health Check | `/api/health` |

Set environment variables in the Render dashboard. Use port `5432` (not `6543`) for Supabase connection string.

### Frontend — Vercel

| Field | Value |
|-------|-------|
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set `VITE_API_URL` to your Render backend URL.

> **Note:** Render free tier sleeps after ~15 min of inactivity. First request may take 30–60 seconds to wake the service.

Full step-by-step guide: [`docs/DEPLOY.md`](docs/DEPLOY.md)

---

## 📊 Project Scale

| Metric | Count |
|--------|-------|
| Backend Python files | 20+ |
| Lines of Python (backend) | ~7,300 |
| API Routers | 14 |
| Frontend JSX components | 118 |
| User roles | 6 |
| Data population script | 1,645 lines |

---

## 📋 Production Status

| Criterion | Status |
|-----------|--------|
| Core functionality (6 roles, CRUD, reports) | ✅ Complete |
| UI/UX — unified design system, responsive | ✅ Complete |
| Security — JWT, RBAC, rate limiting, revocation | ✅ Complete |
| AI chatbot Eva with DB context | ✅ Complete |
| PDF generation (reports & certificates) | ✅ Complete |
| PWA — installable on iOS & Android | ✅ Complete |
| Deployment — Render + Vercel + Supabase | ✅ Live |
| Automated tests | ⚠️ Pending |

---

## 🔄 Migration from Django

This project was fully migrated from a Django + DRF backend to FastAPI with asyncpg. The migration involved:

- Rewriting all views as async FastAPI routers with Pydantic schemas
- Replacing Django ORM with raw SQL via asyncpg (no SQLAlchemy)
- Re-implementing the RBAC permission system as FastAPI dependencies
- Porting all financial calculation logic (`models.py` → `services/calculos_financieros.py`)
- Resolving production infrastructure issues: pgbouncer compatibility, advisory-lock migrations, Gunicorn multi-worker coordination

The Django version is preserved at [`infocampus-erp-legacy`](https://github.com/ariinromeror/InfoCampus-Erp-Legacy).

---

## 👤 Developer

**Arin Romero**

Autodidact developer. InfoCampus is my first full project — built, migrated, and deployed to production independently using AI as a development tool.

📧 ariin.romeror@gmail.com
💼 [LinkedIn](https://www.linkedin.com/in/arin-romero-606661129)
🐙 [GitHub](https://github.com/ariinromeror)

---

<div align="center">

Built with FastAPI · React · PostgreSQL · deployed on Render + Vercel + Supabase

</div>
