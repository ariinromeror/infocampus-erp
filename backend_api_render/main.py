from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import os
from dotenv import load_dotenv
from decimal import Decimal


load_dotenv()

# =====================================================
# CONFIGURACIÓN
# =====================================================

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY_AUTH", "infocampusproject2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL requerida en variables de entorno")

app = FastAPI(title="Info Campus API", version="2.0")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# UTILIDADES DE CONVERSIÓN
# =====================================================
def clean_data(obj):
    """Convierte Decimal a float y asegura tipos serializables"""
    if isinstance(obj, list):
        return [clean_data(i) for i in obj]
    if isinstance(obj, dict):
        return {k: clean_data(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def to_python_type(obj):
    """Mantiene la infraestructura original para conversión de tipos"""
    return clean_data(obj)

@contextmanager
def get_db():
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

def verify_password(plain_password: str, stored_password: str) -> bool:
    """
    ✅ CORREGIDO: Compara password DIRECTAMENTE (texto plano)
    Sin bcrypt, sin hash, sin "campus2026" fija
    """
    return plain_password == stored_password

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
        # ✅ CORREGIDO: Añadido public. explícito
        cur.execute("SELECT * FROM public.usuarios WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return dict(user)

# =====================================================
# ENDPOINTS - AUTENTICACIÓN
# =====================================================
@app.post("/api/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login de usuario con JWT"""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            # ✅ CORREGIDO: Añadido public. al esquema + parámetros seguros
            cur.execute(
                "SELECT * FROM public.usuarios WHERE username = %s", 
                (request.username,)
            )
            user = cur.fetchone()
            cur.close()
        
        if not user:
            print(f"⚠️ Usuario no encontrado: {request.username}")
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        
        # ✅ Comparar contraseña DIRECTAMENTE (sin bcrypt, sin hash)
        if not verify_password(request.password, user.get("password", "")):
            print(f"⚠️ Contraseña incorrecta para: {request.username}")
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        
        # Crear token JWT
        token = create_access_token({
            "user_id": user["id"], 
            "username": user["username"]
        })
        
        # ✅ CORREGIDO: Convertir TODOS los campos a tipos Python nativos
        user_data = {
            "id": int(user["id"]),
            "username": str(user["username"]),
            "first_name": str(user.get("first_name") or ""),
            "last_name": str(user.get("last_name") or ""),
            "email": str(user.get("email") or ""),
            "rol": str(user["rol"]),
            "carrera": int(user["carrera_id"]) if user.get("carrera_id") else None,
            "es_becado": bool(user.get("es_becado", False)),
            "porcentaje_beca": int(user.get("porcentaje_beca") or 0),
            "en_mora": bool(user.get("en_mora", False))
        }
        
        print(f"✅ Login exitoso: {request.username} (rol: {user['rol']})")
        return {"access": token, "user": user_data}
    
    except HTTPException:
        raise
    except psycopg2.Error as db_error:
        # ✅ NUEVO: Captura específica de errores de PostgreSQL
        print(f"❌ Error de base de datos en login: {db_error}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error de conexión a base de datos: {str(db_error)}"
        )
    except Exception as e:
        print(f"❌ Error inesperado en login: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@app.get("/api/user/me")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Obtiene perfil del usuario actual"""
    return {
        "id": int(current_user["id"]),
        "username": str(current_user["username"]),
        "first_name": str(current_user.get("first_name") or ""),
        "last_name": str(current_user.get("last_name") or ""),
        "email": str(current_user.get("email") or ""),
        "rol": str(current_user["rol"]),
        "carrera": int(current_user["carrera_id"]) if current_user.get("carrera_id") else None,
        "es_becado": bool(current_user.get("es_becado", False)),
        "porcentaje_beca": int(current_user.get("porcentaje_beca") or 0),
        "en_mora": bool(current_user.get("en_mora", False))
    }

# =====================================================
# ENDPOINTS - ESTUDIANTE
# =====================================================
@app.get("/api/inscripciones")
async def get_inscripciones(current_user: dict = Depends(get_current_user)):
    """Obtiene inscripciones del estudiante con detalles de sección y materia"""
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        # ✅ CORREGIDO: Añadido public. a todas las tablas
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
            FROM public.inscripciones i
            JOIN public.secciones s ON i.seccion_id = s.id
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN public.pagos pg ON pg.inscripcion_id = i.id
            WHERE i.estudiante_id = %s
            ORDER BY p.codigo DESC
        """, (current_user["id"],))
        
        inscripciones = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return inscripciones

@app.get("/api/calificaciones/")
async def get_calificaciones(current_user: dict = Depends(get_current_user)):
    """Obtiene calificaciones del estudiante"""
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                m.nombre as materia,
                m.codigo,
                s.codigo_seccion as seccion,
                i.nota_final,
                i.estado,
                p.nombre as periodo
            FROM public.inscripciones i
            JOIN public.secciones s ON i.seccion_id = s.id
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.periodos_lectivos p ON s.periodo_id = p.id
            WHERE i.estudiante_id = %s
            ORDER BY p.codigo DESC
        """, (current_user["id"],))
        
        calificaciones = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return calificaciones

@app.get("/api/horario/")
async def get_horario(current_user: dict = Depends(get_current_user)):
    """Obtiene horario del estudiante"""
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                h.dia_semana,
                h.hora_inicio,
                h.hora_fin,
                m.nombre as materia,
                s.codigo_seccion as seccion,
                s.aula,
                CONCAT(u.first_name, ' ', u.last_name) as profesor
            FROM public.inscripciones i
            JOIN public.secciones s ON i.seccion_id = s.id
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.horarios h ON h.seccion_id = s.id
            LEFT JOIN public.usuarios u ON s.profesor_id = u.id
            WHERE i.estudiante_id = %s AND i.estado = 'activa'
            ORDER BY 
                CASE h.dia_semana
                    WHEN 'lunes' THEN 1
                    WHEN 'martes' THEN 2
                    WHEN 'miercoles' THEN 3
                    WHEN 'jueves' THEN 4
                    WHEN 'viernes' THEN 5
                    WHEN 'sabado' THEN 6
                END,
                h.hora_inicio
        """, (current_user["id"],))
        
        horario = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return horario

# =====================================================
# ENDPOINTS - PROFESOR
# =====================================================
@app.get("/api/profesor/secciones/")
async def get_secciones_profesor(current_user: dict = Depends(get_current_user)):
    """Obtiene secciones del profesor"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                s.id,
                s.codigo_seccion,
                s.aula,
                s.cupo_maximo,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo,
                p.nombre as periodo_nombre,
                COUNT(i.id) as estudiantes_inscritos
            FROM public.secciones s
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN public.inscripciones i ON i.seccion_id = s.id
            WHERE s.profesor_id = %s
            GROUP BY s.id, m.nombre, m.codigo, p.nombre
            ORDER BY p.codigo DESC
        """, (current_user["id"],))
        
        secciones = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return secciones

@app.get("/api/profesor/seccion/{seccion_id}/estudiantes/")
async def get_estudiantes_seccion(seccion_id: int, current_user: dict = Depends(get_current_user)):
    """Obtiene estudiantes de una sección"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Verificar que la sección pertenece al profesor
        # ✅ CORREGIDO: Añadido public.
        cur.execute("SELECT * FROM public.secciones WHERE id = %s AND profesor_id = %s", 
                   (seccion_id, current_user["id"]))
        seccion = cur.fetchone()
        
        if not seccion:
            raise HTTPException(status_code=403, detail="No autorizado para esta sección")
        
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_completo,
                i.nota_final,
                i.estado
            FROM public.inscripciones i
            JOIN public.usuarios u ON i.estudiante_id = u.id
            WHERE i.seccion_id = %s
            ORDER BY u.last_name, u.first_name
        """, (seccion_id,))
        
        estudiantes = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return estudiantes

@app.put("/api/profesor/calificacion/{inscripcion_id}/")
async def actualizar_nota(
    inscripcion_id: int, 
    nota_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Actualiza la nota de un estudiante"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    nota = nota_data.get("nota_final")
    if nota is None or not (0 <= nota <= 100):
        raise HTTPException(status_code=400, detail="Nota inválida (0-100)")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Verificar que la inscripción pertenece a una sección del profesor
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT i.id 
            FROM public.inscripciones i
            JOIN public.secciones s ON i.seccion_id = s.id
            WHERE i.id = %s AND s.profesor_id = %s
        """, (inscripcion_id, current_user["id"]))
        
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Actualizar nota
        # ✅ CORREGIDO: Añadido public.
        cur.execute("""
            UPDATE public.inscripciones 
            SET nota_final = %s 
            WHERE id = %s
        """, (nota, inscripcion_id))
        
        cur.close()
    
    return {"message": "Nota actualizada exitosamente"}

# =====================================================
# ENDPOINTS - TESORERÍA
# =====================================================
@app.get("/api/pagos/pendientes/")
async def get_pagos_pendientes(current_user: dict = Depends(get_current_user)):
    """Obtiene lista de pagos pendientes"""
    if current_user["rol"] not in ["tesorero", "director"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                u.id as estudiante_id,
                CONCAT(u.first_name, ' ', u.last_name) as estudiante_nombre,
                COUNT(i.id) as inscripciones_pendientes,
                COUNT(i.id) * 150.00 as monto_total
            FROM public.usuarios u
            JOIN public.inscripciones i ON i.estudiante_id = u.id
            LEFT JOIN public.pagos p ON p.inscripcion_id = i.id
            WHERE u.rol = 'estudiante' AND p.id IS NULL
            GROUP BY u.id
            ORDER BY monto_total DESC
        """)
        
        pendientes = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return pendientes

@app.post("/api/pagos/registrar/{usuario_id}/")
async def registrar_pago(usuario_id: int, current_user: dict = Depends(get_current_user)):
    """Registra el pago de todas las deudas de un estudiante"""
    if current_user["rol"] not in ["tesorero", "director"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT i.id
            FROM public.inscripciones i
            LEFT JOIN public.pagos p ON p.inscripcion_id = i.id
            WHERE i.estudiante_id = %s AND p.id IS NULL
        """, (usuario_id,))
        
        pendientes = cur.fetchall()
        
        if not pendientes:
            return {"message": "No hay deudas pendientes"}
        
        for insc in pendientes:
            # ✅ CORREGIDO: Añadido public.
            cur.execute("""
                INSERT INTO public.pagos (inscripcion_id, monto, metodo_pago, procesado_por_id, comprobante, fecha_pago)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (insc["id"], 150.00, "efectivo", current_user["id"], f"PAG-{datetime.now().timestamp()}"))
        
        cur.close()
    
    return {"message": f"{len(pendientes)} pagos registrados"}

# =====================================================
# ENDPOINTS - DIRECCIÓN
# =====================================================
@app.get("/api/institucional/dashboard/")
async def dashboard_institucional(current_user: dict = Depends(get_current_user)):
    """Dashboard institucional"""
    if current_user["rol"] not in ["director", "coordinador"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("SELECT COUNT(*) as total FROM public.usuarios WHERE rol = 'estudiante'")
        total_estudiantes = int(cur.fetchone()["total"])
        
        cur.execute("SELECT COUNT(*) as total FROM public.usuarios WHERE rol = 'profesor'")
        total_profesores = int(cur.fetchone()["total"])
        
        cur.execute("SELECT COUNT(*) as total FROM public.materias")
        materias_totales = int(cur.fetchone()["total"])
        
        cur.execute("""
            SELECT 
                c.nombre,
                COUNT(u.id) as num_alumnos
            FROM public.carreras c
            LEFT JOIN public.usuarios u ON u.carrera_id = c.id AND u.rol = 'estudiante'
            GROUP BY c.id, c.nombre
            ORDER BY num_alumnos DESC
        """)
        estudiantes_por_carrera = [
            {"nombre": row["nombre"], "num_alumnos": int(row["num_alumnos"])} 
            for row in cur.fetchall()
        ]
        
        cur.execute("""
            SELECT AVG(CAST(nota_final AS DECIMAL)) as promedio
            FROM public.inscripciones
            WHERE nota_final IS NOT NULL
        """)
        promedio = float(cur.fetchone()["promedio"] or 0)
        
        cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM public.pagos")
        ingresos_totales = float(cur.fetchone()["total"])
        
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_completo,
                CONCAT(u.first_name, ' ', u.last_name) as nombre,
                COUNT(i.id) * 150.0 as deuda_total,
                true as en_mora
            FROM public.usuarios u
            JOIN public.inscripciones i ON i.estudiante_id = u.id
            LEFT JOIN public.pagos p ON p.inscripcion_id = i.id
            WHERE u.rol = 'estudiante' AND p.id IS NULL
            GROUP BY u.id
            ORDER BY deuda_total DESC
            LIMIT 20
        """)
        
        alumnos_mora = []
        for row in cur.fetchall():
            alumnos_mora.append({
                "id": int(row["id"]),
                "username": str(row["username"]),
                "nombre_completo": str(row["nombre_completo"]),
                "nombre": str(row["nombre"]),
                "deuda_total": str(row["deuda_total"]),
                "en_mora": True
            })
        
        cur.close()
    
    return {
        "total_estudiantes": total_estudiantes,
        "total_profesores": total_profesores,
        "materias_totales": materias_totales,
        "estudiantes_por_carrera": estudiantes_por_carrera,
        "promedio_institucional": round(promedio, 2),
        "ingresos_totales": ingresos_totales,
        "alumnos_mora": alumnos_mora
    }

@app.get("/api/materias/")
async def get_materias(current_user: dict = Depends(get_current_user)):
    """Lista todas las materias"""
    with get_db() as conn:
        cur = conn.cursor()
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                m.id,
                m.nombre,
                m.codigo,
                m.semestre,
                m.creditos,
                c.nombre as carrera_nombre
            FROM public.materias m
            JOIN public.carreras c ON m.carrera_id = c.id
            ORDER BY c.nombre, m.semestre, m.nombre
        """)
        
        materias = [to_python_type(dict(row)) for row in cur.fetchall()]
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
        
        # ✅ CORREGIDO: Añadido public.
        cur.execute("SELECT * FROM public.usuarios WHERE id = %s AND rol = 'estudiante'", (estudiante_id,))
        estudiante = cur.fetchone()
        
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
        carrera = None
        if estudiante.get("carrera_id"):
            # ✅ CORREGIDO: Añadido public.
            cur.execute("SELECT id, nombre, codigo FROM public.carreras WHERE id = %s", (estudiante["carrera_id"],))
            carrera_data = cur.fetchone()
            if carrera_data:
                carrera = to_python_type(dict(carrera_data))
        
        # ✅ CORREGIDO: Añadido public. a todas las tablas
        cur.execute("""
            SELECT 
                i.id,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo,
                s.codigo_seccion as seccion,
                p.nombre as periodo,
                i.nota_final,
                i.estado,
                CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
            FROM public.inscripciones i
            JOIN public.secciones s ON i.seccion_id = s.id
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN public.pagos pg ON pg.inscripcion_id = i.id
            WHERE i.estudiante_id = %s
            ORDER BY p.codigo DESC
        """, (estudiante_id,))
        
        inscripciones = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return {
        "id": int(estudiante["id"]),
        "username": str(estudiante["username"]),
        "nombre_completo": f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip(),
        "email": str(estudiante.get("email") or ""),
        "dni": str(estudiante.get("dni") or ""),
        "rol": str(estudiante["rol"]),
        "carrera_detalle": carrera,
        "es_becado": bool(estudiante.get("es_becado", False)),
        "porcentaje_beca": int(estudiante.get("porcentaje_beca") or 0),
        "en_mora": False,
        "deuda_total": "0.00",
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
        "database": "PostgreSQL",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    """Health check"""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}
    

