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

from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings
from database import init_connection_pool, get_db, get_pool_stats
from logging_setup import RequestIdMiddleware, configure_logging
from migrations_runner import apply_pending_migrations_async
from routers import auth, dashboards, inscripciones, estudiantes, periodos, reportes
import routers.estudiante_dashboard as estudiante_dashboard
from routers.tesorero import router as tesorero_router
from routers.profesor_routes import router as profesor_router
from routers.academico import router as academico_router
from routers.administrativo import router as administrativo_router
from routers.estudiante_routes import router as estudiante_router
from routers.ia_context import router as ia_router
from routers.director_router import router as director_router

configure_logging()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sentry — captura de errores centralizada (opcional, ver config.py).
# Sin SENTRY_DSN configurado, sentry_sdk.init() simplemente no se llama y el
# sistema funciona igual, solo sin reporte de errores a Sentry.
# ---------------------------------------------------------------------------
if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.APP_VERSION,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        # send_default_pii=False (default): evita enviar datos personales
        # (IP, cookies, cuerpos de request) automáticamente. El contexto de
        # usuario que sí se adjunta explícitamente (ver auth/dependencies.py
        # o middlewares) se limita a id/rol, nunca contraseñas ni tokens.
        send_default_pii=False,
    )
    logger.info("✅ Sentry inicializado (environment=%s)", settings.ENVIRONMENT)
else:
    logger.info("Sentry no configurado (SENTRY_DSN vacío): captura de errores centralizada deshabilitada.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Info Campus ERP API v2.0")
    try:
        await init_connection_pool()
        logger.info("Conexión a base de datos inicializada")
    except Exception as e:
        logger.error(f"Error inicializando base de datos: {e}")
        raise

    # Aplica migraciones SQL versionadas pendientes al arrancar (backend/migrations/).
    # Usa advisory lock para evitar deadlock/carreras cuando varios workers
    # (gunicorn) arrancan a la vez y compiten por aplicar el mismo esquema.
    MIGRATION_LOCK_ID = 0x494346455250  # "ICERP" en hex
    try:
        async with get_db() as conn:
            await conn.execute(f"SELECT pg_advisory_lock({MIGRATION_LOCK_ID})")
            try:
                applied = await apply_pending_migrations_async(get_db)
                if applied:
                    logger.info("✅ Migraciones aplicadas: %s", ", ".join(applied))
            finally:
                await conn.execute(f"SELECT pg_advisory_unlock({MIGRATION_LOCK_ID})")
    except Exception as e:
        logger.error(f"❌ Error aplicando migraciones: {e}")

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
#   1. Variable de entorno ALLOWED_ORIGINS (lista CSV) — obligatoria en producción.
#   2. Fuera de producción (ENVIRONMENT != "production"), si no está definida
#      cae a wildcard "*" para facilitar el desarrollo local.
#
# En producción, si ALLOWED_ORIGINS no está configurado, NO se abre el
# wildcard: se falla "cerrado" (sin orígenes permitidos) y se loguea un
# error crítico, para evitar exponer la API a cualquier origen por un
# despliegue mal configurado.
#
# Ejemplo de variable en Render:
#   ALLOWED_ORIGINS=https://ariinromeror-infocampus-erp.vercel.app,https://infocampus-erp.vercel.app
# ---------------------------------------------------------------------------
def resolve_cors_origins(raw_origins: str, environment: str) -> tuple[list[str], bool]:
    """
    Resuelve la lista de origenes CORS y si se debe usar wildcard '*'.

    Funcion pura (sin efectos secundarios) para poder testearla de forma
    aislada. Devuelve (allowed_origins, use_wildcard).
    """
    origins = [o.strip() for o in (raw_origins or "").split(",") if o.strip()]
    is_prod = (environment or "production").lower() == "production"
    use_wc = (not origins or origins == ["*"]) and not is_prod
    return (origins, use_wc)


_raw_origins = getattr(settings, "ALLOWED_ORIGINS", "") or os.getenv("ALLOWED_ORIGINS", "")
is_production = getattr(settings, "ENVIRONMENT", "production").lower() == "production"
allowed_origins, use_wildcard = resolve_cors_origins(_raw_origins, getattr(settings, "ENVIRONMENT", "production"))

if not allowed_origins and is_production:
    logger.error(
        "❌ ALLOWED_ORIGINS no está configurado en producción (ENVIRONMENT=production). "
        "La API no aceptará peticiones cross-origin hasta que se configure. "
        "Define ALLOWED_ORIGINS en las variables de entorno de Render."
    )

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
        "⚠️  CORS en modo wildcard '*' (solo permitido fuera de producción). "
        "Define ALLOWED_ORIGINS en .env para restringir en producción real."
    )
else:
    logger.info(f"✅ CORS configurado para: {allowed_origins}")

# ---------------------------------------------------------------------------
# Security headers — mitigación básica de clickjacking, MIME sniffing y
# leakage de referrer. No sustituye una revisión de seguridad completa.
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "geolocation=(), camera=(), microphone=()"
    )
    if is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
        )
    return response


# ---------------------------------------------------------------------------
# Rate limiting (SlowAPI)
# ---------------------------------------------------------------------------
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# Request-ID — propaga/genera X-Request-ID y lo adjunta a cada log de la
# petición (ver logging_setup.py). Se añade después de SlowAPI para que el
# ID esté disponible también en logs de rate-limit.
# ---------------------------------------------------------------------------
app.add_middleware(RequestIdMiddleware)

# ---------------------------------------------------------------------------
# Métricas Prometheus — expone /metrics con latencia por endpoint, tasa de
# error y throughput. Instrumentator debe inicializarse antes del startup
# del app (se engancha via evento) pero después de que existan los routers
# no es estrictamente necesario; se hace aquí, tras registrar middlewares,
# y expose() se llama después de incluir los routers más abajo.
# ---------------------------------------------------------------------------
Instrumentator().instrument(app)


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

# Expone /metrics (formato Prometheus) tras registrar todos los routers, para
# que las rutas aparezcan correctamente etiquetadas en las métricas por
# endpoint (handler). No requiere autenticación: en Render, restringir el
# acceso externo a /metrics vía firewall/proxy si se expone públicamente, o
# apuntar el scraper de Prometheus/Grafana Cloud directamente con su token.
Instrumentator().expose(app, endpoint="/metrics", include_in_schema=False)


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
    """
    Chequeo de salud enriquecido para monitoreo/alertas (Fase 4):
    - Conectividad a la base de datos (obligatoria: 503 si falla).
    - Estadísticas del pool de conexiones (saturación).
    - Estado de Redis (best-effort, no crítico: la app degrada sin caché).

    Usar este endpoint para alertas de uptime (UptimeRobot, Render health
    checks, StatusCake, etc.) apuntando a un umbral de "status == ok" y
    tiempo de respuesta.
    """
    try:
        async with get_db() as conn:
            result = await conn.fetchrow("SELECT 1")
    except Exception as e:
        logger.error(f"Health check falló: {e}")
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "disconnected", "error": str(e)},
        )

    pool_stats = get_pool_stats()
    redis_status = "disabled"
    if settings.REDIS_URL:
        try:
            from cache import get_redis_client

            client = get_redis_client()
            if client is not None:
                await client.ping()
                redis_status = "connected"
            else:
                redis_status = "unavailable"
        except Exception as e:
            redis_status = "unavailable"
            logger.warning("Health check: Redis no disponible: %s", e)

    return {
        "status": "ok",
        "database": "connected",
        "version": settings.APP_VERSION,
        "check": result,
        "db_pool": pool_stats,
        "redis": redis_status,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")