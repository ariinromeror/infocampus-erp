# 🎓 InfoCampus ERP v2.0
## Sistema de Gestión Universitaria Moderno

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

**A modern, high-performance University ERP System**

[🚀 Demo](https://your-url.com) | [📚 API Docs](https://your-url.com/docs) | [💼 Portfolio](https://your-portfolio.com)

</div>

---

## 📋 Descripción General

InfoCampus ERP es un sistema integral de gestión académica y financiera diseñado para instituciones educativas. Este proyecto representa una **migración exitosa de Django REST Framework a FastAPI**, demostrando arquitectura moderna, rendimiento optimizado y código mantenible.

### 🎯 Características Principales

- **⚡ Alto Rendimiento:** FastAPI con operaciones asíncronas y agregaciones SQL optimizadas
- **🔐 Seguridad Avanzada:** JWT Authentication + RBAC con 6 niveles de roles
- **💰 Lógica Financiera Compleja:** Sistema de mora con 3 reglas, becas, convenios y cálculo preciso con Decimal
- **📊 Dashboards Inteligentes:** Métricas en tiempo real para Director, Tesorero y Profesores
- **📄 Reportes PDF Profesionales:** Generación de certificados y estados de cuenta
- **🎨 Frontend Moderno:** React 19 + Tailwind CSS + Vite

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | FastAPI + Python 3.11 |
| **Frontend** | React 19 + Vite + Tailwind CSS |
| **Base de Datos** | PostgreSQL (Supabase) |
| **Autenticación** | JWT + bcrypt |
| **PDFs** | ReportLab |
| **Deployment** | Render (Backend) + Vercel (Frontend) |

### Estructura del Proyecto

```
infocampus-erp/
├── backend/                    # API FastAPI
│   ├── auth/                   # JWT + RBAC
│   ├── services/              # Lógica de negocio
│   ├── routers/               # Endpoints API
│   └── main.py                # Punto de entrada
│
├── frontend/                   # React App
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/            # Páginas
│   │   └── services/         # API integration
│   └── package.json
│
├── legacy_archive/            # Código Django (archivado)
└── README.md
```

---

## 🎓 Módulos del Sistema

### 1. Gestión Académica
- **Inscripciones:** Registro de estudiantes en materias
- **Calificaciones:** Sistema de notas con validación (≥7.0 aprueba)
- **Períodos Lectivos:** Cierre de ciclo académico automatizado
- **Materias y Secciones:** Gestión de oferta académica

### 2. Gestión Financiera
- **Sistema de Mora Inteligente:** 3 reglas de negocio
  - Convenios de pago protegen al estudiante
  - Deuda de períodos anteriores = mora inmediata
  - Días de gracia por carrera
- **Becas:** Descuentos automáticos por porcentaje
- **Pagos:** Registro con múltiples métodos (efectivo, transferencia, tarjeta)
- **Estados de Cuenta:** PDFs detallados con cálculos precisos

### 3. Dashboards por Rol

#### 📊 Director/Coordinador
- Total de estudiantes y profesores
- Estudiantes por carrera (gráficas)
- Promedio institucional
- Ingresos totales
- Lista de alumnos en mora

#### 💰 Tesorero
- Ingreso proyectado vs real
- Tasa de cobranza (%)
- Listado de cobranza con estados

#### 👨‍🏫 Profesor
- Secciones asignadas
- Total de alumnos
- Promedio de rendimiento
- Gestión de notas

### 4. Reportes PDF
- **Certificados de Inscripción:** Documentos oficiales
- **Estados de Cuenta:** Reportes financieros completos
- **Reportes de Tesorería:** Análisis de ingresos por período

---

## 🔐 Sistema de Roles (RBAC)

El sistema implementa **6 roles** con herencia de permisos:

| Rol | Permisos |
|-----|----------|
| **Director** | Acceso total al sistema |
| **Coordinador** | Dashboard institucional, gestión académica |
| **Tesorero** | Gestión financiera, pagos, reportes |
| **Profesor** | Gestión de notas (solo sus secciones) |
| **Estudiante** | Ver información personal y académica |
| **Administrativo** | Soporte administrativo |

---

## 💡 Destacados Técnicos

### Migración Django → FastAPI

Esta migración demuestra:

1. **Arquitectura Modular:** Código organizado en 19 archivos especializados
2. **Performance:** Agregaciones SQL directas vs ORM de Django
3. **Type Safety:** Uso extensivo de Pydantic para validación
4. **Documentación Automática:** OpenAPI/Swagger generado automáticamente
5. **Mantenibilidad:** 4,426 líneas de código bien documentadas

### Precisión Financiera

```python
# Cálculo con precisión de centavos
from decimal import Decimal

costo = Decimal(str(creditos)) * Decimal(str(precio_credito))
if es_becado:
    descuento = costo * (Decimal(str(porcentaje_beca)) / Decimal('100'))
    costo -= descuento
```

### Seguridad

- JWT tokens con expiración de 24 horas
- Validación de permisos en cada endpoint
- CORS configurado restrictivamente
- Sanitización de queries SQL (parametrizadas)

---

## 📊 Métricas del Proyecto

- **Líneas de Código:** 4,426
- **Endpoints API:** 19
- **Tiempo de Desarrollo:** 5 fases completadas
- **Cobertura de Funcionalidad:** 100% de Django migrado
- **Documentación:** Completa con ejemplos

---

## 🚀 Deployment

### Backend (Render)
```bash
Build Command: pip install -r backend/requirements.txt
Start Command: cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Frontend (Vercel)
```bash
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

### Base de Datos (Supabase)
- PostgreSQL 15
- Connection pooling
- Row Level Security (RLS) habilitado

---

## 🛠️ Tecnologías Clave

### Backend
- **FastAPI 0.115** - Framework web moderno
- **psycopg2-binary** - PostgreSQL adapter
- **python-jose** - JWT tokens
- **passlib** - Password hashing
- **reportlab** - PDF generation
- **pydantic-settings** - Environment configuration

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Router** - Navigation

### DevOps
- **Render** - Backend hosting
- **Vercel** - Frontend hosting
- **Supabase** - Database
- **GitHub** - Version control

---

## 📈 Resultados

Este proyecto demuestra:

✅ **Arquitectura de Software:** Diseño modular y mantenible  
✅ **Migración de Legacy:** Transformación de Django a FastAPI  
✅ **Lógica de Negocio Compleja:** Sistema financiero robusto  
✅ **Seguridad:** Implementación de RBAC y JWT  
✅ **Performance:** Optimizaciones SQL y connection pooling  
✅ **Documentación:** Código bien documentado y estructurado  

---

## 👨‍💻 Desarrollador

**Arin Romero**  
Full-Stack Developer | Python Specialist | AI-Driven Development

📧 ariin.romeror@gmail.com  
💼 [LinkedIn](https://linkedin.com/in/yourprofile)  
🐙 [GitHub](https://github.com/ariinromeror)

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Built with ❤️ and ☕ using FastAPI + React

</div>
