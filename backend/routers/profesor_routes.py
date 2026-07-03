from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

from auth.dependencies import require_roles
from database import get_db
from schemas.common import PaginationParams, pagination_params, paginated_payload
from services import profesor_service
from services.errors import ServiceError
from utils.errors import GENERIC_ERROR_DETAIL

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/profesor",
    tags=["Profesor"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}}
)


class AsistenciaRegistro(BaseModel):
    inscripcion_id: int
    estado: str
    observaciones: Optional[str] = None


class AsistenciaRequest(BaseModel):
    seccion_id: int
    fecha: str
    registros: List[AsistenciaRegistro]


class EvaluacionRequest(BaseModel):
    inscripcion_id: int
    tipo_evaluacion: str
    nota: float
    peso_porcentual: float
    observaciones: Optional[str] = None


def _raise_from_service_error(e: ServiceError):
    raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.get("/{profesor_id}/secciones", summary="Secciones del profesor")
async def mis_secciones(
    profesor_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin'])),
    pagination: PaginationParams = Depends(pagination_params(default_limit=50, max_limit=200)),
) -> Dict[str, Any]:

    logger.info(f"Secciones profesor {profesor_id} por {current_user['cedula']}")

    if current_user['rol'] == 'profesor' and current_user['id'] != profesor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    try:
        async with get_db() as conn:
            secciones, total = await profesor_service.obtener_secciones_profesor(conn, profesor_id, pagination)

            return {"data": paginated_payload("secciones", secciones, pagination, total)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error secciones profesor: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/{profesor_id}/seccion/{seccion_id}/alumnos", summary="Alumnos de una sección")
async def alumnos_seccion(
    profesor_id: int,
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Alumnos sección {seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            alumnos = await profesor_service.obtener_alumnos_seccion(
                conn, seccion_id, current_user['id'], current_user['rol']
            )

            return {"data": {"alumnos": alumnos}}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error alumnos sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.post("/asistencia", summary="Registrar asistencia")
async def registrar_asistencia(
    data: AsistenciaRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor']))
) -> Dict[str, Any]:

    logger.info(f"Registrando asistencia sección {data.seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            guardados = await profesor_service.registrar_asistencia(
                conn, data.seccion_id, data.fecha, data.registros, current_user['id']
            )

            return {"data": {"registros_guardados": guardados, "fecha": data.fecha}}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error registrando asistencia: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/{profesor_id}/seccion/{seccion_id}/evaluaciones", summary="Evaluaciones de una sección")
async def evaluaciones_seccion(
    profesor_id: int,
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Evaluaciones sección {seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            evaluaciones = await profesor_service.obtener_evaluaciones_seccion(
                conn, seccion_id, current_user['id'], current_user['rol']
            )

            return {"data": {"evaluaciones": evaluaciones}}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error evaluaciones sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.post("/evaluacion", summary="Registrar evaluación parcial")
async def registrar_evaluacion(
    data: EvaluacionRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor']))
) -> Dict[str, Any]:

    logger.info(f"Registrando evaluación por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            evaluacion_id = await profesor_service.registrar_evaluacion(
                conn, data.inscripcion_id, data.tipo_evaluacion, data.nota,
                data.peso_porcentual, current_user['id'],
            )

            return {"data": {"evaluacion_id": evaluacion_id, "mensaje": "Evaluación guardada"}}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error registrando evaluación: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/{profesor_id}/seccion/{seccion_id}/asistencia-historica", summary="Historial de asistencia de una sección")
async def asistencia_historica(
    profesor_id: int,
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Historial asistencia sección {seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            resultado = await profesor_service.obtener_asistencia_historica(
                conn, seccion_id, current_user['id'], current_user['rol']
            )

            return {"data": resultado}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error historial asistencia: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)
