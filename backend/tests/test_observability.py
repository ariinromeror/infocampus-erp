"""
Tests de `observability.py` (RQ-04/RQ-10 del PRD): logging estructurado en
JSON, propagación de `request_id`, y que Sentry sea un no-op seguro cuando
no hay DSN configurado (caso por defecto en local/CI).
"""
import json
import logging
from types import SimpleNamespace

import pytest

from observability import (
    JsonFormatter,
    RequestIdFilter,
    capture_exception_with_context,
    init_sentry,
    request_id_var,
)


def _make_record(level=logging.INFO, msg="mensaje de prueba", extra=None) -> logging.LogRecord:
    record = logging.LogRecord(
        name="tests.observability",
        level=level,
        pathname=__file__,
        lineno=1,
        msg=msg,
        args=(),
        exc_info=None,
    )
    for key, value in (extra or {}).items():
        setattr(record, key, value)
    return record


def test_json_formatter_produce_json_valido_con_campos_esperados():
    record = _make_record(extra={"endpoint": "/api/health", "user_rol": "director"})
    record.request_id = "abc123"

    output = JsonFormatter().format(record)
    payload = json.loads(output)

    assert payload["level"] == "INFO"
    assert payload["logger"] == "tests.observability"
    assert payload["message"] == "mensaje de prueba"
    assert payload["request_id"] == "abc123"
    assert payload["endpoint"] == "/api/health"
    assert payload["user_rol"] == "director"
    assert "timestamp" in payload


def test_json_formatter_incluye_traceback_si_hay_excepcion():
    try:
        raise ValueError("algo salió mal")
    except ValueError:
        import sys
        record = _make_record()
        record.exc_info = sys.exc_info()
        record.request_id = "-"

    payload = json.loads(JsonFormatter().format(record))

    assert "ValueError" in payload["exception"]
    assert "algo salió mal" in payload["exception"]


def test_request_id_filter_toma_el_valor_del_contextvar():
    token = request_id_var.set("mi-request-id")
    try:
        record = _make_record()
        assert RequestIdFilter().filter(record) is True
        assert record.request_id == "mi-request-id"
    finally:
        request_id_var.reset(token)


def test_request_id_filter_usa_guion_por_defecto_fuera_de_un_request():
    record = _make_record()
    RequestIdFilter().filter(record)
    assert record.request_id == "-"


def test_init_sentry_sin_dsn_devuelve_false():
    assert init_sentry(dsn="") is False


def test_capture_exception_with_context_no_lanza_sin_sentry_inicializado():
    """Sin SENTRY_DSN (caso de este test suite), sentry_sdk.capture_exception
    debe ser un no-op seguro: nunca debe romper el flujo de la app."""
    try:
        raise RuntimeError("error de negocio simulado")
    except RuntimeError as exc:
        capture_exception_with_context(
            exc,
            request_id="req-1",
            endpoint="/api/tesorero/resumen-kpis",
            method="GET",
            user_id=1,
            user_rol="tesorero",
        )
    # Si no se lanzó ninguna excepción hasta este punto, el test pasa.


@pytest.mark.asyncio
async def test_global_exception_handler_incluye_request_id_y_contexto(monkeypatch):
    import main

    captured = {}
    monkeypatch.setattr(
        main,
        "capture_exception_with_context",
        lambda exc, **kwargs: captured.update(kwargs),
    )

    fake_request = SimpleNamespace(
        state=SimpleNamespace(request_id="req-xyz", user_id=42, user_rol="tesorero"),
        method="GET",
        url=SimpleNamespace(path="/api/algo-que-falla"),
    )

    response = await main.global_exception_handler(fake_request, RuntimeError("boom"))

    assert response.status_code == 500
    body = json.loads(bytes(response.body))
    assert body["request_id"] == "req-xyz"
    assert captured == {
        "request_id": "req-xyz",
        "endpoint": "/api/algo-que-falla",
        "method": "GET",
        "user_id": 42,
        "user_rol": "tesorero",
    }


def test_health_response_incluye_header_x_request_id(client):
    response = client.get("/api/health")
    assert response.headers.get("x-request-id")


def test_request_id_entrante_se_reutiliza_en_la_respuesta(client):
    response = client.get("/api/health", headers={"X-Request-ID": "id-forzado-por-el-cliente"})
    assert response.headers.get("x-request-id") == "id-forzado-por-el-cliente"
