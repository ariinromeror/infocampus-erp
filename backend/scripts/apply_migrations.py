#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CLI standalone para aplicar migraciones pendientes de backend/migrations/
sin levantar la app FastAPI completa.

Uso:
    cd backend
    python -m scripts.apply_migrations               # aplica contra DATABASE_URL del entorno
    DATABASE_URL=postgres://... python -m scripts.apply_migrations --dry-run

Pensado para:
- Aplicar migraciones manualmente en staging antes de un deploy a producción.
- Depurar qué migraciones están pendientes sin tocar el esquema (`--dry-run`).
- Entornos donde no se quiere depender del hook de arranque de FastAPI
  (por ejemplo, ejecutar la migración como paso explícito de un pipeline
  de CI/CD antes de desplegar la nueva versión del backend).

Usa psycopg2 (síncrono) para no depender de un event loop, reutilizando
la misma lógica (`migrations_runner`) que usa el arranque async de la app.
"""
import argparse
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402

from config import settings  # noqa: E402
from database import parse_database_url  # noqa: E402
from migrations_runner import (  # noqa: E402
    list_migration_files,
    pending_migrations,
    apply_pending_migrations_sync,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("apply_migrations")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo muestra las migraciones pendientes, no aplica nada.",
    )
    args = parser.parse_args()

    database_url = settings.DATABASE_URL
    if not database_url:
        logger.error("DATABASE_URL no configurado (revisa backend/.env)")
        return 1

    conn = psycopg2.connect(**parse_database_url(database_url))
    conn.autocommit = False
    try:
        if args.dry_run:
            cur = conn.cursor()
            cur.execute(
                "CREATE TABLE IF NOT EXISTS public.schema_migrations ("
                "version VARCHAR(255) PRIMARY KEY, "
                "applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
            )
            conn.commit()
            cur.execute("SELECT version FROM public.schema_migrations")
            applied = {row[0] for row in cur.fetchall()}
            cur.close()

            all_files = list_migration_files()
            to_apply = pending_migrations(all_files, applied)
            if to_apply:
                logger.info("Migraciones pendientes (%d):", len(to_apply))
                for f in to_apply:
                    logger.info("  - %s", f)
            else:
                logger.info("No hay migraciones pendientes.")
            return 0

        applied_now = apply_pending_migrations_sync(conn)
        if applied_now:
            logger.info("✅ %d migración(es) aplicada(s): %s", len(applied_now), ", ".join(applied_now))
        else:
            logger.info("Nada que aplicar, el esquema ya está al día.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
