"""
Tests de integracion del endpoint de login: credenciales invalidas y
rate limiting (5 intentos/minuto), que es la primera linea de defensa
contra fuerza bruta.
"""
import pytest
from fastapi.testclient import TestClient

import main
import routers.auth as auth_router
from tests.fakes import fake_get_db, FakeConnection


@pytest.fixture()
def client():
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Limpia el estado del limiter entre tests para que no se contaminen entre si."""
    yield
    try:
        auth_router.limiter.reset()
    except Exception:
        pass


def test_login_credenciales_invalidas_devuelve_401(client, monkeypatch):
    conn = FakeConnection(fetchrow_results=[None] * 10)  # usuario no encontrado
    monkeypatch.setattr(auth_router, "get_db", fake_get_db(conn))

    response = client.post("/api/auth/login", json={"username": "no-existe", "password": "x"})
    assert response.status_code == 401


def test_login_rate_limit_bloquea_tras_5_intentos_por_minuto(client, monkeypatch):
    conn = FakeConnection(fetchrow_results=[None] * 10)
    monkeypatch.setattr(auth_router, "get_db", fake_get_db(conn))

    statuses = []
    for _ in range(6):
        response = client.post("/api/auth/login", json={"username": "no-existe", "password": "x"})
        statuses.append(response.status_code)

    assert statuses[:5] == [401] * 5
    assert statuses[5] == 429
