"""
Observability básica (RQ-10 del PRD): logging estructurado en JSON + error
tracking con Sentry, ambos con un `request_id` compartido para poder
correlacionar una entrada de log con un evento de Sentry y con la respuesta
que recibió el cliente (se expone también como header `X-Request-ID`).

Sentry es completamente opcional: si `SENTRY_DSN` no está configurado (caso
por defecto en local/CI), `init_sentry()` no hace nada y el resto de la app
funciona exactamente igual — no hay una dependencia dura del servicio.
"""
import contextvars
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

# Atributos "propios" de un LogRecord estándar de logging — todo lo que no
# esté en esta lista viene de `extra={...}` y se vuelca tal cual al JSON.
_STANDARD_LOG_ATTRS = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "message", "request_id", "taskName",
}


class RequestIdFilter(logging.Filter):
    """Inyecta el `request_id` del contexto actual en cada LogRecord, para que
    todos los logs emitidos durante el procesamiento de un request —sin
    importar en qué módulo se generen— compartan el mismo identificador."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class JsonFormatter(logging.Formatter):
    """Formatea cada log como una línea JSON: timestamp, nivel, logger,
    mensaje, request_id y cualquier campo adicional pasado vía `extra=`
    (típicamente endpoint, method, user_id, user_rol)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_LOG_ATTRS and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    """Reemplaza la configuración de `logging.basicConfig` (texto libre) por
    JSON estructurado en un único handler de consola (Render/stdout logging
    ya lo recolecta como texto plano; JSON permite parsearlo/filtrarlo)."""
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


def init_sentry(dsn: str, environment: str = "development", release: Optional[str] = None) -> bool:
    """Inicializa Sentry si hay DSN configurado. Devuelve True si quedó
    activo. No lanza si el DSN es inválido o el import falla: la app debe
    poder arrancar igual sin observability."""
    if not dsn:
        logger.info("SENTRY_DSN no configurado: error tracking deshabilitado.")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            release=release,
            integrations=[
                StarletteIntegration(),
                FastApiIntegration(),
                # No duplicar: los errores no manejados ya se reportan a mano
                # desde el global_exception_handler (ver main.py) con contexto
                # de negocio (rol, endpoint). Aquí solo dejamos breadcrumbs de
                # logs de nivel INFO+ y evitamos que ERROR se reporte 2 veces.
                LoggingIntegration(level=logging.INFO, event_level=None),
            ],
            traces_sample_rate=0.0,  # proyecto portafolio: solo error tracking, sin APM
            send_default_pii=False,
        )
        logger.info("Sentry inicializado (environment=%s)", environment)
        return True
    except Exception:
        logger.exception("No se pudo inicializar Sentry; continuando sin error tracking.")
        return False


def capture_exception_with_context(
    exc: BaseException,
    *,
    request_id: str,
    endpoint: str,
    method: str,
    user_id: Optional[int] = None,
    user_rol: Optional[str] = None,
) -> None:
    """Envía una excepción a Sentry con el contexto de negocio disponible.
    No-op seguro si Sentry no fue inicializado (SENTRY_DSN vacío)."""
    try:
        import sentry_sdk
    except ImportError:
        return

    with sentry_sdk.new_scope() as scope:
        scope.set_tag("request_id", request_id)
        scope.set_tag("endpoint", endpoint)
        scope.set_tag("method", method)
        if user_rol:
            scope.set_user({"id": str(user_id) if user_id is not None else None, "role": user_rol})
        sentry_sdk.capture_exception(exc)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Genera (o reutiliza) un `request_id` por request: lo guarda en
    `request.state.request_id`, lo expone en el header `X-Request-ID` de la
    respuesta, y lo publica en un contextvar para que `RequestIdFilter` lo
    incluya automáticamente en todos los logs de ese request.

    También emite un log de acceso (uno por request) con `endpoint`, `method`,
    `status_code` y `duration_ms` — así el campo `endpoint` queda disponible
    en el log estructurado de RQ-10 sin tener que tocar los 14 routers uno
    por uno para agregarlo a cada `logger.info(...)` existente."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        incoming_id = request.headers.get("x-request-id")
        req_id = incoming_id or uuid.uuid4().hex
        request.state.request_id = req_id
        token = request_id_var.set(req_id)
        start = time.monotonic()
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        duration_ms = round((time.monotonic() - start) * 1000, 2)
        response.headers["X-Request-ID"] = req_id

        logger.info(
            "%s %s -> %s",
            request.method,
            request.url.path,
            response.status_code,
            extra={
                "endpoint": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "user_id": getattr(request.state, "user_id", None),
                "user_rol": getattr(request.state, "user_rol", None),
            },
        )
        return response
