from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import logging

from auth.dependencies import require_roles, get_current_user
from database import get_db
from services.calculos_financieros import calcular_en_mora, calcular_deuda_total

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/inscripciones",
    tags=["Inscripciones"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
        404: {"description": "Inscripción no encontrada"}
    }
)


class NotaRequest(BaseModel):
    nota_final: float = Field(..., ge=0, le=10)

    class Config:
        json_schema_extra = {"example": {"nota_final": 8.5}}


class InscripcionResponse(BaseModel):
    id: int
    estudiante_id: int
    seccion_id: int
    nota_final: Optional[float]
    estado: str
    pagado: bool
    pago_id: Optional[int] = None


@router.put("/{inscripcion_id}/nota", summary="Actualizar nota de inscripción")
async def actualizar_nota(
    inscripcion_id: int,
    nota_data: NotaRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Actualizando nota inscripción {inscripcion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            inscripcion = await conn.fetchrow(
                """
                SELECT i.*, s.docente_id, s.periodo_id
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE i.id = $1
                """,
                inscripcion_id,
            )

            if not inscripcion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada")

            insc_dict = dict(inscripcion)

            if current_user['rol'] == 'profesor':
                if insc_dict['docente_id'] != current_user['id']:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para modificar notas de esta sección")

            nota_decimal = Decimal(str(nota_data.nota_final))
            NOTA_APROBACION = Decimal('7.0')

            if nota_decimal >= NOTA_APROBACION:
                nuevo_estado = 'aprobado'
                mensaje_estado = "Aprobado"
            else:
                nuevo_estado = 'reprobado'
                mensaje_estado = "Reprobado"

            await conn.execute(
                """
                UPDATE public.inscripciones
                SET nota_final = $1, estado = $2
                WHERE id = $3
                """,
                nota_data.nota_final, nuevo_estado, inscripcion_id,
            )

            estudiante_id = insc_dict['estudiante_id']
            en_mora = None
            deuda_total = None

            estudiante = await conn.fetchrow(
                """
                SELECT id, cedula, rol, carrera_id, es_becado, porcentaje_beca,
                       convenio_activo, fecha_limite_convenio
                FROM public.usuarios
                WHERE id = $1
                """,
                estudiante_id,
            )

            if estudiante:
                est_dict = dict(estudiante)

                periodo_actual = await conn.fetchrow(
                    """
                    SELECT * FROM public.periodos_lectivos
                    WHERE activo = true
                    ORDER BY fecha_inicio DESC
                    LIMIT 1
                    """
                )

                inscripciones_rows = await conn.fetch(
                    """
                    SELECT i.*, s.id as seccion_id
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    WHERE i.estudiante_id = $1
                    """,
                    estudiante_id,
                )
                inscripciones = [dict(row) for row in inscripciones_rows]

                en_mora = await calcular_en_mora(est_dict, inscripciones, dict(periodo_actual) if periodo_actual else None, conn)
                deuda_total = await calcular_deuda_total(est_dict, inscripciones, conn)

            respuesta = {
                "message": f"Nota actualizada exitosamente. Estado: {mensaje_estado}",
                "inscripcion_id": inscripcion_id,
                "nota_final": nota_data.nota_final,
                "estado": nuevo_estado,
                "puesto_por": current_user['cedula'],
                "fecha": datetime.now().isoformat()
            }

            if en_mora is not None and deuda_total is not None:
                respuesta["estado_financiero"] = {
                    "en_mora": en_mora,
                    "deuda_total": float(deuda_total)
                }

            return respuesta

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando nota: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error actualizando nota: {str(e)}")


@router.get("/seccion/{seccion_id}/notas", summary="Obtener notas de una sección")
async def obtener_notas_seccion(
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin', 'administrativo']))
) -> Dict[str, Any]:

    try:
        async with get_db() as conn:
            seccion = await conn.fetchrow(
                """
                SELECT s.id, s.codigo, s.aula, s.docente_id, m.nombre as materia_nombre
                FROM public.secciones s
                JOIN public.materias m ON s.materia_id = m.id
                WHERE s.id = $1
                """,
                seccion_id,
            )

            if not seccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

            seccion_dict = dict(seccion)

            if current_user['rol'] == 'profesor':
                if seccion_dict['docente_id'] != current_user['id']:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para ver las notas de esta sección")

            rows = await conn.fetch(
                """
                SELECT
                    i.id as inscripcion_id,
                    i.nota_final,
                    i.estado,
                    u.id as estudiante_id,
                    u.cedula as estudiante_carnet,
                    u.first_name || ' ' || u.last_name as estudiante_nombre,
                    CASE WHEN p.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                LEFT JOIN public.pagos p ON i.pago_id = p.id
                WHERE i.seccion_id = $1
                ORDER BY u.last_name, u.first_name
                """,
                seccion_id,
            )

            alumnos = []
            for row in rows:
                row_dict = dict(row)
                alumnos.append({
                    "inscripcion_id": row_dict['inscripcion_id'],
                    "alumno_nombre": row_dict['estudiante_nombre'],
                    "alumno_carnet": row_dict['estudiante_carnet'],
                    "nota_actual": float(row_dict['nota_final']) if row_dict['nota_final'] else None,
                    "estado": row_dict['estado'],
                    "pagado": row_dict['pagado']
                })

            return {
                "materia": seccion_dict['materia_nombre'],
                "codigo": seccion_dict['codigo'],
                "aula": seccion_dict['aula'],
                "total_alumnos": len(alumnos),
                "alumnos": alumnos
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo notas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error obteniendo notas: {str(e)}")


@router.get("/estudiante/mis-inscripciones", summary="Mis inscripciones (estudiante)")
async def mis_inscripciones(
    current_user: Dict[str, Any] = Depends(require_roles(['estudiante']))
) -> List[Dict[str, Any]]:

    try:
        async with get_db() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    i.id, i.nota_final, i.estado, i.fecha_inscripcion, i.pago_id,
                    m.nombre as materia_nombre, m.codigo as materia_codigo, m.creditos,
                    s.codigo as codigo_seccion, s.aula,
                    p.nombre as periodo_nombre,
                    CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.pagos pg ON i.pago_id = pg.id
                WHERE i.estudiante_id = $1
                ORDER BY p.codigo DESC, m.nombre
                """,
                current_user['id'],
            )

            inscripciones = []
            for row in rows:
                row_dict = dict(row)
                inscripciones.append({
                    "id": row_dict['id'],
                    "materia": row_dict['materia_nombre'],
                    "codigo": row_dict['materia_codigo'],
                    "creditos": row_dict['creditos'],
                    "seccion": row_dict['codigo_seccion'],
                    "aula": row_dict['aula'],
                    "periodo": row_dict['periodo_nombre'],
                    "nota_final": float(row_dict['nota_final']) if row_dict['nota_final'] else None,
                    "estado": row_dict['estado'],
                    "pagado": row_dict['pagado'],
                    "pago_id": row_dict['pago_id'],
                    "fecha_inscripcion": row_dict['fecha_inscripcion'].isoformat() if row_dict['fecha_inscripcion'] else None
                })

            return inscripciones

    except Exception as e:
        logger.error(f"Error obteniendo inscripciones: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error obteniendo inscripciones: {str(e)}")


@router.get("/{inscripcion_id}", summary="Detalle de inscripción")
async def detalle_inscripcion(
    inscripcion_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:

    try:
        async with get_db() as conn:
            inscripcion = await conn.fetchrow(
                """
                SELECT
                    i.*,
                    m.nombre as materia_nombre, m.codigo as materia_codigo, m.creditos,
                    s.codigo as codigo_seccion,
                    p.nombre as periodo_nombre,
                    u.cedula as estudiante_cedula,
                    u.first_name || ' ' || u.last_name as estudiante_nombre
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                JOIN public.usuarios u ON i.estudiante_id = u.id
                WHERE i.id = $1
                """,
                inscripcion_id,
            )

            if not inscripcion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada")

            insc_dict = dict(inscripcion)

            puede_ver = False

            if current_user['rol'] in ['director', 'coordinador']:
                puede_ver = True
            elif current_user['rol'] == 'profesor':
                seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", insc_dict['seccion_id'])
                if seccion and seccion['docente_id'] == current_user['id']:
                    puede_ver = True
            elif current_user['id'] == insc_dict['estudiante_id']:
                puede_ver = True

            if not puede_ver:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permiso para ver esta inscripción")

            return {
                "id": insc_dict['id'],
                "estudiante": {
                    "id": insc_dict['estudiante_id'],
                    "cedula": insc_dict['estudiante_cedula'],
                    "nombre": insc_dict['estudiante_nombre']
                },
                "materia": insc_dict['materia_nombre'],
                "codigo_materia": insc_dict['materia_codigo'],
                "creditos": insc_dict['creditos'],
                "seccion": insc_dict['codigo_seccion'],
                "periodo": insc_dict['periodo_nombre'],
                "nota_final": float(insc_dict['nota_final']) if insc_dict['nota_final'] else None,
                "estado": insc_dict['estado'],
                "fecha_inscripcion": insc_dict['fecha_inscripcion'].isoformat() if insc_dict['fecha_inscripcion'] else None
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo detalle: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error obteniendo detalle: {str(e)}")