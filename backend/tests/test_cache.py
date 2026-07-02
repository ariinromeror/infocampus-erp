"""
Tests del wrapper de cache Redis (backend/cache.py).

No requieren un Redis real: se monkeypatchea `cache._get_client()` con un
doble en memoria, y se prueba explicitamente el modo "sin Redis" (cache
deshabilitado) que es el comportamiento por defecto (REDIS_URL="").
"""
import pytest

import cache


class _FakeRedisClient:
    """Doble minimo de `redis.asyncio.Redis` respaldado por un dict en memoria."""

    def __init__(self):
        self.store: dict[str, str] = {}
        self.raise_on_get = False
        self.raise_on_set = False

    async def get(self, key):
        if self.raise_on_get:
            raise ConnectionError("redis caido")
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        if self.raise_on_set:
            raise ConnectionError("redis caido")
        self.store[key] = value

    async def delete(self, *keys):
        for k in keys:
            self.store.pop(k, None)


@pytest.fixture(autouse=True)
def _reset_cache_singleton():
    """Evita que el cliente lazy-singleton se filtre entre tests."""
    cache._reset_client_for_tests()
    yield
    cache._reset_client_for_tests()


class TestCacheDisabledByDefault:
    """Sin REDIS_URL configurado (default en tests), todo debe ser un no-op seguro."""

    @pytest.mark.asyncio
    async def test_get_json_returns_none(self):
        assert await cache.get_json("cualquier-key") is None

    @pytest.mark.asyncio
    async def test_set_json_does_not_raise(self):
        await cache.set_json("cualquier-key", {"a": 1}, 60)  # no debe lanzar

    @pytest.mark.asyncio
    async def test_get_bool_returns_none_not_false(self):
        # None (cache deshabilitado/miss) es distinto de False (valor cacheado)
        assert await cache.get_bool("cualquier-key") is None


class TestCacheWithFakeClient:
    @pytest.mark.asyncio
    async def test_set_then_get_json_roundtrip(self, monkeypatch):
        fake = _FakeRedisClient()
        monkeypatch.setattr(cache, "_get_client", lambda: fake)

        await cache.set_json("k1", {"foo": "bar"}, 60)
        assert await cache.get_json("k1") == {"foo": "bar"}

    @pytest.mark.asyncio
    async def test_get_json_miss_returns_none(self, monkeypatch):
        fake = _FakeRedisClient()
        monkeypatch.setattr(cache, "_get_client", lambda: fake)

        assert await cache.get_json("no-existe") is None

    @pytest.mark.asyncio
    async def test_get_bool_true_and_false_are_distinguishable_from_miss(self, monkeypatch):
        fake = _FakeRedisClient()
        monkeypatch.setattr(cache, "_get_client", lambda: fake)

        await cache.set_bool("revoked:abc", True, 60)
        await cache.set_bool("revoked:def", False, 60)

        assert await cache.get_bool("revoked:abc") is True
        assert await cache.get_bool("revoked:def") is False
        assert await cache.get_bool("revoked:no-cacheado") is None

    @pytest.mark.asyncio
    async def test_delete_removes_key(self, monkeypatch):
        fake = _FakeRedisClient()
        monkeypatch.setattr(cache, "_get_client", lambda: fake)

        await cache.set_json("k1", "v1", 60)
        await cache.delete("k1")
        assert await cache.get_json("k1") is None

    @pytest.mark.asyncio
    async def test_get_json_degrades_to_none_on_redis_error(self, monkeypatch):
        fake = _FakeRedisClient()
        fake.raise_on_get = True
        monkeypatch.setattr(cache, "_get_client", lambda: fake)

        assert await cache.get_json("k1") is None

    @pytest.mark.asyncio
    async def test_set_json_swallows_redis_error(self, monkeypatch):
        fake = _FakeRedisClient()
        fake.raise_on_set = True
        monkeypatch.setattr(cache, "_get_client", lambda: fake)

        await cache.set_json("k1", "v1", 60)  # no debe lanzar


def test_get_redis_client_expone_el_cliente_lazy(monkeypatch):
    """`get_redis_client()` (usado por /api/health) delega en `_get_client()`."""
    fake = _FakeRedisClient()
    monkeypatch.setattr(cache, "_get_client", lambda: fake)
    assert cache.get_redis_client() is fake


def test_get_redis_client_none_si_deshabilitado():
    assert cache.get_redis_client() is None
