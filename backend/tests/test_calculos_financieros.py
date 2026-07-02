"""
Tests unitarios de `services/calculos_financieros.py` (RQ-04 del PRD).

Cubre las 3 reglas de negocio de mora documentadas en el propio módulo, más
el cálculo de deuda total/vencida y la aplicación de porcentaje de beca.

Estas funciones reciben `inscripciones` como listas de dicts ya obtenidas por
el caller (no las leen de la tabla `inscripciones`), así que los tests solo
necesitan datos reales de `carreras`/`periodos_lectivos`/`materias`/`secciones`
(que sí se consultan dentro de las funciones) y construyen los dicts de
inscripción a mano. Se usa `db_conn` (transacción que se revierte al final)
para aislamiento total entre tests.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio

from services.calculos_financieros import (
    calcular_costo_materia,
    calcular_deuda_total,
    calcular_deuda_vencida,
    calcular_en_mora,
)


async def _crear_carrera(conn, dias_gracia_pago=15, precio_credito=Decimal("50.00")):
    row = await conn.fetchrow(
        """
        INSERT INTO public.carreras (nombre, codigo, duracion_semestres, creditos_totales, precio_credito, dias_gracia_pago)
        VALUES ('Ingeniería de Prueba', 'ISW-TEST', 8, 200, $1, $2)
        RETURNING *
        """,
        precio_credito, dias_gracia_pago,
    )
    return dict(row)


async def _crear_periodo(conn, fecha_inicio: date, fecha_fin: date, codigo: str):
    row = await conn.fetchrow(
        """
        INSERT INTO public.periodos_lectivos (nombre, codigo, fecha_inicio, fecha_fin, activo)
        VALUES ('Periodo Test', $1, $2, $3, true)
        RETURNING *
        """,
        codigo, fecha_inicio, fecha_fin,
    )
    return dict(row)


async def _crear_materia(conn, carrera_id: int, creditos: int = 4):
    row = await conn.fetchrow(
        """
        INSERT INTO public.materias (nombre, codigo, creditos, semestre, carrera_id)
        VALUES ('Materia Test', 'MAT-TEST', $1, 1, $2)
        RETURNING *
        """,
        creditos, carrera_id,
    )
    return dict(row)


async def _crear_seccion(conn, materia_id: int, periodo_id: int):
    row = await conn.fetchrow(
        """
        INSERT INTO public.secciones (materia_id, periodo_id, codigo, cupo_maximo)
        VALUES ($1, $2, 'SEC-TEST', 30)
        RETURNING *
        """,
        materia_id, periodo_id,
    )
    return dict(row)


@pytest.fixture
def estudiante_base():
    return {
        "rol": "estudiante",
        "cedula": "0102030405",
        "convenio_activo": False,
        "fecha_limite_convenio": None,
        "carrera_id": None,
        "es_becado": False,
        "porcentaje_beca": 0,
    }


class Escenario:
    """Agrupa las entidades de negocio (carrera/periodos/materia/secciones)
    que comparten la mayoría de los tests de mora y deuda."""

    def __init__(self, carrera, periodo_actual, periodo_anterior, materia, seccion_actual, seccion_anterior):
        self.carrera = carrera
        self.periodo_actual = periodo_actual
        self.periodo_anterior = periodo_anterior
        self.materia = materia
        self.seccion_actual = seccion_actual
        self.seccion_anterior = seccion_anterior


@pytest_asyncio.fixture
async def escenario(db_conn):
    hoy = date.today()
    carrera = await _crear_carrera(db_conn, dias_gracia_pago=15, precio_credito=Decimal("50.00"))
    periodo_actual = await _crear_periodo(
        db_conn, hoy - timedelta(days=30), hoy + timedelta(days=60), "ACTUAL"
    )
    periodo_anterior = await _crear_periodo(
        db_conn, hoy - timedelta(days=200), hoy - timedelta(days=100), "ANTERIOR"
    )
    materia = await _crear_materia(db_conn, carrera["id"], creditos=4)
    seccion_actual = await _crear_seccion(db_conn, materia["id"], periodo_actual["id"])
    seccion_anterior = await _crear_seccion(db_conn, materia["id"], periodo_anterior["id"])
    return Escenario(carrera, periodo_actual, periodo_anterior, materia, seccion_actual, seccion_anterior)


# ---------------------------------------------------------------------------
# calcular_en_mora — Regla 1: convenio activo y vigente
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_convenio_activo_vigente_protege_de_mora(db_conn, estudiante_base, escenario):
    estudiante_base["convenio_activo"] = True
    estudiante_base["fecha_limite_convenio"] = date.today() + timedelta(days=30)
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]

    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)

    assert en_mora is False


@pytest.mark.asyncio
async def test_convenio_activo_vigente_con_fecha_como_string_iso(db_conn, estudiante_base, escenario):
    """`fecha_limite_convenio` puede llegar como string ISO (ej. proveniente de
    JSON) en vez de `date`; la función debe normalizarla igual."""
    estudiante_base["convenio_activo"] = True
    estudiante_base["fecha_limite_convenio"] = (date.today() + timedelta(days=30)).isoformat()
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]

    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)

    assert en_mora is False


@pytest.mark.asyncio
async def test_convenio_activo_vigente_con_fecha_datetime(db_conn, estudiante_base, escenario):
    """`fecha_limite_convenio` como `datetime` (no `date`) también debe
    normalizarse correctamente."""
    estudiante_base["convenio_activo"] = True
    estudiante_base["fecha_limite_convenio"] = datetime.now() + timedelta(days=30)
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]

    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)

    assert en_mora is False


@pytest.mark.asyncio
async def test_convenio_vencido_no_protege_de_mora(db_conn, estudiante_base, escenario):
    estudiante_base["convenio_activo"] = True
    estudiante_base["fecha_limite_convenio"] = date.today() - timedelta(days=1)
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]

    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)

    assert en_mora is True


# ---------------------------------------------------------------------------
# calcular_en_mora — casos base
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sin_inscripciones_no_esta_en_mora(db_conn, estudiante_base, escenario):
    en_mora = await calcular_en_mora(estudiante_base, [], escenario.periodo_actual, db_conn)
    assert en_mora is False


@pytest.mark.asyncio
async def test_todas_las_inscripciones_pagadas_no_esta_en_mora(db_conn, estudiante_base, escenario):
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": 999, "fecha_inscripcion": date.today()}
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is False


@pytest.mark.asyncio
async def test_rol_no_estudiante_nunca_esta_en_mora(db_conn, estudiante_base, escenario):
    estudiante_base["rol"] = "profesor"
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is False


# ---------------------------------------------------------------------------
# calcular_en_mora — Regla 2: períodos anteriores impagos
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_deuda_de_periodo_anterior_es_mora_inmediata(db_conn, estudiante_base, escenario):
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is True


@pytest.mark.asyncio
async def test_regla2_seccion_inexistente_no_rompe_el_calculo(db_conn, estudiante_base, escenario):
    """Una inscripción que apunta a una sección borrada no debe lanzar una
    excepción: se ignora y se sigue evaluando el resto."""
    inscripciones = [{"id": 1, "seccion_id": 999999, "pago_id": None, "fecha_inscripcion": date.today()}]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is False


@pytest.mark.asyncio
async def test_regla3_inscripcion_sin_fecha_no_cuenta(db_conn, estudiante_base, escenario):
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None, "fecha_inscripcion": None}
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is False


@pytest.mark.asyncio
async def test_sin_periodo_actual_usa_logica_simple(db_conn, estudiante_base, escenario):
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None, "fecha_inscripcion": date.today()}
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, None, db_conn)
    assert en_mora is True


# ---------------------------------------------------------------------------
# calcular_en_mora — Regla 3: período actual + días de gracia
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dentro_de_dias_de_gracia_no_esta_en_mora(db_conn, estudiante_base, escenario):
    # carrera_id seteado a propósito: ejercita la rama que consulta
    # `dias_gracia_pago` desde `carreras` en vez de usar el default del módulo.
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [
        {
            "id": 1,
            "seccion_id": escenario.seccion_actual["id"],
            "pago_id": None,
            "fecha_inscripcion": datetime.now() - timedelta(days=5),
        }
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is False


@pytest.mark.asyncio
async def test_supero_dias_de_gracia_esta_en_mora(db_conn, estudiante_base, escenario):
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [
        {
            "id": 1,
            "seccion_id": escenario.seccion_actual["id"],
            "pago_id": None,
            "fecha_inscripcion": datetime.now() - timedelta(days=20),
        }
    ]
    en_mora = await calcular_en_mora(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert en_mora is True


# ---------------------------------------------------------------------------
# calcular_deuda_total
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_deuda_total_sin_inscripciones_es_cero(db_conn, estudiante_base, escenario):
    deuda = await calcular_deuda_total(estudiante_base, [], db_conn)
    assert deuda == Decimal("0.00")


@pytest.mark.asyncio
async def test_deuda_total_rol_no_estudiante_es_cero(db_conn, estudiante_base, escenario):
    estudiante_base["rol"] = "profesor"
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [{"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None}]
    deuda = await calcular_deuda_total(estudiante_base, inscripciones, db_conn)
    assert deuda == Decimal("0.00")


@pytest.mark.asyncio
async def test_deuda_total_sin_beca(db_conn, estudiante_base, escenario):
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [{"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None}]
    deuda = await calcular_deuda_total(estudiante_base, inscripciones, db_conn)
    # 4 créditos x $50.00 = $200.00
    assert deuda == Decimal("200.00")


@pytest.mark.asyncio
async def test_deuda_total_aplica_porcentaje_de_beca(db_conn, estudiante_base, escenario):
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    estudiante_base["es_becado"] = True
    estudiante_base["porcentaje_beca"] = 20
    inscripciones = [{"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None}]
    deuda = await calcular_deuda_total(estudiante_base, inscripciones, db_conn)
    # 200.00 - 20% = 160.00
    assert deuda == Decimal("160.00")


@pytest.mark.asyncio
async def test_deuda_total_solo_cuenta_inscripciones_sin_pagar(db_conn, estudiante_base, escenario):
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [
        {"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None},
        {"id": 2, "seccion_id": escenario.seccion_actual["id"], "pago_id": 42},
    ]
    deuda = await calcular_deuda_total(estudiante_base, inscripciones, db_conn)
    assert deuda == Decimal("200.00")


@pytest.mark.asyncio
async def test_deuda_total_ignora_inscripcion_con_seccion_inexistente(db_conn, estudiante_base, escenario):
    """Una inscripción que referencia una sección borrada/inexistente no debe
    romper el cálculo: simplemente se omite del total."""
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [
        {"id": 1, "seccion_id": 999999, "pago_id": None},
        {"id": 2, "seccion_id": escenario.seccion_actual["id"], "pago_id": None},
    ]
    deuda = await calcular_deuda_total(estudiante_base, inscripciones, db_conn)
    assert deuda == Decimal("200.00")


# ---------------------------------------------------------------------------
# calcular_deuda_vencida
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_deuda_vencida_sin_periodo_actual_delega_a_deuda_total(db_conn, estudiante_base, escenario):
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [{"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": None}]

    esperado = await calcular_deuda_total(estudiante_base, inscripciones, db_conn)
    obtenido = await calcular_deuda_vencida(estudiante_base, inscripciones, None, db_conn)

    assert obtenido == esperado


@pytest.mark.asyncio
async def test_deuda_vencida_solo_cuenta_lo_realmente_vencido(db_conn, estudiante_base, escenario):
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    inscripciones = [
        # Período anterior, ya cerrado → vencida.
        {"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None, "fecha_inscripcion": date.today()},
        # Período actual, dentro de los días de gracia → NO vencida todavía.
        {
            "id": 2,
            "seccion_id": escenario.seccion_actual["id"],
            "pago_id": None,
            "fecha_inscripcion": datetime.now() - timedelta(days=2),
        },
    ]

    deuda_vencida = await calcular_deuda_vencida(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)

    # Solo la inscripción de período anterior debe contar: $200.00
    assert deuda_vencida == Decimal("200.00")


@pytest.mark.asyncio
async def test_deuda_vencida_rol_no_estudiante_es_cero(db_conn, estudiante_base, escenario):
    estudiante_base["rol"] = "profesor"
    inscripciones = [{"id": 1, "seccion_id": escenario.seccion_anterior["id"], "pago_id": None}]
    deuda = await calcular_deuda_vencida(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert deuda == Decimal("0.00")


@pytest.mark.asyncio
async def test_deuda_vencida_sin_pendientes_es_cero(db_conn, estudiante_base, escenario):
    inscripciones = [{"id": 1, "seccion_id": escenario.seccion_actual["id"], "pago_id": 42}]
    deuda = await calcular_deuda_vencida(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)
    assert deuda == Decimal("0.00")


@pytest.mark.asyncio
async def test_deuda_vencida_periodo_actual_aplica_beca(db_conn, estudiante_base, escenario):
    """La porción de deuda del período actual que ya superó los días de
    gracia también debe descontar la beca del estudiante."""
    estudiante_base["carrera_id"] = escenario.carrera["id"]
    estudiante_base["es_becado"] = True
    estudiante_base["porcentaje_beca"] = 50
    inscripciones = [
        {
            "id": 1,
            "seccion_id": escenario.seccion_actual["id"],
            "pago_id": None,
            "fecha_inscripcion": datetime.now() - timedelta(days=20),
        }
    ]

    deuda_vencida = await calcular_deuda_vencida(estudiante_base, inscripciones, escenario.periodo_actual, db_conn)

    # $200.00 - 50% beca = $100.00
    assert deuda_vencida == Decimal("100.00")


# ---------------------------------------------------------------------------
# calcular_costo_materia (función pura, sin conexión a BD)
# ---------------------------------------------------------------------------

def test_costo_materia_sin_beca():
    costo = calcular_costo_materia(creditos=4, precio_credito=Decimal("50.00"))
    assert costo == Decimal("200.00")


def test_costo_materia_con_beca():
    costo = calcular_costo_materia(creditos=4, precio_credito=Decimal("50.00"), porcentaje_beca=25)
    assert costo == Decimal("150.00")


def test_costo_materia_redondeo_half_up():
    # 3 créditos x $33.335 = $100.005 → redondeo HALF_UP a 2 decimales = $100.01
    costo = calcular_costo_materia(creditos=3, precio_credito=Decimal("33.335"))
    assert costo == Decimal("100.01")
