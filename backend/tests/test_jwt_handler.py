"""
Tests de emision, decodificacion y revocacion de JWT.

Cubren especificamente el comportamiento fail-closed de `is_token_revoked`
(backend/auth/jwt_handler.py): si la consulta a `revoked_tokens` falla,
el token debe tratarse como revocado, no como valido.
"""
from datetime import timedelta

import pytest

import auth.jwt_handler as jwt_handler
import cache
from tests.fakes import fake_get_db, fake_get_db_raises, FakeConnection


class _FakeRedisClient:
    """Doble minimo de `redis.asyncio.Redis` respaldado por un dict en memoria."""

    def __init__(self):
        self.store: dict[str, str] = {}

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        self.store[key] = value

    async def delete(self, *keys):
        for k in keys:
            self.store.pop(k, None)


@pytest.fixture(autouse=True)
def _reset_cache_singleton():
    cache._reset_client_for_tests()
    yield
    cache._reset_client_for_tests()


def test_create_access_token_contiene_claims_esperados():
    token = jwt_handler.create_access_token({"user_id": 1, "cedula": "0102030405", "rol": "estudiante"})
    payload = jwt_handler.jwt.decode(
        token,
        jwt_handler.settings.SECRET_KEY_AUTH,
        algorithms=[jwt_handler.settings.ALGORITHM],
    )
    assert payload["user_id"] == 1
    assert payload["rol"] == "estudiante"
    assert payload["type"] == "access"
    assert "jti" in payload and payload["jti"]
    assert "exp" in payload and "iat" in payload


@pytest.mark.asyncio
async def test_is_token_revoked_false_cuando_no_esta_en_tabla(monkeypatch):
    conn = FakeConnection(fetchrow_results=[None])
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))
    assert await jwt_handler.is_token_revoked("some-jti") is False


@pytest.mark.asyncio
async def test_is_token_revoked_true_cuando_esta_en_tabla(monkeypatch):
    conn = FakeConnection(fetchrow_results=[{"revoked": True}])
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))
    assert await jwt_handler.is_token_revoked("some-jti") is True


@pytest.mark.asyncio
async def test_is_token_revoked_falla_cerrado_si_db_falla(monkeypatch):
    """
    Comportamiento fail-closed: si la consulta a la base de datos falla,
    el token debe tratarse como revocado (no como valido).
    """
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db_raises(RuntimeError("DB caida")))
    assert await jwt_handler.is_token_revoked("some-jti") is True


@pytest.mark.asyncio
async def test_is_token_revoked_sin_jti_no_consulta_db():
    assert await jwt_handler.is_token_revoked(None) is False
    assert await jwt_handler.is_token_revoked("") is False


@pytest.mark.asyncio
async def test_decode_access_token_valido(monkeypatch):
    conn = FakeConnection(fetchrow_results=[None])  # no revocado
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))

    token = jwt_handler.create_access_token({"user_id": 1, "cedula": "x", "rol": "estudiante"})
    payload = await jwt_handler.decode_access_token(token)

    assert payload is not None
    assert payload["user_id"] == 1


@pytest.mark.asyncio
async def test_decode_access_token_revocado_retorna_none(monkeypatch):
    conn = FakeConnection(fetchrow_results=[{"revoked": True}])
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))

    token = jwt_handler.create_access_token({"user_id": 1, "cedula": "x", "rol": "estudiante"})
    payload = await jwt_handler.decode_access_token(token)

    assert payload is None


@pytest.mark.asyncio
async def test_decode_access_token_expirado_retorna_none(monkeypatch):
    conn = FakeConnection(fetchrow_results=[None])
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))

    token = jwt_handler.create_access_token(
        {"user_id": 1, "cedula": "x", "rol": "estudiante"},
        expires_delta=timedelta(seconds=-1),
    )
    payload = await jwt_handler.decode_access_token(token)
    assert payload is None


@pytest.mark.asyncio
async def test_decode_access_token_malformado_retorna_none():
    assert await jwt_handler.decode_access_token("token-invalido") is None


@pytest.mark.asyncio
async def test_decode_access_token_sin_db_disponible_falla_cerrado(monkeypatch):
    """
    Si la DB de revocacion falla durante la decodificacion, el resultado
    neto debe ser 'token invalido' (None), no un login exitoso.
    """
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db_raises(RuntimeError("DB caida")))

    token = jwt_handler.create_access_token({"user_id": 1, "cedula": "x", "rol": "estudiante"})
    payload = await jwt_handler.decode_access_token(token)
    assert payload is None


# ─── Cache de revocacion (Redis) ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_is_token_revoked_usa_cache_sin_tocar_db_en_cache_hit(monkeypatch):
    fake_redis = _FakeRedisClient()
    monkeypatch.setattr(cache, "_get_client", lambda: fake_redis)
    await cache.set_bool(jwt_handler._revoked_cache_key("cached-jti"), True, 60)

    # Si consultara la DB, esto lanzaria porque get_db no esta parcheado con
    # un valor utilizable; el hecho de que no lance confirma que no la toco.
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db_raises(RuntimeError("no deberia llamarse")))

    assert await jwt_handler.is_token_revoked("cached-jti") is True


@pytest.mark.asyncio
async def test_is_token_revoked_completa_cache_tras_consultar_db(monkeypatch):
    fake_redis = _FakeRedisClient()
    monkeypatch.setattr(cache, "_get_client", lambda: fake_redis)
    conn = FakeConnection(fetchrow_results=[{"revoked": True}])
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))

    assert await jwt_handler.is_token_revoked("nuevo-jti") is True
    assert fake_redis.store.get(jwt_handler._revoked_cache_key("nuevo-jti")) == "true"


@pytest.mark.asyncio
async def test_is_token_revoked_no_cachea_resultado_de_error_db(monkeypatch):
    fake_redis = _FakeRedisClient()
    monkeypatch.setattr(cache, "_get_client", lambda: fake_redis)
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db_raises(RuntimeError("DB caida")))

    assert await jwt_handler.is_token_revoked("jti-con-error") is True
    assert jwt_handler._revoked_cache_key("jti-con-error") not in fake_redis.store


@pytest.mark.asyncio
async def test_revoke_token_escribe_cache_de_inmediato(monkeypatch):
    fake_redis = _FakeRedisClient()
    monkeypatch.setattr(cache, "_get_client", lambda: fake_redis)
    conn = FakeConnection()
    monkeypatch.setattr(jwt_handler, "get_db", fake_get_db(conn))

    await jwt_handler.revoke_token("jti-a-revocar")

    assert fake_redis.store.get(jwt_handler._revoked_cache_key("jti-a-revocar")) == "true"
