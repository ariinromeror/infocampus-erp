"""
Tests de `get_pool_stats()` (backend/database.py), usada por /api/health y
por observabilidad (Fase 4) para reportar la saturación del pool de asyncpg.
"""
import database


class _FakePool:
    def __init__(self, min_size, max_size, size, idle):
        self._min_size = min_size
        self._max_size = max_size
        self._size = size
        self._idle = idle

    def get_min_size(self):
        return self._min_size

    def get_max_size(self):
        return self._max_size

    def get_size(self):
        return self._size

    def get_idle_size(self):
        return self._idle


def test_get_pool_stats_devuelve_none_si_pool_no_inicializado(monkeypatch):
    monkeypatch.setattr(database, "_async_pool", None)
    assert database.get_pool_stats() is None


def test_get_pool_stats_calcula_in_use_correctamente(monkeypatch):
    fake_pool = _FakePool(min_size=2, max_size=10, size=5, idle=3)
    monkeypatch.setattr(database, "_async_pool", fake_pool)

    stats = database.get_pool_stats()
    assert stats == {
        "min_size": 2,
        "max_size": 10,
        "size": 5,
        "idle": 3,
        "in_use": 2,
    }


def test_get_pool_stats_devuelve_none_si_pool_lanza_excepcion(monkeypatch):
    class _BrokenPool:
        def get_size(self):
            raise RuntimeError("pool cerrado")

    monkeypatch.setattr(database, "_async_pool", _BrokenPool())
    assert database.get_pool_stats() is None
