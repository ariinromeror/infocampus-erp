# backend/main.py
"""
CORS configurado para producción Render + Vercel.
Se lee la variable de entorno ALLOWED_ORIGINS (CSV).
Si no está definida, cae al wildcard '*' para que la demo funcione sin configuración.

En .env de Render pon:
  ALLOWED_ORIGINS=https://tu-proyecto.vercel.app,https://tu-proyecto-git-main.vercel.app
"""

# ── Compatibility shim: passlib 1.7.4 expects bcrypt.__about__.__version__
# bcrypt >= 4.0.0 removed __about__; this patch silences the warning without
# changing any hashing behaviour.
import bcrypt as _bcrypt_raw
if not hasattr(_bcrypt_raw, '__about__'):
    class _FakeAbout:
        __version__ = getattr(_bcrypt_raw, '__version__', '4.0.0')
    _bcrypt_raw.__about__ = _FakeAbout()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings
from database import init_connection_pool, get_db
from routers import auth, dashboards, inscripciones, estudiantes, periodos, reportes
import routers.estudiante_dashboard as estudiante_dashboard
from routers.tesorero import router as tesorero_router
from routers.profesor_routes import router as profesor_router
from routers.academico import router as academico_router
from routers.administrativo import router as administrativo_router
from routers.estudiante_routes import router as estudiante_router
from routers.ia_context import router as ia_router
from routers.director_router import router as director_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Info Campus ERP API v2.0")
    try:
        await init_connection_pool()
        logger.info("Conexión a base de datos inicializada")
    except Exception as e:
        logger.error(f"Error inicializando base de datos: {e}")
        raise

    # Aplica migraciones SQL idempotentes al arrancar.
    # Usa advisory lock para evitar deadlock cuando varios workers (gunicorn) arrancan a la vez.
    MIGRATION_LOCK_ID = 0x494346455250  # "ICERP" en hex
    migration_file = os.path.join(os.path.dirname(__file__), "migrations", "001_revoked_tokens.sql")
    if os.path.exists(migration_file):
        with open(migration_file, "r") as f:
            sql = f.read()
        try:
            async with get_db() as conn:
                await conn.execute(f"SELECT pg_advisory_lock({MIGRATION_LOCK_ID})")
                try:
                    await conn.execute(sql)
                    logger.info("✅ Migración 001_revoked_tokens aplicada")
                finally:
                    await conn.execute(f"SELECT pg_advisory_unlock({MIGRATION_LOCK_ID})")
        except Exception as e:
            logger.error(f"❌ Error en migración: {e}")

    yield
    logger.info("Cerrando Info Campus ERP API")


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
    - **administrativo**: Gestión de usuarios e inscripciones
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — producción Render + Vercel
# ---------------------------------------------------------------------------
# Prioridad:
#   1. Variable de entorno ALLOWED_ORIGINS (lista CSV) — úsala en producción real.
#   2. Si no está definida o es vacía → wildcard "*" para demo pública.
#
# Ejemplo de variable en Render:
#   ALLOWED_ORIGINS=https://ariinromeror-infocampus-erp.vercel.app,https://infocampus-erp.vercel.app
# ---------------------------------------------------------------------------
_raw_origins = getattr(settings, "ALLOWED_ORIGINS", "") or os.getenv("ALLOWED_ORIGINS", "")
allowed_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Si no se configuró ningún origen explícito, abrimos wildcard para la demo.
# En modo wildcard FastAPI no puede usar allow_credentials=True, así que lo
# desactivamos automáticamente.
use_wildcard = not allowed_origins or allowed_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if use_wildcard else allowed_origins,
    allow_credentials=not use_wildcard,   # False con wildcard (restricción de spec CORS)
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept"],
    expose_headers=["Content-Disposition"],
    max_age=86400,  # 24 h de preflight cache → reduce OPTIONS latency
)

if use_wildcard:
    logger.warning(
        "⚠️  CORS en modo wildcard '*'. "
        "Define ALLOWED_ORIGINS en .env para restringir en producción real."
    )
else:
    logger.info(f"✅ CORS configurado para: {allowed_origins}")

# ---------------------------------------------------------------------------
# Rate limiting (SlowAPI)
# ---------------------------------------------------------------------------
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# ---------------------------------------------------------------------------
# Global 500 handler — unhandled exceptions (HTTPException handled by FastAPI)
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Catches unhandled exceptions and returns 500. Re-raises HTTPException."""
    if isinstance(exc, HTTPException):
        raise exc
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api")
app.include_router(dashboards.router, prefix="/api")
app.include_router(inscripciones.router, prefix="/api")
app.include_router(estudiantes.router, prefix="/api")
app.include_router(periodos.router, prefix="/api")
app.include_router(reportes.router, prefix="/api")
app.include_router(estudiante_dashboard.router, prefix="/api")
app.include_router(estudiante_router, prefix="/api")
app.include_router(tesorero_router, prefix="/api")
app.include_router(profesor_router, prefix="/api")
app.include_router(academico_router, prefix="/api")
app.include_router(administrativo_router, prefix="/api")
app.include_router(ia_router, prefix="/api")
app.include_router(director_router, prefix="/api")


# ---------------------------------------------------------------------------
# Health / Root
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "message": f"{settings.APP_NAME} v{settings.APP_VERSION}",
        "status": "online",
        "database": "PostgreSQL",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
async def health_check():
    try:
        async with get_db() as conn:
            result = await conn.fetchrow("SELECT 1")
        return {
            "status": "ok",
            "database": "connected",
            "version": settings.APP_VERSION,
            "check": result,
        }
    except Exception as e:
        logger.error(f"Health check falló: {e}")
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "disconnected", "error": str(e)},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")