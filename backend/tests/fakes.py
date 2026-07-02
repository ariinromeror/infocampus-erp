"""
Test doubles para la capa de base de datos (asyncpg).

Los tests unitarios de este proyecto no requieren una base de datos real:
la logica de negocio (RBAC, JWT, calculos financieros) se prueba mockeando
`conn.fetchrow` / `conn.execute` para devolver valores controlados.
"""
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock


class FakeConnection:
    """
    Doble de una conexion asyncpg. `fetchrow_results` es una lista de valores
    que se devuelven en orden en llamadas sucesivas a `fetchrow` (simula
    `side_effect`), util para reproducir exactamente la secuencia de queries
    que hace una funcion de servicio.
    """

    def __init__(self, fetchrow_results=None, fetch_results=None):
        self.fetchrow = AsyncMock(side_effect=fetchrow_results or [])
        self.fetch = AsyncMock(side_effect=fetch_results or [])
        self.execute = AsyncMock(return_value=None)


def fake_get_db(conn: FakeConnection):
    """Devuelve un context manager async compatible con `database.get_db()`."""

    @asynccontextmanager
    async def _ctx():
        yield conn

    return _ctx


def fake_get_db_raises(exc: Exception):
    """Context manager que levanta `exc` al entrar (simula fallo de DB)."""

    @asynccontextmanager
    async def _ctx():
        raise exc
        yield  # pragma: no cover - nunca se alcanza

    return _ctx
