"""Tests para el sistema de migraciones Alembic (RQ-03 — docs/PRD.md).

Estas pruebas operan sobre una base de datos temporal propia (creada y
destruida dentro del propio test), en vez de la `infocampus_test` compartida
por el resto de la suite: aplicar `alembic downgrade base` ahí borraría todas
las tablas y rompería cualquier otro test que corra después en la misma
sesión de pytest.
"""
import uuid

import psycopg2
import pytest
from alembic import command
from alembic.config import Config

from db_migrations import MIGRATION_LOCK_ID, run_migrations
from tests.conftest import BACKEND_DIR

REQUIRED_TABLES = {
    "carreras", "usuarios", "periodos_lectivos", "materias", "prerequisitos",
    "secciones", "pagos", "inscripciones", "historial_notas",
    "evaluaciones_parciales", "asistencias", "audit_logs",
    "configuracion_ia", "revoked_tokens",
}


def _admin_dsn(base_url: str) -> str:
    """DSN a la base `postgres` (para poder CREATE/DROP la base de test)."""
    prefix = base_url.rsplit("/", 1)[0]
    return f"{prefix}/postgres"


def _db_name_from_url(url: str) -> str:
    return url.rsplit("/", 1)[-1]


@pytest.fixture
def temp_database(request):
    """Crea una base de datos PostgreSQL temporal y devuelve su DATABASE_URL;
    la elimina al finalizar el test, sin importar si pasó o falló."""
    import os

    base_url = os.environ["DATABASE_URL"]
    db_name = f"test_migrations_{uuid.uuid4().hex[:10]}"
    admin_dsn = _admin_dsn(base_url)

    conn = psycopg2.connect(admin_dsn)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        conn.close()

    temp_url = f"{admin_dsn.rsplit('/', 1)[0]}/{db_name}"

    yield temp_url

    conn = psycopg2.connect(admin_dsn)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # Corta conexiones activas antes de dropear (Alembic pudo dejar alguna abierta).
            cur.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = %s AND pid <> pg_backend_pid()",
                (db_name,),
            )
            cur.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    finally:
        conn.close()


def _tables_in(database_url: str) -> set:
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public'"
            )
            return {row[0] for row in cur.fetchall()}
    finally:
        conn.close()


def test_upgrade_head_crea_todas_las_tablas_desde_cero(temp_database):
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", temp_database)

    command.upgrade(cfg, "head")

    tablas = _tables_in(temp_database)
    assert REQUIRED_TABLES.issubset(tablas)


def test_migraciones_son_reversibles(temp_database):
    """Criterio de aceptación de RQ-03: historial incremental y reversible."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", temp_database)

    command.upgrade(cfg, "head")
    assert REQUIRED_TABLES.issubset(_tables_in(temp_database))

    command.downgrade(cfg, "base")
    tablas_tras_downgrade = _tables_in(temp_database) - {"alembic_version"}
    assert tablas_tras_downgrade == set()

    # Vuelve a aplicar todo el historial sin errores tras el downgrade completo.
    command.upgrade(cfg, "head")
    assert REQUIRED_TABLES.issubset(_tables_in(temp_database))


def test_upgrade_head_es_idempotente_sobre_esquema_preexistente(temp_database):
    """Simula adoptar Alembic sobre una base ya poblada por el
    `populate.py` histórico (sin fila en alembic_version): debe poder
    crear el esquema, y una segunda ejecución no debe fallar."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", temp_database)

    command.upgrade(cfg, "head")
    command.upgrade(cfg, "head")  # no-op, no debe lanzar excepción
    assert REQUIRED_TABLES.issubset(_tables_in(temp_database))


def test_run_migrations_aplica_head_y_libera_el_advisory_lock(temp_database):
    """`db_migrations.run_migrations` (usado en el lifespan de main.py) debe
    dejar el esquema al día y no dejar el advisory lock retenido."""
    run_migrations(temp_database)

    assert REQUIRED_TABLES.issubset(_tables_in(temp_database))

    # Si el lock se liberó correctamente, pg_try_advisory_lock debe poder
    # tomarlo de inmediato desde una conexión nueva.
    conn = psycopg2.connect(temp_database)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_try_advisory_lock(%s)", (MIGRATION_LOCK_ID,))
            (adquirido,) = cur.fetchone()
            assert adquirido is True
            cur.execute("SELECT pg_advisory_unlock(%s)", (MIGRATION_LOCK_ID,))
    finally:
        conn.close()
