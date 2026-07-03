"""
Tests de los endpoints CRUD de `routers/academico.py` (RQ-07 del PRD).

RQ-07 extrajo toda la lógica SQL de `academico.py` a
`services/academico_service.py`. Estos tests cubren dos capas:

1. El servicio directamente (sin pasar por HTTP), tal como pide el
   criterio de aceptación de RQ-07 ("los tests ... pueden ejecutarse
   contra el servicio directamente").
2. El router vía `TestClient`, para verificar que el mapeo de
   `services.errors.ServiceError` -> `HTTPException` (404/400) sigue
   funcionando end-to-end tras la extracción.
"""
import pytest

from services import academico_service
from services.errors import NotFoundError, ValidationError
from tests.conftest import auth_headers, login_and_get_token

pytestmark = pytest.mark.asyncio

PASSWORD = "ClaveSegura123!"


# ---------------------------------------------------------------------------
# Servicio directo (sin HTTP)
# ---------------------------------------------------------------------------

async def test_crear_seccion_service_lanza_not_found_si_materia_no_existe(clean_db, db_pool):
    carrera = None
    async with db_pool.acquire() as conn:
        with pytest.raises(NotFoundError):
            await academico_service.crear_seccion(
                conn, materia_id=999999, periodo_id=1, docente_id=None,
                codigo="SEC-X", cupo_maximo=30, aula="A-1", horario={},
            )


async def test_crear_seccion_service_crea_seccion_correctamente(clean_db, seed, db_pool):
    carrera = await seed.carrera()
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"])

    async with db_pool.acquire() as conn:
        seccion_id = await academico_service.crear_seccion(
            conn, materia_id=materia["id"], periodo_id=periodo["id"], docente_id=None,
            codigo="SEC-NEW", cupo_maximo=30, aula="A-1", horario={"dias": ["Lun"]},
        )
        row = await conn.fetchrow("SELECT codigo FROM public.secciones WHERE id = $1", seccion_id)

    assert row["codigo"] == "SEC-NEW"


async def test_crear_seccion_service_rechaza_docente_no_profesor(clean_db, seed, db_pool):
    carrera = await seed.carrera()
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"])
    estudiante = await seed.usuario("estudiante", password=PASSWORD)

    async with db_pool.acquire() as conn:
        with pytest.raises(ValidationError):
            await academico_service.crear_seccion(
                conn, materia_id=materia["id"], periodo_id=periodo["id"], docente_id=estudiante["id"],
                codigo="SEC-BAD", cupo_maximo=30, aula="A-1", horario={},
            )


async def test_actualizar_carrera_service_rechaza_precio_negativo(clean_db, seed, db_pool):
    carrera = await seed.carrera()
    async with db_pool.acquire() as conn:
        with pytest.raises(ValidationError):
            await academico_service.actualizar_carrera(conn, carrera["id"], -10.0)


async def test_corregir_nota_service_actualiza_estado_segun_nota(clean_db, seed, db_pool):
    carrera = await seed.carrera()
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"])
    seccion = await seed.seccion(materia["id"], periodo["id"])
    estudiante = await seed.usuario("estudiante", password=PASSWORD, carrera_id=carrera["id"])
    inscripcion = await seed.inscripcion(estudiante["id"], seccion["id"])
    coordinador = await seed.usuario("coordinador", password=PASSWORD)

    async with db_pool.acquire() as conn:
        resultado = await academico_service.corregir_nota(
            conn, inscripcion["id"], nota_final=8.5, motivo="Recalificación", modificado_por_id=coordinador["id"]
        )

    assert resultado["estado"] == "aprobado"
    assert resultado["nota_nueva"] == 8.5


# ---------------------------------------------------------------------------
# Router vía HTTP (TestClient)
# ---------------------------------------------------------------------------

async def test_crear_seccion_endpoint_404_si_materia_no_existe(client, clean_db, seed):
    periodo = await seed.periodo()
    coordinador = await seed.usuario("coordinador", password=PASSWORD)
    token = login_and_get_token(client, coordinador["cedula"], PASSWORD)

    response = client.post(
        "/api/academico/secciones",
        json={
            "materia_id": 999999, "periodo_id": periodo["id"], "codigo": "SEC-X",
            "cupo_maximo": 30, "aula": "A-1", "horario": {},
        },
        headers=auth_headers(token),
    )

    assert response.status_code == 404


async def test_crear_periodo_endpoint_400_si_codigo_duplicado(client, clean_db, seed):
    periodo = await seed.periodo()
    director = await seed.usuario("director", password=PASSWORD)
    token = login_and_get_token(client, director["cedula"], PASSWORD)

    response = client.post(
        "/api/academico/periodos",
        json={
            "nombre": "Duplicado", "codigo": periodo["codigo"],
            "fecha_inicio": "2027-01-01", "fecha_fin": "2027-06-01", "activo": False,
        },
        headers=auth_headers(token),
    )

    assert response.status_code == 400


async def test_actualizar_carrera_endpoint_404_si_no_existe(client, clean_db, seed):
    admin = await seed.usuario("admin", password=PASSWORD)
    token = login_and_get_token(client, admin["cedula"], PASSWORD)

    response = client.put(
        "/api/academico/carreras/999999",
        json={"precio_credito": 60.0},
        headers=auth_headers(token),
    )

    assert response.status_code == 404


async def test_actualizar_carrera_endpoint_ok(client, clean_db, seed):
    carrera = await seed.carrera()
    admin = await seed.usuario("admin", password=PASSWORD)
    token = login_and_get_token(client, admin["cedula"], PASSWORD)

    response = client.put(
        f"/api/academico/carreras/{carrera['id']}",
        json={"precio_credito": 75.5},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json()["data"]["precio_credito"] == 75.5
