"""
Tests de integración del flujo de pagos (RQ-04 del PRD):
POST /api/estudiantes/{id}/registrar-pago — registrar pago, verificar
actualización de saldo (inscripción marcada como pagada) y verificar que un
rol no autorizado recibe 403.
"""
import pytest

from tests.conftest import auth_headers, login_and_get_token

pytestmark = pytest.mark.asyncio

PASSWORD = "ClaveSegura123!"


async def _crear_escenario_con_deuda(seed):
    """Carrera + período + materia + sección + estudiante con una inscripción
    pendiente de pago (pago_id NULL)."""
    carrera = await seed.carrera(precio_credito=50.00)
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"], creditos=4)
    seccion = await seed.seccion(materia["id"], periodo["id"])
    estudiante = await seed.usuario("estudiante", password=PASSWORD, carrera_id=carrera["id"])
    inscripcion = await seed.inscripcion(estudiante["id"], seccion["id"], pago_id=None)
    return estudiante, inscripcion


async def test_tesorero_registra_pago_y_salda_la_inscripcion(client, clean_db, seed, db_pool):
    estudiante, inscripcion = await _crear_escenario_con_deuda(seed)
    tesorero = await seed.usuario("tesorero", password=PASSWORD)
    token = login_and_get_token(client, tesorero["cedula"], PASSWORD)

    response = client.post(
        f"/api/estudiantes/{estudiante['id']}/registrar-pago",
        json={"metodo_pago": "efectivo", "comprobante": "TEST-001"},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["pagos_registrados"] == 1
    # 4 créditos x $50.00 = $200.00
    assert body["monto_total"] == 200.0

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT pago_id FROM public.inscripciones WHERE id = $1", inscripcion["id"]
        )
    assert row["pago_id"] is not None


async def test_registrar_pago_aplica_beca_del_estudiante(client, clean_db, seed):
    carrera = await seed.carrera(precio_credito=50.00)
    periodo = await seed.periodo()
    materia = await seed.materia(carrera["id"], creditos=4)
    seccion = await seed.seccion(materia["id"], periodo["id"])
    estudiante = await seed.usuario(
        "estudiante", password=PASSWORD, carrera_id=carrera["id"], es_becado=True, porcentaje_beca=25
    )
    await seed.inscripcion(estudiante["id"], seccion["id"], pago_id=None)

    tesorero = await seed.usuario("tesorero", password=PASSWORD)
    token = login_and_get_token(client, tesorero["cedula"], PASSWORD)

    response = client.post(
        f"/api/estudiantes/{estudiante['id']}/registrar-pago",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    # $200.00 - 25% beca = $150.00
    assert response.json()["monto_total"] == 150.0


async def test_registrar_pago_sin_deuda_no_crea_pagos(client, clean_db, seed):
    estudiante = await seed.usuario("estudiante", password=PASSWORD)
    tesorero = await seed.usuario("tesorero", password=PASSWORD)
    token = login_and_get_token(client, tesorero["cedula"], PASSWORD)

    response = client.post(
        f"/api/estudiantes/{estudiante['id']}/registrar-pago",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(token),
    )

    assert response.status_code == 200
    assert response.json()["pagos_registrados"] == 0


async def test_registrar_pago_rol_no_autorizado_devuelve_403(client, clean_db, seed):
    estudiante, _inscripcion = await _crear_escenario_con_deuda(seed)
    # El propio estudiante no puede registrarse un pago a sí mismo: el
    # endpoint es exclusivo de tesorero/director/admin.
    token = login_and_get_token(client, estudiante["cedula"], PASSWORD)

    response = client.post(
        f"/api/estudiantes/{estudiante['id']}/registrar-pago",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(token),
    )

    assert response.status_code == 403


async def test_registrar_pago_estudiante_inexistente_devuelve_404(client, clean_db, seed):
    tesorero = await seed.usuario("tesorero", password=PASSWORD)
    token = login_and_get_token(client, tesorero["cedula"], PASSWORD)

    response = client.post(
        "/api/estudiantes/999999/registrar-pago",
        json={"metodo_pago": "efectivo"},
        headers=auth_headers(token),
    )

    assert response.status_code == 404
