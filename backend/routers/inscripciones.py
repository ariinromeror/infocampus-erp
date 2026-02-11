"""
Router de Inscripciones
Gestión de notas y calificaciones
REFERENCIA DJANGO: views.py - gestion_notas_seccion (líneas 291-334)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import logging

from ..auth.dependencies import require_roles, get_current_user
from ..database import get_db
from ..services.calculos_financieros import calcular_en_mora, calcular_deuda_total

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


# ================================================================
# SCHEMAS
# ================================================================

class NotaRequest(BaseModel):
    """Schema para actualizar nota"""
    nota_final: float = Field(..., ge=0, le=10, description="Nota entre 0 y 10")
    
    class Config:
        json_schema_extra = {
            "example": {
                "nota_final": 8.5
            }
        }


class InscripcionResponse(BaseModel):
    """Schema de respuesta para inscripción"""
    id: int
    estudiante_id: int
    seccion_id: int
    nota_final: Optional[float]
    estado: str
    pagado: bool


# ================================================================
# ENDPOINTS DE NOTAS
# ================================================================

@router.put(
    "/{inscripcion_id}/nota",
    summary="Actualizar nota de inscripción",
    description="""
    Actualiza la nota final de una inscripción.
    
    **Reglas de negocio:**
    - Solo profesores (de su sección), coordinadores o directores pueden poner notas
    - Nota >= 7.0 = Estado 'aprobado'
    - Nota < 7.0 = Estado 'reprobado'
    - Se registra quién puso la nota y cuándo
    
    **Integración con lógica financiera:**
    Al actualizar la nota, se recalcula el estado de mora del estudiante.
    """
)
async def actualizar_nota(
    inscripcion_id: int,
    nota_data: NotaRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director']))
) -> Dict[str, Any]:
    """
    Actualiza la nota de una inscripción
    
    REFERENCIA DJANGO: views.py - gestion_notas_seccion (líneas 305-311)
    """
    logger.info(f"📝 Actualizando nota para inscripción {inscripcion_id} por {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # 1. Verificar que la inscripción existe
            cur.execute(
                """
                SELECT i.*, s.profesor_id, s.periodo_id
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE i.id = %s
                """,
                (inscripcion_id,)
            )
            
            inscripcion = cur.fetchone()
            
            if not inscripcion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inscripción no encontrada"
                )
            
            insc_dict = dict(inscripcion)
            
            # 2. Verificar permisos
            # Si es profesor, debe ser el profesor de la sección
            if current_user['rol'] == 'profesor':
                if insc_dict['profesor_id'] != current_user['id']:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tiene permiso para modificar notas de esta sección"
                    )
            
            # 3. Determinar estado según nota
            nota_decimal = Decimal(str(nota_data.nota_final))
            NOTA_APROBACION = Decimal('7.0')
            
            if nota_decimal >= NOTA_APROBACION:
                nuevo_estado = 'aprobado'
                mensaje_estado = "Aprobado"
            else:
                nuevo_estado = 'reprobado'
                mensaje_estado = "Reprobado"
            
            # 4. Actualizar la nota
            cur.execute(
                """
                UPDATE public.inscripciones 
                SET nota_final = %s,
                    estado = %s,
                    nota_puesta_por_id = %s,
                    fecha_nota_puesta = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (nota_data.nota_final, nuevo_estado, current_user['id'], inscripcion_id)
            )
            
            inscripcion_actualizada = cur.fetchone()
            
            # 5. OBTENER DATOS DEL ESTUDIANTE PARA RECALCULAR ESTADO
            estudiante_id = insc_dict['estudiante_id']
            
            # Inicializar variables de estado financiero
            en_mora = None
            deuda_total = None
            
            cur.execute(
                """
                SELECT id, username, rol, carrera_id, es_becado, porcentaje_beca,
                       convenio_activo, fecha_limite_convenio
                FROM public.usuarios 
                WHERE id = %s
                """,
                (estudiante_id,)
            )
            
            estudiante = cur.fetchone()
            
            if estudiante:
                est_dict = dict(estudiante)
                
                # Obtener período actual
                cur.execute(
                    """
                    SELECT * FROM public.periodos_lectivos 
                    WHERE activo = true 
                    ORDER BY fecha_inicio DESC 
                    LIMIT 1
                    """
                )
                periodo_actual = cur.fetchone()
                
                # Obtener inscripciones del estudiante
                cur.execute(
                    """
                    SELECT i.*, s.id as seccion_id
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    WHERE i.estudiante_id = %s
                    """,
                    (estudiante_id,)
                )
                
                inscripciones = [dict(row) for row in cur.fetchall()]
                
                # RECALCULAR ESTADO FINANCIERO
                en_mora = calcular_en_mora(
                    est_dict,
                    inscripciones,
                    dict(periodo_actual) if periodo_actual else None,
                    conn
                )
                
                deuda_total = calcular_deuda_total(est_dict, inscripciones, conn)
                
                logger.info(
                    f"✅ Nota actualizada. Estado financiero recalculado: "
                    f"en_mora={en_mora}, deuda=${deuda_total}"
                )
            
            conn.commit()
            cur.close()
            
            respuesta = {
                "message": f"Nota actualizada exitosamente. Estado: {mensaje_estado}",
                "inscripcion_id": inscripcion_id,
                "nota_final": nota_data.nota_final,
                "estado": nuevo_estado,
                "puesto_por": current_user['username'],
                "fecha_actualizacion": datetime.now().isoformat()
            }
            
            # Agregar info de mora si aplica
            if estudiante and en_mora is not None and deuda_total is not None:
                respuesta["estado_financiero_estudiante"] = {
                    "en_mora": en_mora,
                    "deuda_total": float(deuda_total) if deuda_total else 0.0
                }
            
            logger.info(f"✅ Nota {nota_data.nota_final} registrada para inscripción {inscripcion_id}")
            
            return respuesta
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error actualizando nota: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando nota: {str(e)}"
        )


