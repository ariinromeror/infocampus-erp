"""
Tests de control de acceso por rol (RBAC) — backend/auth/dependencies.py.
"""
import pytest
from fastapi import HTTPException

from auth.dependencies import require_roles, get_current_user
from tests.fakes import fake_get_db, FakeConnection


@pytest.mark.asyncio
async def test_require_roles_permite_rol_autorizado():
    checker = require_roles(["director", "coordinador"])
    usuario = {"rol": "director", "cedula": "0102030405"}
    resultado = await checker(current_user=usuario)
    assert resultado == usuario


@pytest.mark.asyncio
async def test_require_roles_rechaza_rol_no_autorizado():
    checker = require_roles(["director"])
    usuario = {"rol": "estudiante", "cedula": "0102030405"}

    with pytest.raises(HTTPException) as exc_info:
        await checker(current_user=usuario)

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("rol", ["estudiante", "profesor", "coordinador", "director", "tesorero", "administrativo"])
async def test_require_roles_todos_los_roles_conocidos(rol):
    checker = require_roles([rol])
    usuario = {"rol": rol, "cedula": "x"}
    resultado = await checker(current_user=usuario)
    assert resultado["rol"] == rol


@pytest.mark.asyncio
async def test_get_current_user_sin_credenciales_lanza_401():
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_token_invalido_lanza_401():
    from fastapi.security import HTTPAuthorizationCredentials

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token-basura")
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=creds)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_usuario_no_encontrado_en_db_lanza_401(monkeypatch):
    import auth.dependencies as deps
    import auth.jwt_handler as jwt_handler
    from auth.jwt_handler import create_access_token
    from fastapi.security import HTTPAuthorizationCredentials

    # get_db se usa en dos sitios distintos: jwt_handler (chequeo de revocacion)
    # y auth.dependencies (lookup del usuario). Se mockean por separado.
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(FakeConnection(fetchrow_results=[None])))
    conn = FakeConnection(fetchrow_results=[None])  # usuario no existe / inactivo
    monkeypatch.setattr(deps, "get_db", fake_get_db(conn))

    token = create_access_token({"user_id": 999, "cedula": "x", "rol": "estudiante"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=creds)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_exitoso_retorna_usuario(monkeypatch):
    import auth.dependencies as deps
    import auth.jwt_handler as jwt_handler
    from auth.jwt_handler import create_access_token
    from fastapi.security import HTTPAuthorizationCredentials

    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(FakeConnection(fetchrow_results=[None])))

    usuario_db = {
        "id": 1,
        "cedula": "0102030405",
        "email": "test@example.com",
        "rol": "director",
        "first_name": "Ana",
        "last_name": "Perez",
        "carrera_id": None,
        "es_becado": False,
        "porcentaje_beca": 0,
        "activo": True,
    }
    conn = FakeConnection(fetchrow_results=[usuario_db])
    monkeypatch.setattr(deps, "get_db", fake_get_db(conn))

    token = create_access_token({"user_id": 1, "cedula": "0102030405", "rol": "director"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    resultado = await get_current_user(credentials=creds)
    assert resultado["rol"] == "director"
    assert resultado["cedula"] == "0102030405"
