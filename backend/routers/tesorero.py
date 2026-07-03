from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import logging

from auth.dependencies import require_roles
from database import get_db
from schemas.common import PaginationParams, pagination_params, paginated_payload
from services import tesoreria_service
from utils.errors import GENERIC_ERROR_DETAIL

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tesorero",
    tags=["Tesorero"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}},
)


class AsignarBecaRequest(BaseModel):
    """RQ-08 (docs/PRD.md): reemplaza los query params sueltos que tenía este
    endpoint financiero por un body validado por Pydantic."""
    porcentaje_beca: int = Field(default=0, ge=0, le=100, description="Porcentaje de beca, 0-100")
    tipo_beca: Optional[str] = Field(default=None, max_length=100)

    class Config:
        json_schema_extra = {"example": {"porcentaje_beca": 50, "tipo_beca": "Mérito académico"}}


class IngresoMensual(BaseModel):
    mes: Optional[str] = None
    monto: float


class ResumenKPIsResponse(BaseModel):
    """RQ-08 (docs/PRD.md): response_model para uno de los endpoints de dashboard
    de mayor tráfico, documentando el contrato de salida en /docs."""
    recaudado_total: float
    pendiente_cobro: float
    estudiantes_mora: int
    pagos_completados: int
    pagos_pendientes: int
    proyeccion_mes: float
    ingresos_ultimos_6_meses: List[IngresoMensual]


@router.get("/resumen-kpis", summary="KPIs financieros rápidos", response_model=ResumenKPIsResponse)
async def resumen_kpis(
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"]))
) -> ResumenKPIsResponse:
    try:
        async with get_db() as conn:
            return await tesoreria_service.obtener_resumen_kpis(conn)

    except Exception as e:
        logger.error(f"Error obteniendo KPIs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/pagos", summary="Listar todos los pagos")
async def listar_pagos(
    estudiante_id: Optional[int] = None,
    estado: Optional[str] = None,
    periodo_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    pagination: PaginationParams = Depends(pagination_params(default_limit=20, max_limit=100)),
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"])),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            pagos, total = await tesoreria_service.listar_pagos(
                conn, pagination,
                estudiante_id=estudiante_id, estado=estado, periodo_id=periodo_id,
                carrera_id=carrera_id, semestre=semestre,
            )

        return {"data": paginated_payload("pagos", pagos, pagination, total)}

    except Exception as e:
        logger.error(f"Error listando pagos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/estudiantes-mora", summary="Estudiantes en mora")
async def estudiantes_mora(
    # RQ-09: reemplaza el `LIMIT 200` fijo que tenía este endpoint por el
    # estándar page/limit. Default alto (por encima del volumen actual de
    # estudiantes en mora) porque el frontend (tabla de mora, convenios,
    # KPIs y exportación CSV/PDF) hoy asume recibir la lista completa.
    pagination: PaginationParams = Depends(pagination_params(default_limit=500, max_limit=1000)),
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            estudiantes, total = await tesoreria_service.listar_estudiantes_mora(conn, pagination)

        return {"data": paginated_payload("estudiantes", estudiantes, pagination, total)}

    except Exception as e:
        logger.error(f"Error consultando mora: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/ingresos-por-periodo", summary="Ingresos agrupados por período")
async def ingresos_por_periodo(
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            periodos = await tesoreria_service.obtener_ingresos_por_periodo(conn)
        return {"data": {"periodos": periodos}}

    except Exception as e:
        logger.error(f"Error consultando ingresos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/buscar-estudiante", summary="Buscar estudiante por nombre o cédula")
async def buscar_estudiante(
    q: str,
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"])),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            estudiantes = await tesoreria_service.buscar_estudiante(conn, q)
        return {"data": {"estudiantes": estudiantes}}

    except Exception as e:
        logger.error(f"Error buscando estudiante: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.post("/becas/{estudiante_id}", summary="Asignar o modificar beca de estudiante")
async def asignar_beca(
    estudiante_id: int,
    data: AsignarBecaRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"])),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            resultado = await tesoreria_service.asignar_beca(
                conn, estudiante_id, data.porcentaje_beca, data.tipo_beca
            )

        return {
            "ok": True,
            "message": "Beca actualizada correctamente",
            "data": resultado,
        }

    except tesoreria_service.EstudianteNoEncontrado:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    except Exception as e:
        logger.error(f"Error asignando beca: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/periodos", summary="Listar períodos lectivos")
async def listar_periodos(
    current_user: Dict[str, Any] = Depends(
        require_roles(["director", "admin", "coordinador", "tesorero"])
    ),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            periodos = await tesoreria_service.listar_periodos(conn)
        return {"data": {"periodos": periodos}}

    except Exception as e:
        logger.error(f"Error listando períodos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/becas", summary="Listar todos los estudiantes con beca")
async def listar_becados(
    current_user: Dict[str, Any] = Depends(
        require_roles(["director", "admin", "coordinador", "tesorero"])
    ),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            becados = await tesoreria_service.listar_becados(conn)
        return {"data": {"becados": becados}}

    except Exception as e:
        logger.error(f"Error listando becados: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)
