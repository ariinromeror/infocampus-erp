# InfoCampus ERP

**Full-stack academic & financial ERP for educational institutions**

---

## For Recruiters & Hiring Managers

**InfoCampus ERP** is a production-ready, full-stack enterprise system built from scratch to manage the complete lifecycle of an educational institution—from student enrollment and grades to payments, scholarships, and financial reporting.

### Why this project stands out

- **Real-world scope:** 6 distinct user roles (Director, Coordinator, Professor, Student, Treasurer, Secretary), each with tailored dashboards, workflows, and permissions. This isn't a toy app—it models the complexity of a real university ERP.

- **Modern, production-oriented stack:** FastAPI (async Python), React 19, PostgreSQL, JWT auth, RBAC, PDF reports, and an AI chatbot. Deployed on Render + Vercel with Supabase as the database.

- **End-to-end ownership:** Architecture, backend API, frontend UI, database design, financial logic (late fees, scholarships, payment plans), and deployment—all implemented by a single developer.

- **Clean, maintainable codebase:** Modular structure, shared components, design tokens for consistent UX across roles, and clear separation of concerns.

If you're looking for a developer who can ship full-stack products and own the entire pipeline—from requirements to deployment—this project demonstrates that capability.

**Tech highlights:** Python · FastAPI · React · PostgreSQL · JWT · RBAC · Tailwind CSS · Vite · Framer Motion

---

## Developer

**Arin Romero** · Full-Stack Developer · Python Specialist

📧 ariin.romeror@gmail.com · 💼 [LinkedIn](https://linkedin.com/in/yourprofile) · 🐙 [GitHub](https://github.com/ariinromeror)

---

## Technical Overview

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI 0.115+ · Python 3.11+ |
| **Frontend** | React 19 · Vite 7 · Tailwind CSS 4 |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **PDFs** | ReportLab |
| **AI** | Groq API (chatbot Eva) |

### Modules by Role

| Role | Key Features |
|------|--------------|
| **Director** | Institutional dashboard, stats, periods, careers, subjects, sections, students, professors, finances, scholarships, reports, audit, config |
| **Coordinator** | Academic dashboard, careers, subjects, sections, periods, schedules, enrollments, scholarships |
| **Professor** | Dashboard, assigned sections, grade book, evaluations, attendance, analytics |
| **Student** | Personal dashboard, schedule, grades, evaluations, attendance, payments, documents |
| **Treasurer** | Financial dashboard, search student, collect payments, mora, scholarships, tariffs, income reports, certificates |
| **Secretary** | Dashboard, first enrollment, re-enrollment, students, sections, users |

---

## Deployment

- **Backend:** Render (FastAPI + Gunicorn)
- **Frontend:** Vercel (Vite)
- **Database:** PostgreSQL 15 (Supabase)

---

Built with FastAPI + React
