from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from auth.dependencies import require_roles, get_current_user
from database import get_db
from schemas.common import PaginationParams, pagination_params, paginated_payload
from services import academico_service
from services.errors import ServiceError
from utils.errors import GENERIC_ERROR_DETAIL

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/academico",
    tags=["Academico"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}}
)


class SeccionCreateRequest(BaseModel):
    materia_id: int
    periodo_id: int
    docente_id: Optional[int] = None
    codigo: str
    cupo_maximo: int
    aula: str
    horario: Dict[str, Any]


class SeccionUpdateRequest(BaseModel):
    docente_id: Optional[int] = None
    codigo: Optional[str] = None
    cupo_maximo: Optional[int] = None
    aula: Optional[str] = None
    horario: Optional[Dict[str, Any]] = None


class CarreraUpdateRequest(BaseModel):
    precio_credito: float


class PeriodoCreateRequest(BaseModel):
    nombre: str
    codigo: str
    fecha_inicio: str
    fecha_fin: str
    activo: bool = False


class PeriodoUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    activo: Optional[bool] = None


class NotaCorreccionRequest(BaseModel):
    nota_final: float
    motivo: str


def _raise_from_service_error(e: ServiceError):
    raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/secciones", summary="Crear nueva sección")
async def crear_seccion(
    data: SeccionCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            seccion_id = await academico_service.crear_seccion(
                conn, data.materia_id, data.periodo_id, data.docente_id,
                data.codigo, data.cupo_maximo, data.aula, data.horario,
            )

        return {
            "message": "Sección creada exitosamente",
            "seccion_id": seccion_id
        }

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error creando sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.put("/secciones/{seccion_id}", summary="Actualizar sección")
async def actualizar_seccion(
    seccion_id: int,
    data: SeccionUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            await academico_service.actualizar_seccion(
                conn, seccion_id, data.docente_id, data.codigo,
                data.cupo_maximo, data.aula, data.horario,
            )

        return {"message": "Sección actualizada exitosamente"}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error actualizando sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.post("/periodos", summary="Crear nuevo período lectivo")
async def crear_periodo(
    data: PeriodoCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'admin', 'coordinador', 'tesorero']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            periodo_id = await academico_service.crear_periodo(
                conn, data.nombre, data.codigo, data.fecha_inicio, data.fecha_fin, data.activo
            )

        return {
            "message": "Período lectivo creado exitosamente",
            "periodo_id": periodo_id
        }

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error creando período: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.put("/periodos/{periodo_id}", summary="Actualizar período lectivo")
async def actualizar_periodo(
    periodo_id: int,
    data: PeriodoUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'admin', 'coordinador', 'tesorero']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            await academico_service.actualizar_periodo(
                conn, periodo_id, data.nombre, data.fecha_inicio, data.fecha_fin, data.activo
            )

        return {"message": "Período actualizado exitosamente"}

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error actualizando período: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.put("/inscripciones/{inscripcion_id}/corregir-nota", summary="Corregir nota (solo coordinador)")
async def corregir_nota(
    inscripcion_id: int,
    data: NotaCorreccionRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            resultado = await academico_service.corregir_nota(
                conn, inscripcion_id, data.nota_final, data.motivo, current_user['id']
            )

        return {
            "message": "Nota corregida y registrada en historial",
            "nota_anterior": resultado["nota_anterior"],
            "nota_nueva": resultado["nota_nueva"],
            "estado": resultado["estado"],
            "corregido_por": f"{current_user['first_name']} {current_user['last_name']}"
        }

    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error corrigiendo nota: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/carreras", summary="Listar carreras")
async def listar_carreras(
    pagination: PaginationParams = Depends(pagination_params(default_limit=50, max_limit=100)),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            carreras, total = await academico_service.listar_carreras(conn, pagination)
            return {"data": paginated_payload("carreras", carreras, pagination, total)}
    except Exception as e:
        logger.error(f"Error listando carreras: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.put("/carreras/{carrera_id}", summary="Actualizar carrera (precio_credito)")
async def actualizar_carrera(
    carrera_id: int,
    data: CarreraUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'coordinador', 'admin']))
) -> Dict[str, Any]:
    """Actualiza precio_credito de una carrera."""
    try:
        async with get_db() as conn:
            resultado = await academico_service.actualizar_carrera(conn, carrera_id, data.precio_credito)
            return {"data": resultado, "message": "Carrera actualizada"}
    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error actualizando carrera: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/carreras/{carrera_id}/primer-semestre", summary="Obtener créditos del primer semestre")
async def obtener_primer_semestre(
    carrera_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            resultado = await academico_service.obtener_primer_semestre(conn, carrera_id)
            return {"data": resultado}
    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error obteniendo primer semestre: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/materias", summary="Listar materias")
async def listar_materias(
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    # RQ-09: default/max generosos (>= catálogo completo de una institución
    # de este tamaño) porque coordinador/director y los selectores de
    # "materia" en los formularios de secciones dependen hoy de recibir el
    # catálogo completo en una sola respuesta (no hay UI de paginación en el
    # frontend todavía para este listado).
    pagination: PaginationParams = Depends(pagination_params(default_limit=200, max_limit=500)),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            materias, total = await academico_service.listar_materias(
                conn, pagination, carrera_id=carrera_id, semestre=semestre
            )
            return {"data": paginated_payload("materias", materias, pagination, total)}
    except Exception as e:
        logger.error(f"Error listando materias: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/carreras/{carrera_id}/malla", summary="Obtener malla curricular de una carrera")
async def obtener_malla_curricular(
    carrera_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            resultado = await academico_service.obtener_malla_curricular(conn, carrera_id)
            return {"data": resultado}
    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error obteniendo malla curricular: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/secciones", summary="Listar secciones")
async def listar_secciones(
    periodo_id: Optional[int] = None,
    materia_id: Optional[int] = None,
    docente_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    # RQ-09: es el catálogo con mayor volumen del sistema (todas las
    # secciones de todos los períodos). Default/max altos a propósito:
    # varios flujos críticos (inscripción/reinscripción de estudiantes,
    # planificación de horarios) hoy dependen de recibir el resultado
    # completo en una sola respuesta; bajar el default rompería esos flujos
    # sin que el frontend tenga todavía una UI de paginación para compensar.
    pagination: PaginationParams = Depends(pagination_params(default_limit=1000, max_limit=2000)),
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin', 'profesor', 'administrativo', 'tesorero', 'estudiante']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            secciones, total = await academico_service.listar_secciones(
                conn, pagination, periodo_id=periodo_id, materia_id=materia_id,
                docente_id=docente_id, carrera_id=carrera_id,
            )
            return {"data": paginated_payload("secciones", secciones, pagination, total)}
    except Exception as e:
        logger.error(f"Error listando secciones: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/periodos", summary="Listar períodos lectivos")
async def listar_periodos(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            periodos = await academico_service.listar_periodos(conn)
            return {"data": {"periodos": periodos}}
    except Exception as e:
        logger.error(f"Error listando periodos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/estudiantes", summary="Listar estudiantes")
async def listar_estudiantes(
    q: Optional[str] = None,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    es_becado: Optional[bool] = None,
    pagination: PaginationParams = Depends(pagination_params(default_limit=100, max_limit=200)),
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            estudiantes, total = await academico_service.listar_estudiantes(
                conn, pagination, q=q, carrera_id=carrera_id, semestre=semestre, es_becado=es_becado,
            )
            return {"data": paginated_payload("estudiantes", estudiantes, pagination, total)}
    except Exception as e:
        logger.error(f"Error listando estudiantes: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/profesores", summary="Listar profesores")
async def listar_profesores(
    # RQ-09: default/max por encima de la planta docente actual — los
    # selectores de "profesor" en los formularios de secciones y las
    # páginas de gestión de profesores esperan el listado completo.
    pagination: PaginationParams = Depends(pagination_params(default_limit=100, max_limit=200)),
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            profesores, total = await academico_service.listar_profesores(conn, pagination)
            return {"data": paginated_payload("profesores", profesores, pagination, total)}
    except Exception as e:
        logger.error(f"Error listando profesores: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/secciones/{seccion_id}/estudiantes", summary="Listar estudiantes de una sección")
async def listar_estudiantes_seccion(
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            resultado = await academico_service.listar_estudiantes_seccion(conn, seccion_id)
            return {"data": resultado}
    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error listando estudiantes de sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/profesores/{profesor_id}/rendimiento", summary="Obtener rendimiento de un profesor")
async def obtener_rendimiento_profesor(
    profesor_id: int,
    periodo_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            resultado = await academico_service.obtener_rendimiento_profesor(conn, profesor_id, periodo_id)
            return {"data": resultado}
    except ServiceError as e:
        _raise_from_service_error(e)
    except Exception as e:
        logger.error(f"Error obteniendo rendimiento del profesor: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)


@router.get("/horarios", summary="Obtener horarios de todas las secciones")
async def obtener_horarios(
    periodo_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin', 'administrativo', 'profesor']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            secciones = await academico_service.obtener_horarios(conn, periodo_id=periodo_id, carrera_id=carrera_id)
            return {"data": {"secciones": secciones}}
    except Exception as e:
        logger.error(f"Error obteniendo horarios: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=GENERIC_ERROR_DETAIL)
