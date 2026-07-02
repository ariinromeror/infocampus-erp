"""
Configuración compartida de pytest para el backend.

Requiere una base de datos PostgreSQL accesible vía la variable de entorno
DATABASE_URL (ver README.md / CI en .github/workflows/backend-ci.yml).
No se usa SQLite ni mocks de base de datos: el proyecto usa asyncpg con SQL
crudo (placeholders $1, $2), por lo que los tests corren contra un Postgres
real para detectar errores de sintaxis SQL que un mock no vería.
"""
import os
import sys
from pathlib import Path

# Permite `import main`, `import database`, etc. sin depender de cómo se invoque
# pytest (python -m pytest sí antepone el cwd a sys.path; `pytest` a secas no
# siempre lo hace, p.ej. en el runner de GitHub Actions).
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/infocampus_test")
os.environ.setdefault("SECRET_KEY_AUTH", "test_secret_key_ci_only_do_not_use_in_prod_32chars")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")
os.environ.setdefault("GROQ_API_KEY", "")

import uuid
from datetime import date
from typing import Any, Dict, Optional

import asyncpg
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from passlib.context import CryptContext

# bcrypt__rounds bajo: los tests crean decenas de usuarios y el costo de cómputo
# de bcrypt (12 rounds, igual que en producción) haría la suite notablemente
# lenta. El hash sigue siendo verificable por el pwd_context de producción
# (los rounds se guardan dentro del propio hash).
_TEST_PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)

TABLES_TO_TRUNCATE = (
    "asistencias",
    "evaluaciones_parciales",
    "historial_notas",
    "inscripciones",
    "pagos",
    "secciones",
    "prerequisitos",
    "materias",
    "periodos_lectivos",
    "usuarios",
    "carreras",
    "audit_logs",
    "configuracion_ia",
    "revoked_tokens",
)


