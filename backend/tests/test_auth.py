"""
Tests de integración de autenticación (RQ-04 del PRD): login válido/inválido,
rate limiting de 5 intentos/minuto y ciclo de vida del token (logout → revocación).
"""
import pytest

from tests.conftest import auth_headers, login_and_get_token

pytestmark = pytest.mark.asyncio


async def test_login_exitoso_devuelve_token_y_datos_usuario(client, clean_db, seed):
    usuario = await seed.usuario("estudiante", password="ClaveSegura123!")

    response = client.post(
        "/api/auth/login",
        json={"username": usuario["cedula"], "password": "ClaveSegura123!"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["rol"] == "estudiante"
    assert body["user"]["cedula"] == usuario["cedula"]


async def test_login_con_email_tambien_funciona(client, clean_db, seed):
    usuario = await seed.usuario("estudiante", password="ClaveSegura123!")

    response = client.post(
        "/api/auth/login",
        json={"username": usuario["email"], "password": "ClaveSegura123!"},
    )

    assert response.status_code == 200


async def test_login_con_password_incorrecta_devuelve_401(client, clean_db, seed):
    usuario = await seed.usuario("estudiante", password="ClaveSegura123!")

    response = client.post(
        "/api/auth/login",
        json={"username": usuario["cedula"], "password": "password-incorrecta"},
    )

    assert response.status_code == 401


async def test_login_usuario_inexistente_devuelve_401(client, clean_db):
    response = client.post(
        "/api/auth/login",
        json={"username": "no-existe-0000", "password": "cualquiera"},
    )
    assert response.status_code == 401


async def test_login_usuario_inactivo_devuelve_401(client, clean_db, seed):
    usuario = await seed.usuario("estudiante", password="ClaveSegura123!", activo=False)

    response = client.post(
        "/api/auth/login",
        json={"username": usuario["cedula"], "password": "ClaveSegura123!"},
    )

    assert response.status_code == 401


async def test_rate_limit_bloquea_al_sexto_intento_por_minuto(client, clean_db, seed):
    usuario = await seed.usuario("estudiante", password="ClaveSegura123!")

    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            json={"username": usuario["cedula"], "password": "password-incorrecta"},
        )
        assert response.status_code == 401

    sexto = client.post(
        "/api/auth/login",
        json={"username": usuario["cedula"], "password": "password-incorrecta"},
    )
    assert sexto.status_code == 429


async def test_perfil_sin_token_devuelve_401(client, clean_db):
    response = client.get("/api/auth/perfil")
    assert response.status_code == 401


async def test_verify_con_token_valido(client, clean_db, seed):
    usuario = await seed.usuario("director", password="ClaveSegura123!")
    token = login_and_get_token(client, usuario["cedula"], "ClaveSegura123!")

    response = client.get("/api/auth/verify", headers=auth_headers(token))

    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["rol"] == "director"


async def test_verify_con_token_invalido_devuelve_401(client, clean_db):
    response = client.get("/api/auth/verify", headers=auth_headers("token-invalido"))
    assert response.status_code == 401


async def test_logout_revoca_el_token(client, clean_db, seed):
    usuario = await seed.usuario("tesorero", password="ClaveSegura123!")
    token = login_and_get_token(client, usuario["cedula"], "ClaveSegura123!")

    logout_response = client.post("/api/auth/logout", headers=auth_headers(token))
    assert logout_response.status_code == 200

    verify_response = client.get("/api/auth/verify", headers=auth_headers(token))
    assert verify_response.status_code == 401
