from fastapi import FastAPI, HTTPException, Depends, status
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
    try:
        with get_db() as conn:
            cur = conn.cursor()
            # ✅ Obtener username y password exactos de la tabla
            cur.execute(
                "SELECT * FROM usuarios WHERE username = %s", 
                (request.username,)
            )
            user = cur.fetchone()
            cur.close()
        
        if not user:
            raise HTTPException(status_code=401, detail="Credenciales incorrectas")
        
        # ✅ Comparar contraseña DIRECTAMENTE (sin bcrypt, sin hash)
        if not verify_password(request.password, user.get("password", "")):
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
        
        return {"access": token, "user": user_data}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en login: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/api/user/me/")
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
                "id": int(row["id"]),
                "nota_final": float(row["nota_final"]) if row["nota_final"] else None,
                "estado": str(row["estado"]),
                "seccion_detalle": {
                    "codigo_seccion": str(row["codigo_seccion"]),
                    "aula": str(row["aula"]),
                    "materia_detalle": {
                        "nombre": str(row["materia_nombre"]),
                        "codigo": str(row["materia_codigo"]),
                        "creditos": int(row["creditos"])
                    }
                },
                "pagado": bool(row["pagado"])
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
        
        historial = [to_python_type(dict(row)) for row in cur.fetchall()]
        cur.close()
    
    return historial

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
        
        # Mis secciones con horarios
        cur.execute("""
            SELECT 
                s.id,
                s.codigo_seccion,
                s.aula,
                s.dia,
                s.hora_inicio::text,
                s.hora_fin::text,
                m.nombre as materia_nombre,
                m.codigo as materia_codigo
            FROM secciones s
            JOIN materias m ON s.materia_id = m.id
            WHERE s.profesor_id = %s
            ORDER BY s.codigo_seccion
        """, (current_user["id"],))
        
        mis_clases = []
        for row in cur.fetchall():
            mis_clases.append({
                "id": int(row["id"]),
                "codigo": str(row["codigo_seccion"]),
                "materia": str(row["materia_nombre"]),
                "aula": str(row["aula"]),
                "horario": f"{row['dia']} {row['hora_inicio']}-{row['hora_fin']}"
            })
        
        cur.close()
    
    return {"mis_clases": mis_clases}

