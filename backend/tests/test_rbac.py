"""
Tests de integración de RBAC (RQ-04 del PRD): `require_roles()` debe rechazar
con 403 a cualquier rol fuera de la lista permitida, y aceptar con 200 a los
roles autorizados. Un endpoint por cada uno de los 6 roles del sistema.
"""
import pytest

from tests.conftest import auth_headers, login_and_get_token

pytestmark = pytest.mark.asyncio

PASSWORD = "ClaveSegura123!"


async def _token_para_rol(client, seed, rol: str, **overrides) -> str:
    usuario = await seed.usuario(rol, password=PASSWORD, **overrides)
    return login_and_get_token(client, usuario["cedula"], PASSWORD), usuario


async def test_tesorero_endpoint_permite_tesorero(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "tesorero")
    response = client.get("/api/tesorero/resumen-kpis", headers=auth_headers(token))
    assert response.status_code == 200


async def test_tesorero_endpoint_rechaza_estudiante(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "estudiante")
    response = client.get("/api/tesorero/resumen-kpis", headers=auth_headers(token))
    assert response.status_code == 403


async def test_estudiante_endpoint_permite_estudiante(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "estudiante")
    response = client.get("/api/inscripciones/estudiante/mis-inscripciones", headers=auth_headers(token))
    assert response.status_code == 200


async def test_estudiante_endpoint_rechaza_profesor(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "profesor")
    response = client.get("/api/inscripciones/estudiante/mis-inscripciones", headers=auth_headers(token))
    assert response.status_code == 403


async def test_profesor_endpoint_permite_profesor_sobre_si_mismo(client, clean_db, seed):
    token, usuario = await _token_para_rol(client, seed, "profesor")
    response = client.get(f"/api/profesor/{usuario['id']}/secciones", headers=auth_headers(token))
    assert response.status_code == 200


async def test_profesor_endpoint_rechaza_estudiante(client, clean_db, seed):
    token, usuario = await _token_para_rol(client, seed, "estudiante")
    response = client.get(f"/api/profesor/{usuario['id']}/secciones", headers=auth_headers(token))
    assert response.status_code == 403


async def test_director_endpoint_permite_director(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "director")
    response = client.get("/api/director/historial-notas", headers=auth_headers(token))
    assert response.status_code == 200


async def test_director_endpoint_rechaza_coordinador(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "coordinador")
    response = client.get("/api/director/historial-notas", headers=auth_headers(token))
    assert response.status_code == 403


async def test_coordinador_endpoint_permite_coordinador(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "coordinador")
    response = client.get("/api/academico/profesores", headers=auth_headers(token))
    assert response.status_code == 200


async def test_administrativo_endpoint_permite_administrativo(client, clean_db, seed):
    # Mismo endpoint que el test de coordinador: ambos roles están autorizados,
    # lo que también confirma que `require_roles` acepta cualquiera de la lista.
    token, _ = await _token_para_rol(client, seed, "administrativo")
    response = client.get("/api/academico/profesores", headers=auth_headers(token))
    assert response.status_code == 200


async def test_coordinador_endpoint_rechaza_estudiante(client, clean_db, seed):
    token, _ = await _token_para_rol(client, seed, "estudiante")
    response = client.get("/api/academico/profesores", headers=auth_headers(token))
    assert response.status_code == 403


async def test_endpoint_sin_token_devuelve_401_no_403(client, clean_db):
    """Un request sin token debe fallar por falta de autenticación (401), no
    por autorización (403): son fallos distintos y la API no debe confundirlos."""
    response = client.get("/api/tesorero/resumen-kpis")
    assert response.status_code == 401
