"""
RQ-03 (docs/PRD.md): aplica las migraciones Alembic al arrancar la app.

Reemplaza el mecanismo anterior (ejecutar `migrations/001_revoked_tokens.sql`
a mano dentro del lifespan de FastAPI). Reutiliza el mismo advisory lock que
ya existía en `main.py` para evitar que varios workers de Gunicorn intenten
migrar el esquema al mismo tiempo cuando arrancan simultáneamente.

Alembic corre de forma síncrona (usa un engine de SQLAlchemy sobre
psycopg2), así que esta función se ejecuta en un hilo aparte
(`asyncio.to_thread`) para no bloquear el event loop durante el arranque.
"""
import logging
import os

import psycopg2

# "ICERP" en hex — mismo ID que usaba la migración anterior, para no romper
# compatibilidad si algún proceso viejo todavía referencia este lock.
MIGRATION_LOCK_ID = 0x494346455250

logger = logging.getLogger(__name__)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ALEMBIC_INI_PATH = os.path.join(BACKEND_DIR, "alembic.ini")


def run_migrations(database_url: str) -> None:
    """Aplica `alembic upgrade head` protegido por un advisory lock de Postgres.

    Se conecta dos veces a la base de datos a propósito: una conexión propia
    y de vida corta (psycopg2) solo para tomar/soltar el lock, y el engine
    interno que crea Alembic (ver alembic/env.py) para aplicar las
    migraciones. Mantenerlas separadas evita interferir con el manejo de
    transacciones que Alembic hace internamente por revisión.
    """
    from alembic import command
    from alembic.config import Config

    lock_conn = psycopg2.connect(database_url)
    lock_conn.autocommit = True
    try:
        with lock_conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_lock(%s)", (MIGRATION_LOCK_ID,))
        try:
            cfg = Config(ALEMBIC_INI_PATH)
            cfg.set_main_option("sqlalchemy.url", database_url)
            command.upgrade(cfg, "head")
            logger.info("✅ Migraciones Alembic aplicadas (head)")
        finally:
            with lock_conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_ID,))
    finally:
        lock_conn.close()
