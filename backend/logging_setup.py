"""
Logging estructurado (JSON) con request-id/correlation-id por request.

Antes de esta Fase 4 el proyecto solo tenía `logging.basicConfig` con texto
plano y ningún identificador que permitiera correlacionar todas las líneas
de log de un mismo request HTTP entre sí (crítico para diagnosticar un
incidente en producción con 800 usuarios activos: sin esto, es imposible
distinguir a qué request pertenece cada línea en un log con requests
concurrentes intercalados).

Uso:
    from logging_setup import configure_logging, RequestIdMiddleware
    configure_logging()                     # una vez, al arrancar la app
    app.add_middleware(RequestIdMiddleware)  # propaga/genera X-Request-ID

Cualquier `logging.getLogger(__name__).info(...)` hecho dentro del ciclo de
vida de un request queda automáticamente etiquetado con el `request_id`
correspondiente, sin tener que pasarlo explícitamente por cada función.
"""
import contextvars
import json
import logging
import uuid
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"

_request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)


def get_request_id() -> Optional[str]:
    return _request_id_ctx.get()


class _RequestIdLogFilter(logging.Filter):
    """Inyecta `record.request_id` (o '-' si no hay request en curso)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


class JsonLogFormatter(logging.Formatter):
    """Formatea cada línea de log como un objeto JSON de una sola línea."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    """
    Reemplaza la configuración de `logging.basicConfig` por un handler JSON
    con `request_id`. Idempotente: seguro de llamar más de una vez (por
    ejemplo, en tests) sin duplicar handlers.
    """
    root = logging.getLogger()
    root.setLevel(level)

    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    handler.addFilter(_RequestIdLogFilter())
    root.addHandler(handler)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Reutiliza el `X-Request-ID` entrante si el cliente/proxy ya lo mandó
    (útil para correlacionar con logs de Vercel/Render/un API gateway), o
    genera uno nuevo. Lo expone en `request.state.request_id`, en el
    contextvar (para que todos los logs de este request lo incluyan
    automáticamente) y lo devuelve en la respuesta para que el cliente
    pueda reportarlo al soporte técnico.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        request_id = incoming or uuid.uuid4().hex
        token = _request_id_ctx.set(request_id)
        request.state.request_id = request_id
        try:
            response = await call_next(request)
        finally:
            _request_id_ctx.reset(token)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
