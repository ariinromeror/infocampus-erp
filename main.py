from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import os
from dotenv import load_dotenv

load_dotenv()

# =====================================================
# CONFIGURACIÓN
# =====================================================
DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY_AUTH", "infocampusproject2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL requerida en variables de entorno")

# Inicializar
app = FastAPI(title="Info Campus API", version="2.0", docs_url="/docs", redoc_url="/redoc")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# DATABASE CONNECTION
# =====================================================
@contextmanager
def get_db():
    """Context manager para conexiones a DB"""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# =====================================================
# MODELOS PYDANTIC
# =====================================================
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access: str
    user: dict

# =====================================================
# UTILIDADES
# =====================================================
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password: str, hashed_password: str):
    """Valida password - usa contraseña universal para migración"""
    return plain_password == "campus2026"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Obtiene usuario actual desde JWT"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    
    # Obtener usuario de DB
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM usuarios WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return dict(user)

# =====================================================
# ENDPOINTS - AUTENTICACIÓN
# =====================================================
@app.post("/api/login/", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login de usuario con JWT"""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM usuarios WHERE username = %s", (request.username,))
        user = cur.fetchone()
        cur.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Verificar contraseña
    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    # Crear token
    token = create_access_token({"user_id": user["id"], "username": user["username"]})
    
    # Preparar respuesta del usuario
    user_data = {
        "id": user["id"],
        "username": user["username"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "email": user.get("email", ""),
        "rol": user["rol"],
        "carrera": user.get("carrera_id"),
        "es_becado": user.get("es_becado", False),
        "porcentaje_beca": user.get("porcentaje_beca", 0),
        "deuda_total": user.get("deuda_total", 0),
        "en_mora": user.get("en_mora", False)
    }
    
    return {"access": token, "user": user_data}

@app.get("/api/user/me/")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Obtiene perfil del usuario actual"""
    return current_user

# =====================================================
# ENDPOINTS - ESTUDIANTE
# =====================================================
@app.get("/api/inscripciones/")
async def get_inscripciones(current_user: dict = Depends(get_current_user)):
    """Obtiene inscripciones del estudiante con detalles de sección y materia"""
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                i.id,
                i.nota_final,
                i.estado,
                s.codigo_seccion,
                s.aula,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo,
                m.creditos,
                p.nombre as periodo_nombre,
                CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
            FROM inscripciones i
            JOIN secciones s ON i.seccion_id = s.id
            JOIN materias m ON s.materia_id = m.id
            JOIN periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN pagos pg ON pg.inscripcion_id = i.id
            WHERE i.estudiante_id = %s
            ORDER BY p.codigo DESC
        """, (current_user["id"],))
        
        inscripciones = []
        for row in cur.fetchall():
            inscripciones.append({
                "id": row["id"],
                "nota_final": row["nota_final"],
                "estado": row["estado"],
                "seccion_detalle": {
                    "codigo_seccion": row["codigo_seccion"],
                    "aula": row["aula"],
                    "materia_detalle": {
                        "nombre": row["materia_nombre"],
                        "codigo": row["materia_codigo"],
                        "creditos": row["creditos"]
                    }
                },
                "pagado": row["pagado"]
            })
        
        cur.close()
    
    return inscripciones

@app.get("/api/inscripciones/mi_historial/")
async def get_historial(current_user: dict = Depends(get_current_user)):
    """Historial completo de inscripciones del estudiante"""
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                i.*,
                s.codigo_seccion,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo,
                p.nombre as periodo_nombre
            FROM inscripciones i
            JOIN secciones s ON i.seccion_id = s.id
            JOIN materias m ON s.materia_id = m.id
            JOIN periodos_lectivos p ON s.periodo_id = p.id
            WHERE i.estudiante_id = %s
            ORDER BY i.fecha_inscripcion DESC
        """, (current_user["id"],))
        
        historial = cur.fetchall()
        cur.close()
    
    return [dict(row) for row in historial]

