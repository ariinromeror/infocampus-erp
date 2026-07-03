"""
Tests de paginación consistente en listados (RQ-09 del PRD).

Cubren el contrato compartido de `schemas/common.py` (`page`, `limit`,
`total`, `total_pages` + `LIMIT`/`OFFSET` real en SQL) en una muestra
representativa de endpoints:
  - uno de los catálogos que no tenía ningún límite antes de RQ-09
    (`/academico/materias`),
  - un listado por-entidad-relacionada nuevo (`/profesor/{id}/secciones`),
  - dos listados anidados dentro de una respuesta con datos agregados
    (`/estudiante/{id}/pagos`, `/estudiante/{id}/asistencias`), para
    verificar que la paginación conviva con `resumen`/`estadisticas`.

También verifica que `limit` por encima del `max_limit` configurado
devuelve 422 (protección contra abuso), y que un `page` sin resultados
devuelve una lista vacía en vez de error.
"""
import pytest

from tests.conftest import auth_headers, login_and_get_token

pytestmark = pytest.mark.asyncio

PASSWORD = "ClaveSegura123!"


async def test_materias_devuelve_metadata_de_paginacion_y_respeta_limit(client, clean_db, seed):
    carrera = await seed.carrera()
    for i in range(5):
        await seed.materia(carrera["id"], codigo=f"MAT-{i}")

    admin = await seed.usuario("admin", password=PASSWORD)
    token = login_and_get_token(client, admin["cedula"], PASSWORD)

    response = client.get(
        "/api/academico/materias", params={"page": 1, "limit": 2}, headers=auth_headers(token)
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["materias"]) == 2
    assert data["page"] == 1
    assert data["limit"] == 2
    assert data["total"] >= 5
    assert data["total_pages"] >= 3


async def test_materias_limit_por_encima_del_maximo_devuelve_422(client, clean_db, seed):
    admin = await seed.usuario("admin", password=PASSWORD)
    token = login_and_get_token(client, admin["cedula"], PASSWORD)

    response = client.get(
        "/api/academico/materias", params={"limit": 100000}, headers=auth_headers(token)
    )

    assert response.status_code == 422


async def test_materias_pagina_sin_resultados_devuelve_lista_vacia(client, clean_db, seed):
    carrera = await seed.carrera()
    await seed.materia(carrera["id"])

    admin = await seed.usuario("admin", password=PASSWORD)
    token = login_and_get_token(client, admin["cedula"], PASSWORD)

    response = client.get(
        "/api/academico/materias", params={"page": 999, "limit": 10}, headers=auth_headers(token)
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["materias"] == []
    assert data["page"] == 999


async def test_profesor_secciones_paginadas(client, clean_db, seed):
    carrera = await seed.carrera()
    periodo = await seed.periodo()
    profesor = await seed.usuario("profesor", password=PASSWORD)
    for i in range(3):
        materia = await seed.materia(carrera["id"], codigo=f"MAT-SEC-{i}")
        await seed.seccion(materia["id"], periodo["id"], docente_id=profesor["id"])

    token = login_and_get_token(client, profesor["cedula"], PASSWORD)

    response = client.get(
        f"/api/profesor/{profesor['id']}/secciones",
        params={"page": 1, "limit": 2},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["secciones"]) == 2
    assert data["total"] == 3
    assert data["total_pages"] == 2


async def test_estudiante_pagos_paginados_conserva_resumen(client, clean_db, seed, db_pool):
    estudiante = await seed.usuario("estudiante", password=PASSWORD)

    async with db_pool.acquire() as conn:
        for i in range(4):
            await conn.execute(
                """
                INSERT INTO public.pagos (estudiante_id, monto, fecha_pago, metodo_pago, estado, concepto)
                VALUES ($1, $2, CURRENT_DATE, 'efectivo', 'completado', $3)
                """,
                estudiante["id"], 100.0 + i, f"Pago {i}",
            )

    token = login_and_get_token(client, estudiante["cedula"], PASSWORD)

    response = client.get(
        f"/api/estudiante/{estudiante['id']}/pagos",
        params={"page": 1, "limit": 2},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["pagos"]) == 2
    assert data["total"] == 4
    assert data["total_pages"] == 2
    # El resumen agregado debe reflejar TODOS los pagos, no solo la página actual.
    assert data["resumen"]["total_pagado"] == pytest.approx(100 + 101 + 102 + 103)


async def test_estudiante_asistencias_paginadas_conserva_estadisticas(client, clean_db, seed, db_pool):
    carrera = await seed.carrera()
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"])
    seccion = await seed.seccion(materia["id"], periodo["id"])
    estudiante = await seed.usuario("estudiante", password=PASSWORD, carrera_id=carrera["id"])
    inscripcion = await seed.inscripcion(estudiante["id"], seccion["id"])

    async with db_pool.acquire() as conn:
        for i in range(3):
            await conn.execute(
                """
                INSERT INTO public.asistencias (inscripcion_id, fecha, estado)
                VALUES ($1, CURRENT_DATE - $2::int, 'presente')
                """,
                inscripcion["id"], i,
            )

    token = login_and_get_token(client, estudiante["cedula"], PASSWORD)

    response = client.get(
        f"/api/estudiante/{estudiante['id']}/asistencias",
        params={"page": 1, "limit": 2},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["asistencias"]) == 2
    assert data["total"] == 3
    assert data["estadisticas"]["total"] == 3
