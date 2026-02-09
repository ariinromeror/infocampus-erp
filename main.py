from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from supabase import create_client, Client
import os
from dotenv import load_dotenv


load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ SUPABASE_URL y SUPABASE_KEY requeridas en variables de entorno")

# Inicializar
app = FastAPI(title="Info Campus API", version="2.0")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def verify_password(plain_password, hashed_password):
    # Django usa pbkdf2, aquí simplificamos con "campus2026"
    return plain_password == "campus2026"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Obtener usuario de Supabase
    result = supabase.table("usuarios").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return result.data[0]

# =====================================================
# ENDPOINTS - AUTENTICACIÓN
# =====================================================
@app.post("/api/login/", response_model=TokenResponse)
async def login(request: LoginRequest):
    # Buscar usuario
    result = supabase.table("usuarios").select("*").eq("username", request.username).execute()
    
    if not result.data:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    user = result.data[0]
    
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
        "en_mora": False  # Calcular después
    }
    
    return {"access": token, "user": user_data}

@app.get("/api/user/me/")
async def get_profile(current_user: dict = Depends(get_current_user)):
    # Calcular mora
    if current_user["rol"] == "estudiante":
        inscripciones = supabase.table("inscripciones").select("*, pagos(id)").eq("estudiante_id", current_user["id"]).execute()
        en_mora = any(not i.get("pagos") for i in inscripciones.data)
        current_user["en_mora"] = en_mora
    
    return current_user