@pytest.fixture(scope="session")
def client():
    """Cliente de test con el ciclo de vida (lifespan) de la app ya inicializado."""
    import main as app_module
    with TestClient(app_module.app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """El limiter de SlowAPI vive en memoria y es compartido por el `client` de
    sesión: sin este reset, los intentos de login de un test contarían para la
    cuota de 5/minuto del siguiente test y contaminarían resultados."""
    from routers.auth import limiter
    limiter.reset()
    yield


@pytest_asyncio.fixture
async def db_pool():
    """Pool asyncpg propio de los tests, independiente del pool de la app
    (éste vive en `database._async_pool` y lo gestiona el lifespan de FastAPI).
    Se usa para sembrar/limpiar datos directamente, sin pasar por HTTP.

    Scope "function" (no "session"): pytest-asyncio 0.24 ejecuta cada test
    async en un event loop nuevo, y un pool de un scope mayor quedaría atado
    a un loop distinto (error "attached to a different loop")."""
    pool = await asyncpg.create_pool(
        dsn=os.environ["DATABASE_URL"],
        min_size=1,
        max_size=5,
        statement_cache_size=0,
    )
    yield pool
    await pool.close()


@pytest_asyncio.fixture
async def db_conn(db_pool):
    """Conexión con una transacción que se revierte al finalizar el test:
    aislamiento total para tests unitarios de `services/` sin dejar residuos
    entre tests ni depender del orden de ejecución."""
    async with db_pool.acquire() as conn:
        tx = conn.transaction()
        await tx.start()
        try:
            yield conn
        finally:
            await tx.rollback()


@pytest_asyncio.fixture
async def clean_db(db_pool):
    """Trunca todas las tablas antes y después de cada test de integración
    (los que pasan por `client`/HTTP usan el pool de la app, que SÍ hace commit
    real, por lo que no se puede aislar con una transacción como en `db_conn`)."""
    truncate_sql = f"TRUNCATE TABLE {', '.join(TABLES_TO_TRUNCATE)} RESTART IDENTITY CASCADE"
    async with db_pool.acquire() as conn:
        await conn.execute(truncate_sql)
    yield
    async with db_pool.acquire() as conn:
        await conn.execute(truncate_sql)


@pytest_asyncio.fixture
async def seed(db_pool):
    """Factory de datos de prueba, con commit real (visible para el pool de la
    app), pensada para tests de integración vía `client`."""

    class SeedFactory:
        def __init__(self, pool: asyncpg.Pool):
            self._pool = pool

        async def carrera(self, **overrides) -> Dict[str, Any]:
            defaults = dict(
                nombre="Ingeniería de Software",
                codigo=f"ISW-{uuid.uuid4().hex[:6]}",
                duracion_semestres=8,
                creditos_totales=200,
                precio_credito=50.00,
                dias_gracia_pago=15,
            )
            defaults.update(overrides)
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.carreras
                        (nombre, codigo, duracion_semestres, creditos_totales, precio_credito, dias_gracia_pago)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                    """,
                    defaults["nombre"], defaults["codigo"], defaults["duracion_semestres"],
                    defaults["creditos_totales"], defaults["precio_credito"], defaults["dias_gracia_pago"],
                )
            return dict(row)

        async def periodo(self, **overrides) -> Dict[str, Any]:
            defaults = dict(
                nombre="2026-1",
                codigo=f"PER-{uuid.uuid4().hex[:6]}",
                fecha_inicio=date(2026, 1, 1),
                fecha_fin=date(2026, 6, 30),
                activo=True,
            )
            defaults.update(overrides)
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.periodos_lectivos (nombre, codigo, fecha_inicio, fecha_fin, activo)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                    """,
                    defaults["nombre"], defaults["codigo"], defaults["fecha_inicio"],
                    defaults["fecha_fin"], defaults["activo"],
                )
            return dict(row)

        async def materia(self, carrera_id: int, **overrides) -> Dict[str, Any]:
            defaults = dict(
                nombre="Programación I",
                codigo=f"MAT-{uuid.uuid4().hex[:6]}",
                creditos=4,
                semestre=1,
            )
            defaults.update(overrides)
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.materias (nombre, codigo, creditos, semestre, carrera_id)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                    """,
                    defaults["nombre"], defaults["codigo"], defaults["creditos"],
                    defaults["semestre"], carrera_id,
                )
            return dict(row)

        async def seccion(self, materia_id: int, periodo_id: int, docente_id: Optional[int] = None, **overrides) -> Dict[str, Any]:
            defaults = dict(
                codigo=f"SEC-{uuid.uuid4().hex[:6]}",
                cupo_maximo=30,
                aula="A-101",
            )
            defaults.update(overrides)
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.secciones (materia_id, periodo_id, docente_id, codigo, cupo_maximo, aula)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                    """,
                    materia_id, periodo_id, docente_id, defaults["codigo"],
                    defaults["cupo_maximo"], defaults["aula"],
                )
            return dict(row)

        async def usuario(self, rol: str, password: str = "TestPass123!", **overrides) -> Dict[str, Any]:
            unique = uuid.uuid4().hex[:8]
            defaults = dict(
                username=f"{rol}_{unique}",
                cedula=f"CI{unique}",
                email=f"{rol}.{unique}@test.local",
                first_name="Test",
                last_name=rol.capitalize(),
                carrera_id=None,
                es_becado=False,
                porcentaje_beca=0,
                convenio_activo=False,
                fecha_limite_convenio=None,
                activo=True,
            )
            defaults.update(overrides)
            password_hash = _TEST_PWD_CONTEXT.hash(password)
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO public.usuarios
                        (username, cedula, password_hash, email, first_name, last_name, rol,
                         carrera_id, es_becado, porcentaje_beca, convenio_activo,
                         fecha_limite_convenio, activo)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING *
                    """,
                    defaults["username"], defaults["cedula"], password_hash, defaults["email"],
                    defaults["first_name"], defaults["last_name"], rol, defaults["carrera_id"],
                    defaults["es_becado"], defaults["porcentaje_beca"], defaults["convenio_activo"],
                    defaults["fecha_limite_convenio"], defaults["activo"],
                )
            user = dict(row)
            user["_plain_password"] = password
            return user

        async def inscripcion(self, estudiante_id: int, seccion_id: int, pago_id: Optional[int] = None, **overrides) -> Dict[str, Any]:
            defaults = dict(
                fecha_inscripcion=overrides.pop("fecha_inscripcion", None),
                estado="activo",
            )
            defaults.update(overrides)
            async with self._pool.acquire() as conn:
                if defaults["fecha_inscripcion"] is not None:
                    row = await conn.fetchrow(
                        """
                        INSERT INTO public.inscripciones (estudiante_id, seccion_id, pago_id, fecha_inscripcion, estado)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING *
                        """,
                        estudiante_id, seccion_id, pago_id, defaults["fecha_inscripcion"], defaults["estado"],
                    )
                else:
                    row = await conn.fetchrow(
                        """
                        INSERT INTO public.inscripciones (estudiante_id, seccion_id, pago_id, estado)
                        VALUES ($1, $2, $3, $4)
                        RETURNING *
                        """,
                        estudiante_id, seccion_id, pago_id, defaults["estado"],
                    )
            return dict(row)

    return SeedFactory(db_pool)


def login_and_get_token(client: TestClient, username: str, password: str) -> str:
    """Helper compartido: hace login y devuelve el access_token."""
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth_headers(token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
