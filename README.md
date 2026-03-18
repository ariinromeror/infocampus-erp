# 🎓 InfoCampus ERP

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Full-stack academic & financial ERP for educational institutions**

[Live Demo](#) · [API Docs](#) · [Technical Docs](#-technical-overview)

</div>

---

## About this project

**InfoCampus ERP** is a full-stack ERP for educational institutions: enrollments, grades, payments, scholarships, and financial reporting.

- **6 roles:** Director, Coordinator, Professor, Student, Treasurer, Secretary — each with tailored dashboards and permissions.
- **Stack:** FastAPI (async Python), React 19, PostgreSQL, JWT, RBAC, PDF reports, and an AI chatbot. Deployed on Render + Vercel with Supabase.

- **Developed by a single developer.**

- **Code:** Modular structure, shared components, design tokens.


**Tech highlights:** Python · FastAPI · React · PostgreSQL · JWT · RBAC · Tailwind CSS · Vite · Framer Motion

---

### Screenshots

<div align="center">

| Director | Student | Treasurer |
|:-------:|:-------:|:---------:|
| *Dashboard with KPIs & charts* | *Grades, schedule, payments* | *Payments, mora, scholarships* |

*Add `docs/screenshots/*.png` and link in README for portfolio impact.*

</div>

---

## Developer

**Arin Romero** · Developer

📧 ariin.romeror@gmail.com · 💼 [LinkedIn](https://www.linkedin.com/in/arin-romero-606661129) · 🐙 [GitHub](https://github.com/ariinromeror)

---

# 📖 Technical Overview

*The following section is for senior developers and technical reviewers interested in architecture, setup, and implementation details.*

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI 0.115+ · Python 3.11+ |
| **Frontend** | React 19 · Vite 7 · Tailwind CSS 4 |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **PDFs** | ReportLab |
| **AI** | Groq API (chatbot Eva) |

### Project Structure

```
infocampus-erp/
├── backend/                    # FastAPI API
│   ├── auth/                   # JWT, RBAC, dependencies
│   ├── routers/                # 14 API routers
│   ├── services/               # Business logic (PDF, calculations)
│   ├── migrations/             # SQL (revoked_tokens)
│   ├── config.py
│   ├── database.py             # asyncpg pool (statement_cache_size=0 for pgbouncer)
│   ├── main.py
│   └── requirements.txt
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # ChatIA, ErrorBoundary, shared/
│   │   ├── config/             # sidebarNav, uiTokens
│   │   ├── context/            # AuthContext
│   │   ├── layouts/            # MainLayout, UniversalSidebar
│   │   ├── pages/
│   │   │   ├── director/       # Dashboard, stats, students, config
│   │   │   ├── coordinador/    # Careers, subjects, sections, enrollments
│   │   │   ├── tesorero/       # Payments, mora, scholarships
│   │   │   ├── profesor/       # Sections, grades, attendance
│   │   │   ├── estudiante/     # Schedule, grades, payments
│   │   │   └── secretaria/     # Enrollments, students, users
│   │   └── services/           # api, academicoService
│   └── package.json
│
├── scripts_db/                 # Population & utility scripts (populate.py)
├── docs/                       # docs/DEPLOY.md
└── README.md
```

---

## 🎓 Modules by Role

| Role | Key Features |
|------|--------------|
| **Director** | Institutional dashboard, stats, periods, careers, subjects, sections, students, professors, finances, scholarships, reports, audit, config |
| **Coordinator** | Academic dashboard, careers, subjects, sections, periods, schedules, enrollments, scholarships |
| **Professor** | Dashboard, assigned sections, grade book, evaluations, attendance, analytics |
| **Student** | Personal dashboard, schedule, grades, evaluations, attendance, payments, documents |
| **Treasurer** | Financial dashboard, search student, collect payments, mora, scholarships, tariffs, income reports, certificates |
| **Secretary** | Dashboard, first enrollment, re-enrollment, students, sections, users |

---

## 🚀 Local Setup

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
cp .env.example .env       # Edit with your credentials
uvicorn main:app --reload
```

API: `http://127.0.0.1:8000` · Docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # Set VITE_API_URL if needed
npm run dev
```

App: `http://localhost:5173`

### Environment Variables

**Backend** (`backend/.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL |
| `SECRET_KEY_AUTH` | JWT secret key |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |
| `GROQ_API_KEY` | (Optional) Groq API key for chatbot Eva |

**Frontend** (`frontend/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (e.g. `http://127.0.0.1:8000`) |

---

## 🚀 Deployment

### Backend (Render)

```bash
Build:  pip install -r backend/requirements.txt
Start:  cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

**Note:** Use `statement_cache_size=0` in asyncpg when connecting via Supabase (pgbouncer). See `backend/database.py`.

### Frontend (Vercel)

```bash
Framework: Vite
Build:     npm run build
Output:    dist
```

Set `VITE_API_URL` to your Render backend URL.

### Database

- PostgreSQL 15 (Supabase recommended)
- Run migration: `backend/migrations/001_revoked_tokens.sql`

See `docs/DEPLOY_RENDER_VERCEL.md` for step-by-step deployment.

---

## 🔐 Security

- **JWT:** Tokens with 60-minute expiration
- **RBAC:** Permission checks on every protected endpoint
- **CORS:** Configure `ALLOWED_ORIGINS` in production (avoid `*`)
- **Rate limiting:** 5 attempts/min on login (SlowAPI)
- **Revoked tokens:** Table for invalidated tokens

---

## 📊 Production Readiness

| Criterion | Status |
|-----------|--------|
| Core functionality | ✅ Complete (6 roles, CRUD, reports) |
| UI/UX | ✅ Unified design system, responsive |
| Security | ✅ JWT, RBAC, rate limiting |
| Deployment | ✅ Render + Vercel + Supabase |
| Tests | ⚠️ Pending |
| Documentation | ✅ README, OpenAPI, deploy guides |

---

## 📁 Key Implementation Details

- **asyncpg + pgbouncer:** `statement_cache_size=0` in `database.py` for Supabase compatibility
- **Design tokens:** `frontend/src/constants/uiTokens.js` for consistent UX across roles
- **Shared components:** `StatCard`, `DashboardHero`, `SkeletonGrid`, `EmptyState`

---

<div align="center">

**⭐ Star this repo if you found it useful**

Built with FastAPI + React

</div>