@router.get(
    "/seccion/{seccion_id}/notas",
    summary="Obtener notas de una sección",
    description="""
    Retorna todas las inscripciones de una sección con sus notas.
    
    **Permisos:**
    - Profesor: Solo sus propias secciones
    - Coordinador/Director: Cualquier sección
    """
)
async def obtener_notas_seccion(
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director']))
) -> Dict[str, Any]:
    """
    Obtiene todas las notas de una sección
    
    REFERENCIA DJANGO: views.py - gestion_notas_seccion GET (líneas 314-330)
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Verificar que la sección existe y permisos
            cur.execute(
                "SELECT * FROM public.secciones WHERE id = %s",
                (seccion_id,)
            )
            
            seccion = cur.fetchone()
            
            if not seccion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Sección no encontrada"
                )
            
            # Si es profesor, verificar que sea su sección
            if current_user['rol'] == 'profesor' and seccion['profesor_id'] != current_user['id']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permiso para ver esta sección"
                )
            
            # Obtener datos de la materia
            cur.execute(
                """
                SELECT m.nombre as materia_nombre, m.codigo as materia_codigo
                FROM public.secciones s
                JOIN public.materias m ON s.materia_id = m.id
                WHERE s.id = %s
                """,
                (seccion_id,)
            )
            
            materia = cur.fetchone()
            
            # Obtener inscripciones con notas
            cur.execute(
                """
                SELECT 
                    i.id as inscripcion_id,
                    i.nota_final,
                    i.estado,
                    i.fecha_nota_puesta,
                    u.id as estudiante_id,
                    u.username as estudiante_carnet,
                    u.first_name || ' ' || u.last_name as estudiante_nombre,
                    CASE WHEN p.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                LEFT JOIN public.pagos p ON i.pago_id = p.id
                WHERE i.seccion_id = %s
                ORDER BY u.last_name, u.first_name
                """,
                (seccion_id,)
            )
            
            alumnos = []
            for row in cur.fetchall():
                row_dict = dict(row)
                alumnos.append({
                    "inscripcion_id": row_dict['inscripcion_id'],
                    "alumno_nombre": row_dict['estudiante_nombre'],
                    "alumno_carnet": row_dict['estudiante_carnet'],
                    "nota_actual": float(row_dict['nota_final']) if row_dict['nota_final'] else None,
                    "estado": row_dict['estado'],
                    "pagado": row_dict['pagado']
                })
            
            cur.close()
            
            return {
                "materia": materia['materia_nombre'] if materia else "N/A",
                "codigo": seccion['codigo_seccion'],
                "aula": seccion['aula'],
                "total_alumnos": len(alumnos),
                "alumnos": alumnos
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo notas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo notas: {str(e)}"
        )


# ================================================================
# ENDPOINTS DE CONSULTA
# ================================================================

@router.get(
    "/estudiante/mis-inscripciones",
    summary="Mis inscripciones (estudiante)",
    description="Retorna todas las inscripciones del estudiante autenticado"
)
async def mis_inscripciones(
    current_user: Dict[str, Any] = Depends(require_roles(['estudiante']))
) -> List[Dict[str, Any]]:
    """
    Obtiene las inscripciones del estudiante autenticado
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            cur.execute(
                """
                SELECT 
                    i.id,
                    i.nota_final,
                    i.estado,
                    i.fecha_inscripcion,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    s.codigo_seccion,
                    s.aula,
                    p.nombre as periodo_nombre,
                    CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.pagos pg ON i.pago_id = pg.id
                WHERE i.estudiante_id = %s
                ORDER BY p.codigo DESC, m.nombre
                """,
                (current_user['id'],)
            )
            
            inscripciones = []
            for row in cur.fetchall():
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
                    "fecha_inscripcion": row_dict['fecha_inscripcion'].isoformat() if row_dict['fecha_inscripcion'] else None
                })
            
            cur.close()
            
            return inscripciones
            
    except Exception as e:
        logger.error(f"❌ Error obteniendo inscripciones: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo inscripciones: {str(e)}"
        )


