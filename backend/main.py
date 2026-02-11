"""
Info Campus ERP API v2.0
FastAPI Backend - Arquitectura Modular
Migrado desde Django REST Framework
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

# Configuración
from .config import settings

# Database
from .database import init_connection_pool

# Routers
from .routers import auth, dashboards, inscripciones, estudiantes, periodos, reportes

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación
    Inicializa recursos al arrancar y los limpia al cerrar
    """
    # Startup
    logger.info("🚀 Iniciando Info Campus ERP API v2.0")
    try:
        init_connection_pool()
        logger.info("✅ Conexión a base de datos inicializada")
    except Exception as e:
        logger.error(f"❌ Error inicializando base de datos: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("👋 Cerrando Info Campus ERP API")


# Crear aplicación FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    API RESTful para sistema de gestión universitaria Info Campus.
    
    ## Autenticación
    Todos los endpoints (excepto login) requieren un token JWT válido.
    Incluye el token en el header: `Authorization: Bearer <token>`
    
    ## Roles
    - **estudiante**: Acceso a información académica personal
    - **profesor**: Gestión de notas y secciones
    - **coordinador**: Gestión académica institucional
    - **director**: Control total del sistema
    - **tesorero**: Gestión financiera
    - **administrativo**: Soporte administrativo
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configurar CORS
allowed_origins = [
    origin.strip() 
    for origin in settings.ALLOWED_ORIGINS.split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
    max_age=3600,
)

# =====================================================
# REGISTRAR ROUTERS
# =====================================================

# Router de autenticación
app.include_router(auth.router, prefix="/api")

# Router de dashboards
app.include_router(dashboards.router, prefix="/api")

# Routers de operaciones críticas (Fase 4)
app.include_router(inscripciones.router, prefix="/api")
app.include_router(estudiantes.router, prefix="/api")
app.include_router(periodos.router, prefix="/api")

# Routers de reportes PDF (Fase 5)
app.include_router(reportes.router, prefix="/api")

# Routers adicionales futuros:
# app.include_router(materias.router, prefix="/api")


# =====================================================
# ENDPOINTS DE SISTEMA
# =====================================================

@app.get("/")
async def root():
    """
    Endpoint raíz - Información básica del API
    """
    return {
        "message": f"{settings.APP_NAME} v{settings.APP_VERSION}",
        "status": "online",
        "database": "PostgreSQL",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    """
    Health check del sistema
    Verifica conexión a base de datos
    """
    try:
        from .database import get_db
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
        
        return {
            "status": "ok",
            "database": "connected",
            "version": settings.APP_VERSION
        }
    except Exception as e:
        logger.error(f"❌ Health check falló: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "database": "disconnected",
                "error": str(e)
            }
        )


# =====================================================
# MANEJADORES DE ERROR GLOBALES
# =====================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Manejador global de excepciones
    """
    logger.error(f"❌ Error no manejado: {exc}", exc_info=True)
    return {
        "error": "Error interno del servidor",
        "detail": str(exc)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