# =====================================================
# ENDPOINTS - PROFESOR
# =====================================================
@app.get("/api/profesor/dashboard/")
async def profesor_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard con métricas del profesor"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Mis secciones
        cur.execute("""
            SELECT 
                s.id,
                s.codigo_seccion,
                s.aula,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo,
                p.nombre as periodo_nombre,
                p.activo as periodo_activo,
                COUNT(DISTINCT i.id) as num_estudiantes
            FROM secciones s
            JOIN materias m ON s.materia_id = m.id
            JOIN periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN inscripciones i ON i.seccion_id = s.id
            WHERE s.profesor_id = %s
            GROUP BY s.id, m.id, p.id
            ORDER BY p.activo DESC, s.codigo_seccion
        """, (current_user["id"],))
        
        mis_clases = []
        for row in cur.fetchall():
            mis_clases.append({
                "id": row["id"],
                "codigo_seccion": row["codigo_seccion"],
                "aula": row["aula"],
                "materia_detalle": {
                    "nombre": row["materia_nombre"],
                    "codigo": row["materia_codigo"]
                },
                "periodo_detalle": {
                    "nombre": row["periodo_nombre"],
                    "activo": row["periodo_activo"]
                },
                "num_estudiantes": row["num_estudiantes"]
            })
        
        # Estadísticas
        cur.execute("""
            SELECT 
                COUNT(DISTINCT s.id) as total_secciones,
                COUNT(DISTINCT i.estudiante_id) as total_estudiantes,
                AVG(CAST(i.nota_final AS DECIMAL)) as promedio_general
            FROM secciones s
            LEFT JOIN inscripciones i ON i.seccion_id = s.id
            WHERE s.profesor_id = %s AND i.nota_final IS NOT NULL
        """, (current_user["id"],))
        
        stats = cur.fetchone()
        cur.close()
    
    return {
        "total_secciones": stats["total_secciones"] or 0,
        "total_estudiantes": stats["total_estudiantes"] or 0,
        "promedio_general": float(stats["promedio_general"] or 0),
        "mis_clases": mis_clases
    }

@app.get("/api/profesor/seccion/{seccion_id}/estudiantes/")
async def get_estudiantes_seccion(seccion_id: int, current_user: dict = Depends(get_current_user)):
    """Lista de estudiantes inscritos en una sección"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Verificar que la sección pertenece al profesor
        cur.execute("SELECT profesor_id FROM secciones WHERE id = %s", (seccion_id,))
        seccion = cur.fetchone()
        
        if not seccion or seccion["profesor_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="No autorizado para esta sección")
        
        # Obtener estudiantes
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                i.nota_final,
                i.estado
            FROM inscripciones i
            JOIN usuarios u ON i.estudiante_id = u.id
            WHERE i.seccion_id = %s
            ORDER BY u.last_name, u.first_name
        """, (seccion_id,))
        
        estudiantes = [dict(row) for row in cur.fetchall()]
        cur.close()
    
    return estudiantes