@router.get(
    "/{inscripcion_id}",
    summary="Detalle de inscripción",
    description="Retorna el detalle completo de una inscripción específica"
)
async def detalle_inscripcion(
    inscripcion_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Obtiene el detalle de una inscripción
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            cur.execute(
                """
                SELECT 
                    i.*,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    s.codigo_seccion,
                    p.nombre as periodo_nombre,
                    u.username as estudiante_username,
                    u.first_name || ' ' || u.last_name as estudiante_nombre
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                JOIN public.usuarios u ON i.estudiante_id = u.id
                WHERE i.id = %s
                """,
                (inscripcion_id,)
            )
            
            inscripcion = cur.fetchone()
            
            if not inscripcion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inscripción no encontrada"
                )
            
            insc_dict = dict(inscripcion)
            
            # Verificar permisos
            puede_ver = False
            
            if current_user['rol'] in ['director', 'coordinador']:
                puede_ver = True
            elif current_user['rol'] == 'profesor':
                # Verificar si es profesor de la sección
                cur.execute(
                    "SELECT profesor_id FROM public.secciones WHERE id = %s",
                    (insc_dict['seccion_id'],)
                )
                seccion = cur.fetchone()
                if seccion and seccion['profesor_id'] == current_user['id']:
                    puede_ver = True
            elif current_user['id'] == insc_dict['estudiante_id']:
                # Es su propia inscripción
                puede_ver = True
            
            if not puede_ver:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permiso para ver esta inscripción"
                )
            
            cur.close()
            
            return {
                "id": insc_dict['id'],
                "estudiante": {
                    "id": insc_dict['estudiante_id'],
                    "username": insc_dict['estudiante_username'],
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
        logger.error(f"❌ Error obteniendo detalle: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalle: {str(e)}"
        )
