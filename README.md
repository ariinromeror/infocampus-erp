# 🎓 InfoCampus ERP v2.0

## Sistema de Gestión Universitaria Moderno

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

**Sistema integral de gestión académica y financiera para instituciones educativas**

[📚 API Docs](http://localhost:8000/docs) | [📖 ReDoc](http://localhost:8000/redoc)

</div>

---

## 📋 Descripción General

**InfoCampus ERP** es un sistema ERP (Enterprise Resource Planning) diseñado para instituciones educativas. Gestiona:

- **Académico:** Inscripciones, calificaciones, períodos lectivos, materias, secciones, horarios
- **Financiero:** Pagos, mora, becas, convenios, tarifas, ingresos
- **Administrativo:** Usuarios, estudiantes, profesores, reportes PDF

El sistema implementa **6 roles** con control de acceso (RBAC): Director, Coordinador, Profesor, Estudiante, Tesorero y Secretaria (administrativo).

### Características principales

- **⚡ Alto rendimiento:** FastAPI con operaciones asíncronas y agregaciones SQL optimizadas
- **🔐 Seguridad:** JWT + bcrypt + RBAC con 6 niveles de roles
- **💰 Lógica financiera:** Mora con 3 reglas, becas, convenios, cálculo con Decimal
- **📊 Dashboards:** Métricas en tiempo real por rol
- **📄 Reportes PDF:** Certificados, estados de cuenta, reportes de tesorería
- **🤖 Chat IA:** Asistente virtual Eva (Groq) con contexto por rol
- **📱 Responsive:** UI adaptada a móvil, tablet y desktop

---

## 🏗️ Arquitectura

### Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | FastAPI 0.115 + Python 3.11+ |
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **Base de datos** | PostgreSQL (Supabase) |
| **Autenticación** | JWT (python-jose) + bcrypt |
| **PDFs** | ReportLab |
| **IA** | Groq API (chatbot Eva) |

### Estructura del proyecto

```
infocampus-erp/
├── backend/                    # API FastAPI
│   ├── auth/                   # JWT, RBAC, dependencias
│   ├── routers/                # 14 routers API
│   ├── services/               # Lógica de negocio (PDF, cálculos)
│   ├── migrations/             # SQL (revoked_tokens)
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # ChatIA, ErrorBoundary, ProtectedRoute, shared/
│   │   ├── config/             # sidebarNav.js
│   │   ├── context/            # AuthContext
│   │   ├── layouts/            # MainLayout, Header, UniversalSidebar
│   │   ├── pages/
│   │   │   ├── auth/           # Login
│   │   │   ├── director/       # Dashboard, estadísticas, etc.
│   │   │   ├── coordinador/    # Carreras, materias, secciones, etc.
│   │   │   ├── tesorero/       # Cobrar, mora, becas, etc.
│   │   │   ├── profesor/       # Secciones, evaluaciones, asistencia
│   │   │   ├── estudiante/     # Horario, notas, pagos
│   │   │   └── secretaria/    # Inscripciones, estudiantes, secciones
│   │   └── services/           # api, academicoService, etc.
│   ├── .env.example
│   └── package.json
│
├── scripts_db/                 # Scripts de población y utilidades
│   ├── populate.py
│   ├── regenerar_hashes.py
│   └── qa_validation.py
│
├── docs/                       # Documentación y planes
└── README.md
```

---

## 🎓 Módulos por rol

### Director
- Dashboard institucional, estadísticas, períodos
- Gestión de carreras, materias, secciones, horarios
- Estudiantes, profesores, usuarios
- Finanzas, becas, convenios, tarifas
- Reportes, auditoría de notas, configuración

### Coordinador
- Dashboard académico
- Carreras, materias, secciones, periodos, horarios
- Estudiantes, profesores, inscripciones
- Becas, reportes, usuarios

### Profesor
- Dashboard, secciones asignadas
- Libro de notas, evaluaciones
- Asistencia, analíticas
- Perfil de alumnos

### Estudiante
- Dashboard personal
- Horario, notas, materias
- Evaluaciones, asistencia
- Pagos, estado de cuenta, documentos

### Tesorero
- Dashboard financiero
- Buscar estudiante, cobrar
- Mora, pagos, convenios
- Becas, tarifas, ingresos
- Reportes, estados de cuenta, certificados

### Secretaria (administrativo)
- Dashboard
- Inscripciones, primera matrícula, reinscripción
- Estudiantes, secciones, mallas
- Usuarios

---

## 🚀 Instalación y desarrollo

### Requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL (o Supabase)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Editar con tus credenciales
uvicorn main:app --reload
```

API en `http://127.0.0.1:8000`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # Editar VITE_API_URL si es necesario
npm run dev
```

App en `http://localhost:5173`

### Variables de entorno

**Backend** (`backend/.env`):

| Variable | Descripción |
|----------|-------------|
| DATABASE_URL | URL de conexión PostgreSQL |
| SECRET_KEY_AUTH | Clave secreta para JWT |
| ALLOWED_ORIGINS | Orígenes CORS (separados por coma) |
| GROQ_API_KEY | (Opcional) Clave Groq para chatbot Eva |

**Frontend** (`frontend/.env`):

| Variable | Descripción |
|----------|-------------|
| VITE_API_URL | URL del backend (ej: http://127.0.0.1:8000) |

---

## 📊 Auditoría de producción

### Porcentaje de avance estimado: **~62%**

| Criterio | Peso | Estado | Puntos |
|----------|------|--------|--------|
| Funcionalidad core | 25% | Completa (6 roles, CRUD, reportes) | 23 |
| UI/UX | 20% | Buena (Tailwind, dashboards, responsive) | 17 |
| Tests | 15% | Inexistente | 0 |
| Documentación | 10% | README y OpenAPI | 7 |
| Seguridad | 15% | JWT/RBAC OK; credenciales a revisar | 8 |
| Deploy config | 15% | Parcial (slowapi añadido, CORS) | 7 |

### Pendiente para producción

| Prioridad | Tarea |
|-----------|-------|
| **Crítica** | Eliminar archivos `credenciales*.txt` del repo (si existen) y rotar contraseñas |
| **Crítica** | Definir `ALLOWED_ORIGINS` en producción (no usar `*`) |
| **Alta** | Unificar componentes duplicados (ModalForm, ConfirmModal, SelectModal) |
| **Alta** | Documentar schema de BD (DDL o migraciones) |
| **Media** | Añadir tests básicos (login, health, endpoints críticos) |
| **Media** | Añadir integración con APM (Sentry, etc.) |
| **Baja** | Tests E2E |

---

## 📁 Archivos y organización

### Componentes duplicados (consolidar)

| Componente | Ubicaciones | Acción recomendada |
|------------|-------------|--------------------|
| ModalForm | `director/components/`, `coordinador/components/` | Unificar en `components/shared/ModalForm.jsx` |
| ConfirmModal | `director/`, `tesorero/`, `secretaria/components/` | Unificar en `components/shared/ConfirmModal.jsx` |
| SelectModal | `secretaria/`, `tesorero/`, `coordinador/components/` | Unificar en `components/shared/SelectModal.jsx` |

### Archivos a excluir del repositorio

- `backend/.env`
- `frontend/.env`
- `scripts_db/.env`
- `credenciales*.txt` (añadido a .gitignore)

### Archivos que no deben existir en repo

- Cualquier archivo con credenciales reales
- Contraseñas o API keys en texto plano

---

## 🚀 Deployment

### Backend (Render / Railway / similar)

```bash
Build: pip install -r backend/requirements.txt
Start: cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Frontend (Vercel / Netlify)

```bash
Framework: Vite
Build: npm run build
Output: dist
```

### Base de datos

- PostgreSQL 15 (Supabase recomendado)
- Ejecutar migración `backend/migrations/001_revoked_tokens.sql`

---

## 🔐 Seguridad

- **JWT:** Tokens con expiración de 60 minutos
- **RBAC:** Validación de permisos en cada endpoint
- **CORS:** Configurar `ALLOWED_ORIGINS` en producción
- **Rate limiting:** 5 intentos/min en login (SlowAPI)
- **Revoked tokens:** Tabla para tokens invalidados

---

## 📈 Resultados

✅ Arquitectura modular y mantenible  
✅ 6 roles con RBAC  
✅ Lógica financiera completa (mora, becas, convenios)  
✅ Dashboards por rol  
✅ Reportes PDF  
✅ Chat IA (Eva)  
✅ UI responsive  
✅ Documentación OpenAPI (Swagger/ReDoc)  

---

## 👨‍💻 Desarrollador

**Arin Romero**  
Full-Stack Developer | Python Specialist

📧 ariin.romeror@gmail.com  
💼 [LinkedIn](https://linkedin.com/in/yourprofile)  
🐙 [GitHub](https://github.com/ariinromeror)

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Built with ❤️ using FastAPI + React

</div>
