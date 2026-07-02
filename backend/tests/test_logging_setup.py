"""
Tests del logging estructurado y el middleware de request-id
(backend/logging_setup.py).
"""
import json
import logging

import pytest
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient

from logging_setup import (
    REQUEST_ID_HEADER,
    JsonLogFormatter,
    RequestIdMiddleware,
    _request_id_ctx,
    configure_logging,
    get_request_id,
)


class TestJsonLogFormatter:
    def _make_record(self, request_id="-"):
        record = logging.LogRecord(
            name="test.logger",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hola mundo",
            args=(),
            exc_info=None,
        )
        record.request_id = request_id
        return record

    def test_format_produces_valid_json_with_expected_fields(self):
        formatter = JsonLogFormatter()
        record = self._make_record(request_id="abc-123")

        output = formatter.format(record)
        data = json.loads(output)

        assert data["message"] == "hola mundo"
        assert data["level"] == "INFO"
        assert data["logger"] == "test.logger"
        assert data["request_id"] == "abc-123"
        assert "timestamp" in data

    def test_format_includes_exception_when_present(self):
        formatter = JsonLogFormatter()
        try:
            raise ValueError("boom")
        except ValueError:
            import sys

            record = logging.LogRecord(
                name="test.logger",
                level=logging.ERROR,
                pathname=__file__,
                lineno=1,
                msg="fallo",
                args=(),
                exc_info=sys.exc_info(),
            )
        record.request_id = "-"

        data = json.loads(formatter.format(record))
        assert "exception" in data
        assert "ValueError: boom" in data["exception"]


class TestConfigureLogging:
    def test_is_idempotent_does_not_duplicate_handlers(self):
        configure_logging()
        configure_logging()
        configure_logging()

        root = logging.getLogger()
        assert len(root.handlers) == 1


class TestRequestIdContextvar:
    def test_get_request_id_returns_none_outside_request(self):
        token = _request_id_ctx.set(None)
        try:
            assert get_request_id() is None
        finally:
            _request_id_ctx.reset(token)


class TestRequestIdMiddleware:
    @pytest.fixture()
    def client(self):
        async def echo_request_id(request):
            return JSONResponse({"seen_request_id": get_request_id()})

        app = Starlette(routes=[Route("/echo", echo_request_id)])
        app.add_middleware(RequestIdMiddleware)
        return TestClient(app)

    def test_generates_request_id_when_none_provided(self, client):
        response = client.get("/echo")

        assert response.status_code == 200
        header_id = response.headers.get(REQUEST_ID_HEADER)
        assert header_id
        assert response.json()["seen_request_id"] == header_id

    def test_reuses_incoming_request_id_header(self, client):
        response = client.get("/echo", headers={REQUEST_ID_HEADER: "client-supplied-id"})

        assert response.headers.get(REQUEST_ID_HEADER) == "client-supplied-id"
        assert response.json()["seen_request_id"] == "client-supplied-id"

    def test_request_id_is_isolated_between_requests(self, client):
        first = client.get("/echo").headers[REQUEST_ID_HEADER]
        second = client.get("/echo").headers[REQUEST_ID_HEADER]
        assert first != second

    def test_context_is_cleared_after_request(self, client):
        client.get("/echo")
        assert get_request_id() is None
