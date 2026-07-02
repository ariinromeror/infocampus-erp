"""
Sistema de migraciones SQL versionadas para InfoCampus ERP.

Convención
----------
- Los archivos viven en ``backend/migrations/`` con el patrón
  ``NNN_descripcion.sql`` (``NNN`` = número de 3+ dígitos, cero-rellenado,
  orden de aplicación ascendente por nombre de archivo).
- Cada migración debe ser **idempotente** (``CREATE TABLE IF NOT EXISTS``,
  ``CREATE INDEX IF NOT EXISTS``, ``ON CONFLICT DO NOTHING``, etc.) para
  poder re-ejecutarse sin error si por algún motivo se corre más de una vez.
- Las migraciones aplicadas se registran en ``public.schema_migrations``
  (``version`` = nombre de archivo, ``applied_at`` = timestamp de aplicación).
- **Nunca editar** un archivo de migración ya aplicado en producción/staging:
  crear uno nuevo con el siguiente número. Editar un archivo ya aplicado hace
  que `schema_migrations` y el `.sql` diverjan silenciosamente entre entornos.
- Rollback: no hay "down migrations" automáticas (mismo enfoque que
  `dbmate`/`golang-migrate` en modo simple). Para revertir un cambio, se
  escribe una nueva migración que deshaga el anterior (p.ej. ``DROP COLUMN``).
  Ver `docs/DEPLOY.md` para el procedimiento recomendado en Supabase.

Este módulo expone lógica pura (listar archivos, calcular pendientes) más
dos ejecutores (async para el arranque de FastAPI con asyncpg, sync para
scripts_db/populate.py y el CLI standalone con psycopg2), de forma que
``populate.py`` deja de ser dueño del esquema y pasa a ser solo *seed* de
datos demo sobre el esquema que crean estas migraciones.
"""
from __future__ import annotations

import logging
import os
import re

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")

# NNN_nombre_descriptivo.sql — NNN con al menos 3 dígitos.
MIGRATION_FILENAME_RE = re.compile(r"^\d{3,}_[a-zA-Z0-9_]+\.sql$")

CREATE_SCHEMA_MIGRATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version    VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
)
"""


def list_migration_files(migrations_dir: str = MIGRATIONS_DIR) -> list[str]:
    """Nombres de archivo de migración válidos, en orden ascendente de aplicación."""
    if not os.path.isdir(migrations_dir):
        return []
    files = [
        f
        for f in os.listdir(migrations_dir)
        if MIGRATION_FILENAME_RE.match(f)
    ]
    return sorted(files)


def pending_migrations(all_files: list[str], applied: set[str]) -> list[str]:
    """Migraciones aún no aplicadas, preservando el orden de `all_files`."""
    return [f for f in all_files if f not in applied]


def read_migration_sql(filename: str, migrations_dir: str = MIGRATIONS_DIR) -> str:
    path = os.path.join(migrations_dir, filename)
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


async def apply_pending_migrations_async(get_db, migrations_dir: str = MIGRATIONS_DIR) -> list[str]:
    """
    Aplica migraciones pendientes usando el pool asyncpg de la app (FastAPI startup).

    `get_db` es el context manager async de `backend/database.py` (`get_db`),
    inyectado como parámetro para poder testear esta función con un fake.
    Cada migración se aplica en su propia transacción; devuelve la lista de
    migraciones efectivamente aplicadas en esta ejecución (vacía si no había
    pendientes).
    """
    async with get_db() as conn:
        await conn.execute(CREATE_SCHEMA_MIGRATIONS_TABLE_SQL)
        rows = await conn.fetch("SELECT version FROM public.schema_migrations")
        applied = {row["version"] for row in rows}

    all_files = list_migration_files(migrations_dir)
    to_apply = pending_migrations(all_files, applied)

    applied_now: list[str] = []
    for filename in to_apply:
        sql = read_migration_sql(filename, migrations_dir)
        async with get_db() as conn:
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO public.schema_migrations (version) VALUES ($1) "
                "ON CONFLICT (version) DO NOTHING",
                filename,
            )
        logger.info("✅ Migración aplicada: %s", filename)
        applied_now.append(filename)

    if not to_apply:
        logger.info(
            "Migraciones: nada pendiente (%d ya aplicadas)", len(applied)
        )

    return applied_now


def apply_pending_migrations_sync(conn, migrations_dir: str = MIGRATIONS_DIR) -> list[str]:
    """
    Aplica migraciones pendientes usando una conexión psycopg2 síncrona.

    Usado por `scripts_db/populate.py` (seed de demo) y por el CLI standalone
    `backend/scripts/apply_migrations.py` (operación manual en staging/prod).
    `conn` debe ser una conexión psycopg2 abierta; esta función hace commit
    explícito después de cada migración aplicada.
    """
    cur = conn.cursor()
    try:
        cur.execute(CREATE_SCHEMA_MIGRATIONS_TABLE_SQL)
        conn.commit()

        cur.execute("SELECT version FROM public.schema_migrations")
        applied = {row[0] for row in cur.fetchall()}

        all_files = list_migration_files(migrations_dir)
        to_apply = pending_migrations(all_files, applied)

        applied_now: list[str] = []
        for filename in to_apply:
            sql = read_migration_sql(filename, migrations_dir)
            cur.execute(sql)
            cur.execute(
                "INSERT INTO public.schema_migrations (version) VALUES (%s) "
                "ON CONFLICT (version) DO NOTHING",
                (filename,),
            )
            conn.commit()
            logger.info("✅ Migración aplicada: %s", filename)
            applied_now.append(filename)

        if not to_apply:
            logger.info(
                "Migraciones: nada pendiente (%d ya aplicadas)", len(applied)
            )

        return applied_now
    finally:
        cur.close()
