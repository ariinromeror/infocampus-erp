"""
Database access layer.

- Async pool (asyncpg) for FastAPI API. Use `async with get_db() as conn` and
  conn.fetch/fetchrow/execute with $1, $2 placeholders. Do NOT use cursor().
- Sync connection (psycopg2) via get_db_direct() for scripts_db/ only.
"""
import logging
from contextlib import contextmanager, asynccontextmanager
from urllib.parse import urlparse

import asyncpg
import psycopg2
from psycopg2.extras import RealDictCursor

from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_async_pool: asyncpg.Pool | None = None


def parse_database_url(url: str) -> dict:
    result = urlparse(url)
    return {
        "dbname": result.path[1:],
        "user": result.username,
        "password": result.password,
        "host": result.hostname,
        "port": result.port or 5432,
    }


async def init_connection_pool(min_conn: int = 1, max_conn: int = 20):
    """
    Inicializa el pool asíncrono de conexiones con asyncpg.

    Se usa para la API FastAPI. Los scripts síncronos usan `get_db_direct()`.
    """
    global _async_pool
    if _async_pool is not None:
        return

    try:
        # statement_cache_size=0: Supabase/Render usa pgbouncer en modo transaction,
        # que NO soporta prepared statements. Sin esto: "prepared statement does not exist"
        _async_pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=min_conn,
            max_size=max_conn,
            timeout=10,
            statement_cache_size=0,
        )
        logger.info(
            "✅ Pool PostgreSQL (asyncpg) inicializado (min=%d, max=%d)",
            min_conn,
            max_conn,
        )
    except Exception as e:
        logger.error("❌ Error inicializando pool asyncpg: %s", e)
        raise


@asynccontextmanager
async def get_db():
    """
    Async context manager for pool connection. Use asyncpg API:
    conn.fetch(sql, *args), conn.fetchrow(sql, *args), conn.execute(sql, *args).
    Placeholders: $1, $2. No cursor().
    """
    global _async_pool

    if _async_pool is None:
        await init_connection_pool()

    conn: asyncpg.Connection | None = None
    try:
        conn = await _async_pool.acquire()
        async with conn.transaction():
            yield conn
    except Exception as e:
        logger.error("❌ Error en transacción asyncpg: %s", e)
        raise
    finally:
        if conn is not None:
            try:
                await _async_pool.release(conn)
            except Exception:
                pass


def get_db_direct():
    """Conexión directa sin pool (para scripts externos)."""
    db_params = parse_database_url(settings.DATABASE_URL)
    return psycopg2.connect(**db_params, cursor_factory=RealDictCursor)