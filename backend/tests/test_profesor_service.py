"""
Tests de `services/profesor_service.py` (RQ-07 del PRD).

Cubren específicamente las comprobaciones de permiso ("¿esta sección es de
este profesor?") que quedaron encapsuladas en el servicio junto a la query
que las hace posibles, tanto a nivel de servicio directo como a través del
router (`TestClient`) para confirmar el mapeo `ForbiddenError` -> HTTP 403.
"""
import pytest

from services import profesor_service
from services.errors import ForbiddenError, NotFoundError
from tests.conftest import auth_headers, login_and_get_token

pytestmark = pytest.mark.asyncio

PASSWORD = "ClaveSegura123!"


async def _crear_escenario(seed):
    carrera = await seed.carrera()
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"])
    profesor = await seed.usuario("profesor", password=PASSWORD)
    otro_profesor = await seed.usuario("profesor", password=PASSWORD)
    seccion = await seed.seccion(materia["id"], periodo["id"], docente_id=profesor["id"])
    return profesor, otro_profesor, seccion


async def test_alumnos_seccion_rechaza_profesor_que_no_es_el_docente(clean_db, seed, db_pool):
    profesor, otro_profesor, seccion = await _crear_escenario(seed)

    async with db_pool.acquire() as conn:
        with pytest.raises(ForbiddenError):
            await profesor_service.obtener_alumnos_seccion(
                conn, seccion["id"], otro_profesor["id"], "profesor"
            )


async def test_alumnos_seccion_permite_al_docente_asignado(clean_db, seed, db_pool):
    profesor, _otro, seccion = await _crear_escenario(seed)

    async with db_pool.acquire() as conn:
        alumnos = await profesor_service.obtener_alumnos_seccion(
            conn, seccion["id"], profesor["id"], "profesor"
        )

    assert alumnos == []


async def test_alumnos_seccion_permite_a_coordinador_sin_importar_docente(clean_db, seed, db_pool):
    profesor, _otro, seccion = await _crear_escenario(seed)

    async with db_pool.acquire() as conn:
        alumnos = await profesor_service.obtener_alumnos_seccion(
            conn, seccion["id"], 999999, "coordinador"
        )

    assert alumnos == []


async def test_alumnos_seccion_lanza_not_found_si_seccion_no_existe(clean_db, db_pool):
    async with db_pool.acquire() as conn:
        with pytest.raises(NotFoundError):
            await profesor_service.obtener_alumnos_seccion(conn, 999999, 1, "profesor")


async def test_registrar_asistencia_rechaza_profesor_no_asignado(clean_db, seed, db_pool):
    profesor, otro_profesor, seccion = await _crear_escenario(seed)

    async with db_pool.acquire() as conn:
        with pytest.raises(ForbiddenError):
            await profesor_service.registrar_asistencia(
                conn, seccion["id"], "2026-03-01", [], otro_profesor["id"]
            )


async def test_endpoint_alumnos_seccion_devuelve_403_si_no_es_el_docente(client, clean_db, seed):
    profesor, otro_profesor, seccion = await _crear_escenario(seed)
    token = login_and_get_token(client, otro_profesor["cedula"], PASSWORD)

    response = client.get(
        f"/api/profesor/{otro_profesor['id']}/seccion/{seccion['id']}/alumnos",
        headers=auth_headers(token),
    )

    assert response.status_code == 403


async def test_endpoint_alumnos_seccion_devuelve_404_si_seccion_no_existe(client, clean_db, seed):
    profesor = await seed.usuario("profesor", password=PASSWORD)
    token = login_and_get_token(client, profesor["cedula"], PASSWORD)

    response = client.get(
        f"/api/profesor/{profesor['id']}/seccion/999999/alumnos",
        headers=auth_headers(token),
    )

    assert response.status_code == 404
