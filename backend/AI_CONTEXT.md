# AI Context - InfoCampus ERP Backend
## FastAPI Architecture Documentation

### 🎯 Overview
This is a **FastAPI-based University ERP System** migrated from Django REST Framework. It manages academic operations, financial calculations, role-based access control (RBAC), and PDF reporting.

**Critical Note for AI Assistants:** This codebase uses PostgreSQL with psycopg2 (NOT asyncpg), synchronous database operations with connection pooling, and strict financial precision using Python's Decimal type.

---

## 🏗️ Architecture Structure

```
backend/
├── main.py                      # FastAPI app initialization
├── config.py                    # Pydantic settings (environment variables)
├── database.py                  # PostgreSQL connection pool (psycopg2)
│
├── auth/                        # Authentication & Authorization
│   ├── jwt_handler.py          # JWT token creation/validation
│   ├── dependencies.py         # get_current_user, RoleChecker, RBAC
│   └── schemas.py              # LoginRequest, TokenResponse
│
├── services/                    # Business Logic Layer
│   ├── calculos_financieros.py # Financial calculations (CRITICAL)
│   └── pdf_generator.py        # PDF generation with ReportLab
│
├── routers/                     # API Endpoints (Controller Layer)
│   ├── auth.py                 # /auth/login, /auth/perfil
│   ├── dashboards.py           # Dashboards by role
│   ├── inscripciones.py        # Grade management
│   ├── estudiantes.py          # Student payments & details
│   ├── periodos.py             # Academic period closure
│   └── reportes.py             # PDF reports
│
└── models/
    └── __init__.py             # (Pydantic models inline in routers)
```

---

## 🔐 RBAC System (Role-Based Access Control)

### **6 Roles Implemented:**
1. `estudiante` - Student (view own data only)
2. `profesor` - Professor (manage own sections/grades)
3. `coordinador` - Coordinator (academic oversight)
4. `director` - Director (full system access)
5. `tesorero` - Treasurer (financial management)
6. `administrativo` - Administrative staff

### **Permission Inheritance:**
**IMPORTANT:** Higher roles inherit permissions from lower roles:
- **Director:** Can access ALL endpoints
- **Coordinador:** Can access most endpoints (except critical financial operations)
- **Tesorero:** Financial endpoints only
- **Profesor:** Grade management for own sections only

### **Usage Pattern:**
```python
from auth.dependencies import require_roles, get_current_user

# Strict role check
@router.get("/finanzas", dependencies=[require_roles(['tesorero'])])

# Multiple allowed roles
@router.get("/dashboard", dependencies=[require_roles(['director', 'coordinador'])])

# Any authenticated user
@router.get("/perfil", dependencies=[get_current_user])
```

---

## 💰 Financial Logic (CRITICAL)

### **File:** `services/calculos_financieros.py`

### **Core Functions:**

#### 1. `calcular_en_mora(estudiante, inscripciones, periodo_actual, conn)`
Determines if a student is in default (mora) using **3 strict rules**:

**Rule 1:** If student has active payment agreement (`convenio_activo=True` and `fecha_limite_convenio >= today`) → **NOT in default**

**Rule 2:** If student has unpaid enrollments from **previous periods** → **IN DEFAULT immediately**

**Rule 3:** If student has unpaid enrollments in **current period** that exceeded grace days (`dias_gracia_pago`) → **IN DEFAULT**

#### 2. `calcular_deuda_total(estudiante, inscripciones, conn)`
Calculates total debt with **scholarship discounts**:
```
costo = creditos × precio_credito
if es_becado:
    descuento = costo × (porcentaje_beca / 100)
    costo -= descuento
```

#### 3. `calcular_deuda_vencida(estudiante, inscripciones, periodo_actual, conn)`
Calculates only **overdue debt** (Rule 2 + Rule 3 applied).

### **Decimal Precision:**
**NEVER use float for money.** Always use `Decimal`:
```python
from decimal import Decimal, ROUND_HALF_UP

costo = Decimal(str(creditos)) × Decimal(str(precio_credito))
return costo.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

---

## 🗄️ Database Layer

### **Connection Pooling:**
Uses `psycopg2.pool.ThreadedConnectionPool` for synchronous operations.

### **Usage Pattern:**
```python
from database import get_db