@app.get("/api/profesor/seccion/{seccion_id}/notas/")
async def get_alumnos_seccion(seccion_id: int, current_user: dict = Depends(get_current_user)):
    """Lista de estudiantes para gestionar notas"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        # Verificar pertenencia y obtener info de sección
        cur.execute("""
            SELECT s.profesor_id, m.nombre as materia, s.codigo_seccion
            FROM secciones s
            JOIN materias m ON s.materia_id = m.id
            WHERE s.id = %s
        """, (seccion_id,))
        seccion = cur.fetchone()
        
        if not seccion or seccion["profesor_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="No autorizado para esta sección")
        
        # Obtener estudiantes
        cur.execute("""
            SELECT 
                i.id as inscripcion_id,
                CONCAT(u.first_name, ' ', u.last_name) as alumno_nombre,
                u.username as alumno_carnet,
                i.nota_final as nota_actual
            FROM inscripciones i
            JOIN usuarios u ON i.estudiante_id = u.id
            WHERE i.seccion_id = %s
            ORDER BY u.last_name, u.first_name
        """, (seccion_id,))
        
        alumnos = []
        for row in cur.fetchall():
            alumnos.append({
                "inscripcion_id": int(row["inscripcion_id"]),
                "alumno_nombre": str(row["alumno_nombre"]),
                "alumno_carnet": str(row["alumno_carnet"]),
                "nota_actual": float(row["nota_actual"]) if row["nota_actual"] else None
            })
        
        cur.close()
    
    return {
        "materia": seccion["materia"],
        "codigo": seccion["codigo_seccion"],
        "alumnos": alumnos
    }

@app.post("/api/profesor/seccion/{seccion_id}/notas/")
async def guardar_notas(seccion_id: int, notas: dict, current_user: dict = Depends(get_current_user)):
    """Guarda notas de estudiantes"""
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        for nota_data in notas.get("notas", []):
            cur.execute("""
                UPDATE inscripciones 
                SET nota_final = %s, 
                    nota_puesta_por_id = %s, 
                    fecha_nota_puesta = NOW()
                WHERE id = %s
            """, (nota_data["nota"], current_user["id"], nota_data["inscripcion_id"]))
        
        cur.close()
    
    return {"message": "Notas guardadas exitosamente"}

# =====================================================
# ENDPOINTS - TESORERO
# =====================================================
@app.get("/api/finanzas/dashboard/")
async def finanzas_dashboard(current_user: dict = Depends(get_current_user)):
    """Dashboard financiero"""
    if current_user["rol"] not in ["tesorero", "director"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    with get_db() as conn:
        cur = conn.cursor()
        
        cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM pagos")
        ingreso_real = float(cur.fetchone()["total"])
        
        cur.execute("SELECT COUNT(*) as total FROM inscripciones")
        total_inscripciones = cur.fetchone()["total"]
        ingreso_proyectado = float(total_inscripciones * 150)
        
        cur.execute("""
            SELECT 
                COUNT(DISTINCT i.id) as total_inscripciones,
                COUNT(DISTINCT p.inscripcion_id) as inscripciones_pagadas
            FROM inscripciones i
            LEFT JOIN pagos p ON p.inscripcion_id = i.id
        """)
        cobranza = cur.fetchone()
        tasa_cobranza = (cobranza["inscripciones_pagadas"] / cobranza["total_inscripciones"] * 100) if cobranza["total_inscripciones"] > 0 else 0
        
        # Estudiantes con deuda (calculada)
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_completo,
                COUNT(i.id) * 150.0 as deuda_total,
                true as en_mora
            FROM usuarios u
            JOIN inscripciones i ON i.estudiante_id = u.id
            LEFT JOIN pagos p ON p.inscripcion_id = i.id
            WHERE u.rol = 'estudiante' AND p.id IS NULL
            GROUP BY u.id
            HAVING COUNT(i.id) > 0
            ORDER BY deuda_total DESC
            LIMIT 50
        """)
        
        listado_cobranza = []
        for row in cur.fetchall():
            listado_cobranza.append({
                "id": int(row["id"]),
                "username": str(row["username"]),
                "nombre_completo": str(row["nombre_completo"]),
                "deuda_total": float(row["deuda_total"]),
                "en_mora": bool(row["en_mora"])
            })
        
        cur.close()
    
    return {
        "ingreso_proyectado": ingreso_proyectado,
        "ingreso_real": ingreso_real,
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
        
        cur.execute("""
            SELECT i.id
            FROM inscripciones i
            LEFT JOIN pagos p ON p.inscripcion_id = i.id
            WHERE i.estudiante_id = %s AND p.id IS NULL
        """, (usuario_id,))
        
        pendientes = cur.fetchall()
        
        if not pendientes:
            return {"message": "No hay deudas pendientes"}
        
        for insc in pendientes:
            cur.execute("""
                INSERT INTO pagos (inscripcion_id, monto, metodo_pago, procesado_por_id, comprobante, fecha_pago)
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
        
        cur.execute("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'estudiante'")
        total_estudiantes = int(cur.fetchone()["total"])
        
        cur.execute("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'profesor'")
        total_profesores = int(cur.fetchone()["total"])
        
        cur.execute("SELECT COUNT(*) as total FROM materias")
        materias_totales = int(cur.fetchone()["total"])
        
        cur.execute("""
            SELECT 
                c.nombre,
                COUNT(u.id) as num_alumnos
            FROM carreras c
            LEFT JOIN usuarios u ON u.carrera_id = c.id AND u.rol = 'estudiante'
            GROUP BY c.id, c.nombre
            ORDER BY num_alumnos DESC
        """)
        estudiantes_por_carrera = [
            {"nombre": row["nombre"], "num_alumnos": int(row["num_alumnos"])} 
            for row in cur.fetchall()
        ]
        
        cur.execute("""
            SELECT AVG(CAST(nota_final AS DECIMAL)) as promedio
            FROM inscripciones
            WHERE nota_final IS NOT NULL
        """)
        promedio = float(cur.fetchone()["promedio"] or 0)
        
        cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM pagos")
        ingresos_totales = float(cur.fetchone()["total"])
        
        cur.execute("""
            SELECT 
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) as nombre_completo,
                CONCAT(u.first_name, ' ', u.last_name) as nombre,
                COUNT(i.id) * 150.0 as deuda_total,
                true as en_mora
            FROM usuarios u
            JOIN inscripciones i ON i.estudiante_id = u.id
            LEFT JOIN pagos p ON p.inscripcion_id = i.id
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
        
        cur.execute("SELECT * FROM usuarios WHERE id = %s AND rol = 'estudiante'", (estudiante_id,))
        estudiante = cur.fetchone()
        
        if not estudiante:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        
        carrera = None
        if estudiante.get("carrera_id"):
            cur.execute("SELECT id, nombre, codigo FROM carreras WHERE id = %s", (estudiante["carrera_id"],))
            carrera_data = cur.fetchone()
            if carrera_data:
                carrera = to_python_type(dict(carrera_data))
        
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
            FROM inscripciones i
            JOIN secciones s ON i.seccion_id = s.id
            JOIN materias m ON s.materia_id = m.id
            JOIN periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN pagos pg ON pg.inscripcion_id = i.id
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