@app.put("/api/profesor/actualizar-nota/{inscripcion_id}/")
async def actualizar_nota(
    inscripcion_id: int, 
    nota: float, 
    current_user: dict = Depends(get_current_user)
):
    """Actualiza la nota de un estudiante"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if nota < 0 or nota > 10:
        raise HTTPException(status_code=400, detail="Nota debe estar entre 0 y 10")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Verificar que la inscripción pertenece a una sección del profesor
        cur.execute("""
            SELECT s.profesor_id 
            FROM inscripciones i
            JOIN secciones s ON i.seccion_id = s.id
            WHERE i.id = %s
        """, (inscripcion_id,))
        
        result = cur.fetchone()
        if not result or result["profesor_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Actualizar nota
        cur.execute(
            "UPDATE inscripciones SET nota_final = %s WHERE id = %s",
            (nota, inscripcion_id)
        )
        cur.close()
    
    return {"message": "Nota actualizada exitosamente"}

# =====================================================
# ENDPOINTS - TESORERO
# =====================================================
@app.get("/api/finanzas/dashboard/")
async def finanzas_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard financiero con métricas de cobranza"""
    if current_user["rol"] not in ["tesorero", "director"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Ingresos totales
        cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM pagos")
        ingreso_real = cur.fetchone()["total"]
        
        # Total inscripciones (proyección)
        cur.execute("SELECT COUNT(*) as total FROM inscripciones")
        total_inscripciones = cur.fetchone()["total"]
        ingreso_proyectado = total_inscripciones * 150  # Estimado
        
        # Tasa de cobranza
        cur.execute("""
            SELECT 
                COUNT(DISTINCT i.id) as total_inscripciones,
                COUNT(DISTINCT p.inscripcion_id) as inscripciones_pagadas
            FROM inscripciones i
            LEFT JOIN pagos p ON p.inscripcion_id = i.id
        """)
        cobranza = cur.fetchone()
        tasa_cobranza = (cobranza["inscripciones_pagadas"] / cobranza["total_inscripciones"] * 100) if cobranza["total_inscripciones"] > 0 else 0
        
        # Estudiantes con deuda
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_completo,
                u.deuda_total,
                u.en_mora
            FROM usuarios u
            WHERE u.rol = 'estudiante' AND u.en_mora = true
            ORDER BY u.deuda_total DESC
            LIMIT 50
        """)
        
        listado_cobranza = [dict(row) for row in cur.fetchall()]
        cur.close()
    
    return {
        "ingreso_proyectado": float(ingreso_proyectado),
        "ingreso_real": float(ingreso_real),
        "tasa_cobranza": round(tasa_cobranza, 1),
        "listado_cobranza": listado_cobranza
    }

@app.post("/api/finanzas/registrar-pago/{usuario_id}/")
async def registrar_pago(usuario_id: int, current_user: dict = Depends(get_current_user)):
    """Registra pago para un estudiante"""
    if current_user["rol"] not in ["tesorero", "director"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Obtener inscripciones sin pago
        cur.execute("""
            SELECT i.id
            FROM inscripciones i
            LEFT JOIN pagos p ON p.inscripcion_id = i.id
            WHERE i.estudiante_id = %s AND p.id IS NULL
        """, (usuario_id,))
        
        pendientes = cur.fetchall()
        
        if not pendientes:
            return {"message": "No hay deudas pendientes"}
        
        # Registrar pagos
        for insc in pendientes:
            cur.execute("""
                INSERT INTO pagos (inscripcion_id, monto, metodo_pago, procesado_por_id, comprobante, fecha_pago)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (insc["id"], 150.00, "efectivo", current_user["id"], f"PAG-{datetime.now().timestamp()}"))
        
        cur.close()
    
    return {"message": f"{len(pendientes)} pagos registrados exitosamente"}