with get_db() as conn:
    cur = conn.cursor()
    cur.execute("SELECT * FROM public.usuarios WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close()
```

### **Schema:**
Uses existing Django tables in `public` schema:
- `public.usuarios` (Users)
- `public.carreras` (Careers)
- `public.materias` (Subjects)
- `public.periodos_lectivos` (Academic Periods)
- `public.secciones` (Sections)
- `public.inscripciones` (Enrollments)
- `public.pagos` (Payments)

---

## 📊 Dashboards & Aggregations

### **Performance Strategy:**
Use SQL aggregations (COUNT, SUM, AVG) directly in database queries:

```python
# Good - Let PostgreSQL aggregate
cur.execute("""
    SELECT 
        COUNT(*) as total_estudiantes,
        AVG(nota_final) as promedio,
        SUM(monto) as ingresos
    FROM public.inscripciones
""")

# Bad - Don't fetch all and aggregate in Python
```

---

## 📄 PDF Generation

### **File:** `services/pdf_generator.py`

### **Functions:**
- `generar_estado_cuenta()` - Financial statement
- `generar_certificado_inscripcion()` - Enrollment certificate
- `generar_reporte_pagos()` - Treasury report

### **Usage in Endpoints:**
```python
from fastapi.responses import StreamingResponse

@router.get("/reporte")
async def download_report():
    pdf_buffer = generar_estado_cuenta(...)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reporte.pdf"}
    )
```

---

## 🚨 Common Pitfalls for AI Assistants

### **1. Role Checking:**
```python
# WRONG - Allows any authenticated user
@router.get("/admin")
async def admin_endpoint(current_user = Depends(get_current_user)):
    pass

# CORRECT - Explicit role check
@router.get("/admin", dependencies=[require_roles(['director'])])
async def admin_endpoint():
    pass
```

### **2. Financial Calculations:**
```python
# WRONG - Float precision errors
costo = creditos * precio_credito  # Never do this

# CORRECT - Decimal precision
from decimal import Decimal
costo = Decimal(str(creditos)) * Decimal(str(precio_credito))
```

### **3. Database Connections:**
```python
# WRONG - Not using connection pool
conn = psycopg2.connect(DATABASE_URL)

# CORRECT - Use context manager
with get_db() as conn:
    # operations
```

### **4. Date Handling:**
```python
# Dates from PostgreSQL might be string or datetime
fecha = row['fecha_limite_convenio']
if isinstance(fecha, str):
    fecha = datetime.fromisoformat(fecha.replace('Z', '+00:00')).date()
```

---

## 🔧 Environment Variables

Required in `.env` or Render Dashboard:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY_AUTH=your-secret-jwt-key-min-32-chars-long
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

---

## 📝 Key Patterns

### **Updating Financial Status:**
When a grade is updated, recalculate student's financial status immediately:

```python
# 1. Update grade
cur.execute("UPDATE inscripciones SET nota_final = %s WHERE id = %s", (nota, id))

# 2. Get student's enrollments
cur.execute("SELECT * FROM inscripciones WHERE estudiante_id = %s", (estudiante_id,))
inscripciones = cur.fetchall()

# 3. Recalculate financial status
en_mora = calcular_en_mora(estudiante, inscripciones, periodo_actual, conn)
deuda = calcular_deuda_total(estudiante, inscripciones, conn)

# 4. Return in response
return {
    "nota_actualizada": True,
    "estado_financiero": {"en_mora": en_mora, "deuda_total": float(deuda)}
}
```

---

## 🎯 Testing Checklist

When modifying financial logic, verify:
- [ ] Student with `convenio_activo=True` and valid date → NOT in default
- [ ] Student with debt from previous period → IN default
- [ ] Student in grace period → NOT in default
- [ ] Scholarship discount applied correctly
- [ ] Decimal precision maintained (no .999999 or .000001 errors)

---

**Last Updated:** 2024-02-11
**Migration:** Django REST Framework → FastAPI
**Status:** Production Ready
