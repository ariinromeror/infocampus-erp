"""
Tests de la app FastAPI a nivel de infraestructura: CORS, cabeceras de
seguridad y health check.
"""
import pytest
from fastapi.testclient import TestClient

import main
from tests.fakes import fake_get_db, fake_get_db_raises, FakeConnection


@pytest.fixture()
def client():
    return TestClient(main.app)


# ---------------------------------------------------------------------------
# resolve_cors_origins — logica pura de resolucion de CORS
# ---------------------------------------------------------------------------

def test_resolve_cors_origins_produccion_sin_config_falla_cerrado():
    origins, use_wildcard = main.resolve_cors_origins("", "production")
    assert origins == []
    assert use_wildcard is False


def test_resolve_cors_origins_produccion_con_config():
    origins, use_wildcard = main.resolve_cors_origins(
        "https://a.example.com, https://b.example.com", "production"
    )
    assert origins == ["https://a.example.com", "https://b.example.com"]
    assert use_wildcard is False


def test_resolve_cors_origins_desarrollo_sin_config_usa_wildcard():
    origins, use_wildcard = main.resolve_cors_origins("", "development")
    assert origins == []
    assert use_wildcard is True


def test_resolve_cors_origins_wildcard_explicito_fuera_de_produccion():
    origins, use_wildcard = main.resolve_cors_origins("*", "development")
    assert use_wildcard is True


# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------

def test_security_headers_presentes_en_toda_respuesta(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "permissions-policy" in response.headers


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health_check_ok_cuando_db_responde(client, monkeypatch):
    conn = FakeConnection(fetchrow_results=[{"?column?": 1}])
    monkeypatch.setattr(main, "get_db", fake_get_db(conn))

    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"


def test_health_check_503_cuando_db_falla(client, monkeypatch):
    monkeypatch.setattr(main, "get_db", fake_get_db_raises(RuntimeError("sin conexion")))

    response = client.get("/api/health")
    assert response.status_code == 503
