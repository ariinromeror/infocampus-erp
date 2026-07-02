"""
Tests de la logica de mora, deuda y becas — el area de mayor riesgo
financiero del sistema (backend/services/calculos_financieros.py).
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest

from services.calculos_financieros import (
    calcular_costo_materia,
    calcular_deuda_total,
    calcular_en_mora,
)
from tests.fakes import FakeConnection


# ---------------------------------------------------------------------------
# calcular_costo_materia — funcion pura, sin DB
# ---------------------------------------------------------------------------

def test_calcular_costo_materia_sin_beca():
    costo = calcular_costo_materia(creditos=4, precio_credito=Decimal("50.00"))
    assert costo == Decimal("200.00")


def test_calcular_costo_materia_con_beca_50_porciento():
    costo = calcular_costo_materia(
        creditos=4, precio_credito=Decimal("50.00"), porcentaje_beca=50
    )
    assert costo == Decimal("100.00")


def test_calcular_costo_materia_redondeo_half_up():
    # 3 creditos x $33.335 = $100.005 -> redondeo HALF_UP a 2 decimales = 100.01
    costo = calcular_costo_materia(creditos=3, precio_credito=Decimal("33.335"))
    assert costo == Decimal("100.01")


# ---------------------------------------------------------------------------
# calcular_en_mora — reglas de negocio de mora
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_estudiante_nunca_esta_en_mora():
    conn = FakeConnection()
    estudiante = {"rol": "profesor"}
    resultado = await calcular_en_mora(estudiante, inscripciones=[{"pago_id": None}], periodo_actual=None, conn=conn)
    assert resultado is False
    conn.fetchrow.assert_not_called()


@pytest.mark.asyncio
async def test_convenio_activo_vigente_protege_de_mora():
    conn = FakeConnection()
    estudiante = {
        "rol": "estudiante",
        "convenio_activo": True,
        "fecha_limite_convenio": (date.today() + timedelta(days=10)).isoformat(),
    }
    resultado = await calcular_en_mora(
        estudiante,
        inscripciones=[{"pago_id": None, "seccion_id": 1}],
        periodo_actual=None,
        conn=conn,
    )
    assert resultado is False
    conn.fetchrow.assert_not_called()


@pytest.mark.asyncio
async def test_convenio_vencido_no_protege_de_mora():
    conn = FakeConnection()
    estudiante = {
        "rol": "estudiante",
        "convenio_activo": True,
        "fecha_limite_convenio": (date.today() - timedelta(days=1)).isoformat(),
    }
    resultado = await calcular_en_mora(
        estudiante,
        inscripciones=[{"pago_id": None, "seccion_id": 1}],
        periodo_actual=None,
        conn=conn,
    )
    # Sin periodo activo, con deuda pendiente -> mora (regla simple)
    assert resultado is True


@pytest.mark.asyncio
async def test_sin_inscripciones_no_hay_mora():
    conn = FakeConnection()
    estudiante = {"rol": "estudiante"}
    resultado = await calcular_en_mora(estudiante, inscripciones=[], periodo_actual=None, conn=conn)
    assert resultado is False
    conn.fetchrow.assert_not_called()


@pytest.mark.asyncio
async def test_todas_las_inscripciones_pagadas_no_hay_mora():
    conn = FakeConnection()
    estudiante = {"rol": "estudiante"}
    inscripciones = [{"pago_id": 99, "seccion_id": 1}]
    resultado = await calcular_en_mora(estudiante, inscripciones, periodo_actual=None, conn=conn)
    assert resultado is False
    conn.fetchrow.assert_not_called()


@pytest.mark.asyncio
async def test_deuda_de_periodo_anterior_es_mora_inmediata():
    """REGLA 2: una inscripcion sin pagar de un periodo ya cerrado -> mora inmediata."""
    conn = FakeConnection(
        fetchrow_results=[
            {"fecha_fin": date(2025, 1, 1)},  # periodo de la inscripcion ya termino
        ]
    )
    estudiante = {"rol": "estudiante", "carrera_id": 1}
    inscripciones = [{"pago_id": None, "seccion_id": 10, "fecha_inscripcion": datetime.now().isoformat()}]
    periodo_actual = {"id": 5, "fecha_inicio": date(2025, 6, 1)}

    resultado = await calcular_en_mora(estudiante, inscripciones, periodo_actual, conn)
    assert resultado is True
    assert conn.fetchrow.await_count == 1


@pytest.mark.asyncio
async def test_periodo_actual_dentro_de_dias_gracia_no_es_mora():
    """REGLA 3: inscripcion del periodo actual, aun dentro del plazo de gracia."""
    conn = FakeConnection(
        fetchrow_results=[
            {"fecha_fin": date(2026, 12, 31)},  # periodo de la inscripcion aun no cierra
            {"dias_gracia_pago": 15},
            {"periodo_id": 5},
        ]
    )
    estudiante = {"rol": "estudiante", "carrera_id": 1}
    inscripciones = [
        {
            "pago_id": None,
            "seccion_id": 10,
            "fecha_inscripcion": (datetime.now() - timedelta(days=2)).isoformat(),
        }
    ]
    periodo_actual = {"id": 5, "fecha_inicio": date(2026, 1, 1)}

    resultado = await calcular_en_mora(estudiante, inscripciones, periodo_actual, conn)
    assert resultado is False


@pytest.mark.asyncio
async def test_periodo_actual_supero_dias_gracia_es_mora():
    """REGLA 3: inscripcion del periodo actual, ya supero los dias de gracia."""
    conn = FakeConnection(
        fetchrow_results=[
            {"fecha_fin": date(2026, 12, 31)},
            {"dias_gracia_pago": 5},
            {"periodo_id": 5},
        ]
    )
    estudiante = {"rol": "estudiante", "carrera_id": 1}
    inscripciones = [
        {
            "pago_id": None,
            "seccion_id": 10,
            "fecha_inscripcion": (datetime.now() - timedelta(days=20)).isoformat(),
        }
    ]
    periodo_actual = {"id": 5, "fecha_inicio": date(2026, 1, 1)}

    resultado = await calcular_en_mora(estudiante, inscripciones, periodo_actual, conn)
    assert resultado is True


# ---------------------------------------------------------------------------
# calcular_deuda_total — aplicacion de becas
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_deuda_total_no_estudiante_es_cero():
    conn = FakeConnection()
    resultado = await calcular_deuda_total({"rol": "director"}, inscripciones=[{"pago_id": None}], conn=conn)
    assert resultado == Decimal("0.00")


@pytest.mark.asyncio
async def test_deuda_total_aplica_descuento_de_beca():
    conn = FakeConnection(
        fetchrow_results=[
            {"precio_credito": "50.00"},  # precio de credito de la carrera
            {"creditos": 4},              # creditos de la materia inscrita
        ]
    )
    estudiante = {
        "rol": "estudiante",
        "carrera_id": 1,
        "es_becado": True,
        "porcentaje_beca": 25,
    }
    inscripciones = [{"pago_id": None, "seccion_id": 10}]

    resultado = await calcular_deuda_total(estudiante, inscripciones, conn)
    # 4 creditos x $50 = $200, con 25% de beca = $150
    assert resultado == Decimal("150.00")


@pytest.mark.asyncio
async def test_deuda_total_sin_pendientes_es_cero():
    conn = FakeConnection()
    estudiante = {"rol": "estudiante"}
    inscripciones = [{"pago_id": 1}]
    resultado = await calcular_deuda_total(estudiante, inscripciones, conn)
    assert resultado == Decimal("0.00")
    conn.fetchrow.assert_not_called()