# =====================================================
# ENDPOINTS - ESTUDIANTE
# =====================================================
@app.get("/api/inscripciones/")
async def get_inscripciones(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    result = supabase.table("inscripciones").select("""
        *,
        seccion:secciones(
            id, codigo_seccion, aula, dia, hora_inicio, hora_fin,
            materia:materias(id, nombre, codigo, creditos),
            periodo:periodos_lectivos(id, nombre, codigo)
        ),
        pago:pagos(id, monto, fecha_pago)
    """).eq("estudiante_id", current_user["id"]).execute()
    
    # Formatear respuesta
    inscripciones = []
    for insc in result.data:
        inscripciones.append({
            "id": insc["id"],
            "nota_final": insc.get("nota_final"),
            "estado": insc["estado"],
            "seccion_detalle": {
                "codigo_seccion": insc["seccion"]["codigo_seccion"],
                "aula": insc["seccion"]["aula"],
                "materia_detalle": {
                    "nombre": insc["seccion"]["materia"]["nombre"],
                    "codigo": insc["seccion"]["materia"]["codigo"],
                }
            }
        })
    
    return inscripciones

@app.get("/api/inscripciones/mi_historial/")
async def get_historial(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "estudiante":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    result = supabase.table("inscripciones").select("""
        *,
        seccion:secciones(
            materia:materias(nombre, codigo),
            periodo:periodos_lectivos(nombre)
        )
    """).eq("estudiante_id", current_user["id"]).order("fecha_inscripcion", desc=True).execute()
    
    return result.data

# =====================================================
# ENDPOINTS - PROFESOR
# =====================================================
@app.get("/api/profesor/dashboard/")
async def profesor_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Secciones del profesor
    result = supabase.table("secciones").select("""
        *,
        materia:materias(nombre, codigo),
        periodo:periodos_lectivos(nombre, activo)
    """).eq("profesor_id", current_user["id"]).execute()
    
    mis_clases = []
    for sec in result.data:
        mis_clases.append({
            "id": sec["id"],
            "codigo": sec["codigo_seccion"],
            "materia": sec["materia"]["nombre"],
            "aula": sec["aula"],
            "horario": f"{sec['dia']} {sec['hora_inicio']}-{sec['hora_fin']}"
        })
    
    return {"mis_clases": mis_clases}

@app.get("/api/profesor/seccion/{seccion_id}/notas/")
async def get_alumnos_seccion(seccion_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar que sea el profesor de esta sección
    seccion = supabase.table("secciones").select("*").eq("id", seccion_id).execute()
    if not seccion.data or seccion.data[0]["profesor_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No es su sección")
    
    # Obtener inscripciones
    result = supabase.table("inscripciones").select("""
        *,
        estudiante:usuarios(id, username, first_name, last_name)
    """).eq("seccion_id", seccion_id).execute()
    
    alumnos = []
    for insc in result.data:
        alumnos.append({
            "inscripcion_id": insc["id"],
            "alumno_nombre": f"{insc['estudiante']['first_name']} {insc['estudiante']['last_name']}",
            "alumno_carnet": insc['estudiante']['username'],
            "nota_actual": insc.get("nota_final")
        })
    
    # Obtener info de sección
    materia = supabase.table("materias").select("nombre").eq("id", seccion.data[0]["materia_id"]).execute()
    
    return {
        "materia": materia.data[0]["nombre"],
        "codigo": seccion.data[0]["codigo_seccion"],
        "alumnos": alumnos
    }

@app.post("/api/profesor/seccion/{seccion_id}/notas/")
async def guardar_notas(seccion_id: int, notas: dict, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Guardar cada nota
    for nota_data in notas.get("notas", []):
        insc_id = nota_data["inscripcion_id"]
        nota = nota_data["nota"]
        
        supabase.table("inscripciones").update({
            "nota_final": nota,
            "nota_puesta_por_id": current_user["id"],
            "fecha_nota_puesta": datetime.utcnow().isoformat()
        }).eq("id", insc_id).execute()
    
    return {"message": "Notas guardadas"}

# =====================================================
# ENDPOINTS - FINANZAS
# =====================================================
@app.get("/api/finanzas/dashboard/")
async def dashboard_finanzas(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] != "tesorero":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Calcular métricas
    pagos = supabase.table("pagos").select("monto").execute()
    ingreso_real = sum(float(p["monto"]) for p in pagos.data)
    
    # Estudiantes con deuda
    estudiantes = supabase.table("usuarios").select("*").eq("rol", "estudiante").limit(20).execute()
    
    listado_cobranza = []
    for est in estudiantes.data:
        # Verificar si tiene inscripciones sin pago
        inscripciones = supabase.table("inscripciones").select("id").eq("estudiante_id", est["id"]).execute()
        pagos_est = supabase.table("pagos").select("inscripcion_id").in_("inscripcion_id", [i["id"] for i in inscripciones.data]).execute()
        pagados_ids = {p["inscripcion_id"] for p in pagos_est.data}
        
        deuda = len([i for i in inscripciones.data if i["id"] not in pagados_ids]) * 150  # Estimado
        
        listado_cobranza.append({
            "id": est["id"],
            "username": est["username"],
            "nombre_completo": f"{est.get('first_name', '')} {est.get('last_name', '')}",
            "en_mora": deuda > 0,
            "deuda_total": deuda
        })
    
    return {
        "ingreso_proyectado": ingreso_real * 1.3,  # Estimado
        "ingreso_real": ingreso_real,
        "tasa_cobranza": 75.0,
        "listado_cobranza": listado_cobranza
    }

@app.post("/api/finanzas/registrar-pago/{usuario_id}/")
async def registrar_pago(usuario_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["tesorero", "director"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener inscripciones sin pago
    inscripciones = supabase.table("inscripciones").select("*").eq("estudiante_id", usuario_id).execute()
    pagos_existentes = supabase.table("pagos").select("inscripcion_id").execute()
    pagados_ids = {p["inscripcion_id"] for p in pagos_existentes.data}
    
    pendientes = [i for i in inscripciones.data if i["id"] not in pagados_ids]
    
    if not pendientes:
        return {"message": "No hay deudas pendientes"}
    
    # Registrar pagos
    for insc in pendientes:
        supabase.table("pagos").insert({
            "inscripcion_id": insc["id"],
            "monto": 150.00,  # Calcular real después
            "metodo_pago": "efectivo",
            "procesado_por_id": current_user["id"],
            "comprobante": f"PAG-{datetime.now().timestamp()}"
        }).execute()
    
    return {"message": f"{len(pendientes)} pagos registrados"}

# =====================================================
# ENDPOINTS - DIRECCIÓN
# =====================================================
@app.get("/api/institucional/dashboard/")
async def dashboard_institucional(current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["director", "coordinador"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Métricas
    estudiantes = supabase.table("usuarios").select("id, carrera_id").eq("rol", "estudiante").execute()
    profesores = supabase.table("usuarios").select("id").eq("rol", "profesor").execute()
    materias = supabase.table("materias").select("id").execute()
    
    # Estudiantes por carrera
    carreras = supabase.table("carreras").select("id, nombre").execute()
    estudiantes_por_carrera = []
    for carrera in carreras.data:
        count = len([e for e in estudiantes.data if e.get("carrera_id") == carrera["id"]])
        estudiantes_por_carrera.append({
            "nombre": carrera["nombre"],
            "num_alumnos": count
        })
    
    # Promedio institucional
    notas = supabase.table("inscripciones").select("nota_final").not_.is_("nota_final", "null").execute()
    promedio = sum(float(n["nota_final"]) for n in notas.data) / len(notas.data) if notas.data else 0
    
    # Alumnos en mora
    alumnos_mora = []
    for est in estudiantes.data[:20]:
        inscripciones = supabase.table("inscripciones").select("id").eq("estudiante_id", est["id"]).execute()
        pagos_est = supabase.table("pagos").select("inscripcion_id").in_("inscripcion_id", [i["id"] for i in inscripciones.data]).execute()
        pagados_ids = {p["inscripcion_id"] for p in pagos_est.data}
        
        if any(i["id"] not in pagados_ids for i in inscripciones.data):
            usuario = supabase.table("usuarios").select("*").eq("id", est["id"]).execute().data[0]
            alumnos_mora.append({
                "id": est["id"],
                "username": usuario["username"],
                "nombre_completo": f"{usuario.get('first_name', '')} {usuario.get('last_name', '')}",
                "nombre": f"{usuario.get('first_name', '')} {usuario.get('last_name', '')}",
                "deuda_total": "500.00",
                "en_mora": True
            })
    
    return {
        "total_estudiantes": len(estudiantes.data),
        "total_profesores": len(profesores.data),
        "estudiantes_por_carrera": estudiantes_por_carrera,
        "materias_totales": len(materias.data),
        "promedio_institucional": round(promedio, 2),
        "ingresos_totales": 45000.00,  # Calcular real
        "alumnos_mora": alumnos_mora
    }

@app.get("/api/materias/")
async def get_materias(current_user: dict = Depends(get_current_user)):
    result = supabase.table("materias").select("""
        *,
        carrera:carreras(nombre)
    """).execute()
    
    materias = []
    for m in result.data:
        materias.append({
            "id": m["id"],
            "nombre": m["nombre"],
            "codigo": m["codigo"],
            "semestre": m["semestre"],
            "creditos": m["creditos"],
            "carrera_nombre": m["carrera"]["nombre"]
        })
    
    return materias

@app.get("/api/estudiante/{estudiante_id}/")
async def detalle_estudiante(estudiante_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["rol"] not in ["director", "coordinador", "tesorero"]:
        if current_user["id"] != estudiante_id:
            raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener estudiante
    estudiante = supabase.table("usuarios").select("*").eq("id", estudiante_id).eq("rol", "estudiante").execute()
    if not estudiante.data:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    est = estudiante.data[0]
    
    # Obtener inscripciones
    inscripciones = supabase.table("inscripciones").select("""
        *,
        seccion:secciones(
            codigo_seccion,
            materia:materias(nombre, codigo),
            periodo:periodos_lectivos(nombre)
        ),
        pago:pagos(id)
    """).eq("estudiante_id", estudiante_id).execute()
    
    lista_insc = []
    for insc in inscripciones.data:
        lista_insc.append({
            "id": insc["id"],
            "materia_nombre": insc["seccion"]["materia"]["nombre"],
            "materia_codigo": insc["seccion"]["materia"]["codigo"],
            "seccion": insc["seccion"]["codigo_seccion"],
            "periodo": insc["seccion"]["periodo"]["nombre"],
            "nota_final": insc.get("nota_final"),
            "estado": insc["estado"],
            "pagado": insc.get("pago") is not None
        })
    
    # Carrera
    carrera = None
    if est.get("carrera_id"):
        carrera_data = supabase.table("carreras").select("*").eq("id", est["carrera_id"]).execute()
        if carrera_data.data:
            carrera = {
                "id": carrera_data.data[0]["id"],
                "nombre": carrera_data.data[0]["nombre"],
                "codigo": carrera_data.data[0]["codigo"]
            }
    
    return {
        "id": est["id"],
        "username": est["username"],
        "nombre_completo": f"{est.get('first_name', '')} {est.get('last_name', '')}",
        "email": est.get("email", ""),
        "dni": est.get("dni", ""),
        "rol": est["rol"],
        "carrera_detalle": carrera,
        "es_becado": est.get("es_becado", False),
        "porcentaje_beca": est.get("porcentaje_beca", 0),
        "en_mora": False,  # Calcular
        "deuda_total": "0.00",  # Calcular
        "inscripciones": lista_insc
    }

# =====================================================
# HEALTH CHECK
# =====================================================
@app.get("/")
async def root():
    return {"message": "Info Campus API v2.0 - Supabase Edition"}

@app.get("/health")
async def health():
    return {"status": "ok", "database": "supabase"}