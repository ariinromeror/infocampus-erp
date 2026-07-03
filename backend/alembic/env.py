"""
RQ-03 (docs/PRD.md): entorno de ejecución de Alembic.

Usa un engine síncrono de SQLAlchemy (psycopg2) exclusivamente para aplicar
migraciones DDL. La app en runtime (backend/database.py) sigue usando
asyncpg puro — Alembic/SQLAlchemy no participan en ninguna query de negocio.

La URL de conexión se toma de la variable de entorno DATABASE_URL (la misma
que usa la app), no de un valor hardcodeado en alembic.ini, para que un mismo
comando `alembic upgrade head` funcione igual en local, CI y producción.
"""
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# No usamos autogenerate (no hay modelos SQLAlchemy declarativos: el esquema
# se declara a mano vía SQL crudo en cada revisión), así que no hace falta
# target_metadata para comparar contra modelos ORM.
target_metadata = None


_PLACEHOLDER_URL = "driver://user:pass@localhost/dbname"


def _database_url() -> str:
    """Resuelve la URL de conexión con esta prioridad:

    1. `sqlalchemy.url` si fue fijada explícitamente en tiempo de ejecución
       (p.ej. `cfg.set_main_option("sqlalchemy.url", ...)` desde
       `db_migrations.py` o `tests/conftest.py`, para apuntar a una base
       distinta de la que indica el entorno — usado en tests que migran
       bases de datos temporales).
    2. La variable de entorno `DATABASE_URL` (mismo valor que usa la app).
    3. `settings.DATABASE_URL` como último recurso.

    Sin esta prioridad, una `DATABASE_URL` global en el entorno siempre
    ganaría sobre cualquier URL fijada a mano, rompiendo cualquier caso de
    uso que necesite migrar una base de datos distinta a la del entorno.
    """
    configured = config.get_main_option("sqlalchemy.url")
    if configured and configured != _PLACEHOLDER_URL:
        return configured

    url = os.environ.get("DATABASE_URL")
    if not url:
        try:
            from config import settings
            url = settings.DATABASE_URL
        except Exception:
            pass
    if not url:
        raise RuntimeError(
            "DATABASE_URL no está definida. Alembic la necesita para conectarse "
            "a PostgreSQL (ver README.md / docs/DEPLOY.md)."
        )
    return url


def run_migrations_offline() -> None:
    """Genera el SQL de las migraciones sin conectarse a la base de datos
    (`alembic upgrade head --sql`)."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Aplica las migraciones conectándose directamente a la base de datos."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = _database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