# =====================================================
# ENDPOINTS - DIRECCIÓN
# =====================================================
@app.get("/api/institucional/dashboard/")
async def dashboard_institucional(current_user: dict = Depends(get_current_user)):
    """Dashboard institucional con métricas globales"""
    if current_user["rol"] not in ["director", "coordinador"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Conteos básicos
        cur.execute("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'estudiante'")
        total_estudiantes = cur.fetchone()["total"]
        
        cur.execute("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'profesor'")
        total_profesores = cur.fetchone()["total"]
        
        cur.execute("SELECT COUNT(*) as total FROM materias")
        materias_totales = cur.fetchone()["total"]
        
        # Estudiantes por carrera
        cur.execute("""
            SELECT 
                c.nombre,
                COUNT(u.id) as num_alumnos
            FROM carreras c
            LEFT JOIN usuarios u ON u.carrera_id = c.id AND u.rol = 'estudiante'
            GROUP BY c.id, c.nombre
            ORDER BY num_alumnos DESC
        """)
        estudiantes_por_carrera = [dict(row) for row in cur.fetchall()]
        
        # Promedio institucional
        cur.execute("""
            SELECT AVG(CAST(nota_final AS DECIMAL)) as promedio
            FROM inscripciones
            WHERE nota_final IS NOT NULL
        """)
        promedio = cur.fetchone()["promedio"] or 0
        
        # Ingresos totales
        cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM pagos")
        ingresos_totales = cur.fetchone()["total"]
        
        # Alumnos en mora
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_completo,
                u.deuda_total
            FROM usuarios u
            WHERE u.rol = 'estudiante' AND u.en_mora = true
            ORDER BY u.deuda_total DESC
            LIMIT 20
        """)
        alumnos_mora = [dict(row) for row in cur.fetchall()]
        
        cur.close()
    
    return {
        "total_estudiantes": total_estudiantes,
        "total_profesores": total_profesores,
        "materias_totales": materias_totales,
        "estudiantes_por_carrera": estudiantes_por_carrera,
        "promedio_institucional": round(float(promedio), 2),
        "ingresos_totales": float(ingresos_totales),
        "alumnos_mora": alumnos_mora
    }

@app.get("/api/materias/")
async def get_materias(current_user: dict = Depends(get_current_user)):
    """Lista todas las materias con su carrera"""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                m.id,
                m.nombre,
                m.codigo,
                m.semestre,
                m.creditos,
                c.nombre as carrera_nombre
            FROM materias m
            JOIN carreras c ON m.carrera_id = c.id
            ORDER BY c.nombre, m.semestre, m.nombre
        """)
        
        materias = [dict(row) for row in cur.fetchall()]
        cur.close()
    
    return materias

@app.get("/api/estudiante/{estudiante_id}/")
async def detalle_estudiante(estudiante_id: int, current_user: dict = Depends(get_current_user)):
    """Detalle completo de un estudiante"""
    if current_user["rol"] not in ["director", "coordinador", "tesorero"]:
        if current_user["id"] != estudiante_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Datos del estudiante
        cur.execute("SELECT * FROM usuarios WHERE id = %s AND rol = 'estudiante'", (estudiante_id,))
        estudiante = cur.fetchone()
        
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
        # Carrera
        carrera = None
        if estudiante.get("carrera_id"):
            cur.execute("SELECT id, nombre, codigo FROM carreras WHERE id = %s", (estudiante["carrera_id"],))
            carrera_data = cur.fetchone()
            if carrera_data:
                carrera = dict(carrera_data)
        
        # Inscripciones
        cur.execute("""
            SELECT 
                i.id,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo,
                s.codigo_seccion,
                p.nombre as periodo,
                i.nota_final,
                i.estado,
                CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
            FROM inscripciones i
            JOIN secciones s ON i.seccion_id = s.id
            JOIN materias m ON s.materia_id = m.id
            JOIN periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN pagos pg ON pg.inscripcion_id = i.id
            WHERE i.estudiante_id = %s
            ORDER BY p.codigo DESC
        """, (estudiante_id,))
        
        inscripciones = [dict(row) for row in cur.fetchall()]
        cur.close()
    
    return {
        "id": estudiante["id"],
        "username": estudiante["username"],
        "nombre_completo": f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip(),
        "email": estudiante.get("email", ""),
        "dni": estudiante.get("dni", ""),
        "rol": estudiante["rol"],
        "carrera_detalle": carrera,
        "es_becado": estudiante.get("es_becado", False),
        "porcentaje_beca": estudiante.get("porcentaje_beca", 0),
        "en_mora": estudiante.get("en_mora", False),
        "deuda_total": str(estudiante.get("deuda_total", 0)),
        "inscripciones": inscripciones
    }

# =====================================================
# HEALTH CHECK
# =====================================================
@app.get("/")
async def root():
    return {
        "message": "Info Campus API v2.0",
        "status": "online",
        "database": "PostgreSQL (Neon/Supabase)",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}