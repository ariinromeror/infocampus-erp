"""Smoke tests: la aplicación arranca correctamente y responde en /api/health."""


def test_health_check_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


def test_docs_available(client):
    """El contrato OpenAPI se genera sin errores (valida que todos los
    response_model / schemas Pydantic de los routers son consistentes)."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/api/health" in schema["paths"]


def test_root_requires_auth_on_protected_endpoint(client):
    """Un endpoint protegido sin token debe responder 401, nunca 500."""
    response = client.get("/api/tesorero/resumen-kpis")
    assert response.status_code in (401, 403)
