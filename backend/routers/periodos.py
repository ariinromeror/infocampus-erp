"""
Router de Periodos Lectivos
Gestión de ciclos académicos
REFERENCIA DJANGO: views.py - cerrar_ciclo_lectivo (líneas 529-602)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from decimal import Decimal
import logging

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/periodos",
    tags=["Periodos Lectivos"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido - Solo Director"},
        400: {"description": "Error de validación"}
    }
)


@router.post(
    "/cerrar-ciclo",
    summary="Cerrar ciclo lectivo",
    description="""
    Cierra el período lectivo que está actualmente activo.
    
    **Proceso:**
    1. Busca el período con activo=True
    2. Verifica que TODAS las inscripciones tengan nota
    3. Marca cada inscripción como 'aprobado' o 'reprobado' según nota >= 7.0
    4. Desactiva el período (activo=False)
    
    **Validaciones:**
    - Solo el Director puede ejecutar esta operación
    - No puede cerrar si quedan inscripciones sin nota
    
    **Resultado:**
    - Aprobados: nota >= 7.0
    - Reprobados: nota < 7.0
    """
)
async def cerrar_ciclo_lectivo(
    current_user: Dict[str, Any] = Depends(require_roles(['director']))
) -> Dict[str, Any]:
    """
    Cierra el ciclo lectivo activo
    
    REFERENCIA DJANGO: views.py - cerrar_ciclo_lectivo (líneas 529-602)
    """
    logger.info(f"🔄 Cierre de ciclo solicitado por Director: {current_user['cedula']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # 1. BUSCAR PERÍODO ACTIVO
            cur.execute(
                """
                SELECT * FROM public.periodos_lectivos 
                WHERE activo = true 
                ORDER BY fecha_inicio DESC 
                LIMIT 1
                """
            )
            
            periodo_activo = cur.fetchone()
            
            if not periodo_activo:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No hay un período activo para cerrar"
                )
            
            periodo_dict = dict(periodo_activo)
            
            logger.info(f"📅 Período a cerrar: {periodo_dict['nombre']} ({periodo_dict['codigo']})")
            
            # 2. VERIFICAR QUE TODAS LAS INSCRIPCIONES TENGAN NOTA
            cur.execute(
                """
                SELECT COUNT(*) as total
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE s.periodo_id = %s
                AND i.nota_final IS NULL
                AND i.estado = 'inscrito'
                """,
                (periodo_dict['id'],)
            )
            
            result = cur.fetchone()
            cantidad_sin_nota = result['total']
            
            if cantidad_sin_nota > 0:
                logger.warning(f"⚠️ No se puede cerrar ciclo: {cantidad_sin_nota} inscripciones sin nota")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": f"No se puede cerrar el ciclo. Quedan {cantidad_sin_nota} inscripciones sin nota.",
                        "inscripciones_pendientes": cantidad_sin_nota
                    }
                )
            
            # 3. OBTENER TODAS LAS INSCRIPCIONES DEL PERÍODO
            cur.execute(
                """
                SELECT i.id, i.nota_final, i.estado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE s.periodo_id = %s
                AND i.estado = 'inscrito'
                """,
                (periodo_dict['id'],)
            )
            
            inscripciones = cur.fetchall()
            
            # 4. PROCESAR CADA INSCRIPCIÓN
            NOTA_APROBACION = Decimal('7.0')
            aprobados = 0
            reprobados = 0
            
            for insc in inscripciones:
                insc_dict = dict(insc)
                
                if insc_dict['nota_final'] is not None:
                    nota = Decimal(str(insc_dict['nota_final']))
                    
                    if nota >= NOTA_APROBACION:
                        nuevo_estado = 'aprobado'
                        aprobados += 1
                    else:
                        nuevo_estado = 'reprobado'
                        reprobados += 1
                    
                    # Actualizar estado
                    cur.execute(
                        """
                        UPDATE public.inscripciones 
                        SET estado = %s 
                        WHERE id = %s
                        """,
                        (nuevo_estado, insc_dict['id'])
                    )
                    
                    logger.debug(f"✓ Inscripción {insc_dict['id']}: {nuevo_estado} (nota: {nota})")
            
            # 5. DESACTIVAR EL PERÍODO
            cur.execute(
                """
                UPDATE public.periodos_lectivos 
                SET activo = false 
                WHERE id = %s
                """,
                (periodo_dict['id'],)
            )
            
            conn.commit()
            cur.close()
            
            total_procesados = aprobados + reprobados
            
            respuesta = {
                "message": f"Ciclo '{periodo_dict['nombre']}' cerrado exitosamente.",
                "periodo_cerrado": {
                    "id": periodo_dict['id'],
                    "codigo": periodo_dict['codigo'],
                    "nombre": periodo_dict['nombre']
                },
                "estadisticas": {
                    "aprobados": aprobados,
                    "reprobados": reprobados,
                    "total_procesados": total_procesados,
                    "tasa_aprobacion": round((aprobados / total_procesados * 100), 2) if total_procesados > 0 else 0
                },
                "cerrado_por": current_user['cedula'],
                "fecha_cierre": __import__('datetime').datetime.now().isoformat()
            }
            
            logger.info(
                f"✅ Ciclo cerrado: {aprobados} aprobados, {reprobados} reprobados, "
                f"{total_procesados} total"
            )
            
            return respuesta
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error cerrando ciclo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cerrando ciclo: {str(e)}"
        )


@router.get(
    "/activo",
    summary="Obtener período activo",
    description="Retorna el período lectivo actualmente activo"
)
async def obtener_periodo_activo(
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'coordinador', 'administrativo']))
) -> Dict[str, Any]:
    """
    Obtiene el período lectivo activo
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            cur.execute(
                """
                SELECT * FROM public.periodos_lectivos 
                WHERE activo = true 
                ORDER BY fecha_inicio DESC 
                LIMIT 1
                """
            )
            
            periodo = cur.fetchone()
            cur.close()
            
            if not periodo:
                return {
                    "activo": False,
                    "message": "No hay período activo"
                }
            
            periodo_dict = dict(periodo)
            
            return {
                "activo": True,
                "periodo": {
                    "id": periodo_dict['id'],
                    "codigo": periodo_dict['codigo'],
                    "nombre": periodo_dict['nombre'],
                    "fecha_inicio": periodo_dict['fecha_inicio'].isoformat() if periodo_dict['fecha_inicio'] else None,
                    "fecha_fin": periodo_dict['fecha_fin'].isoformat() if periodo_dict['fecha_fin'] else None
                }
            }
            
    except Exception as e:
        logger.error(f"❌ Error obteniendo período activo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo período: {str(e)}"
        )


@router.get(
    "/{periodo_id}/estadisticas",
    summary="Estadísticas del período",
    description="Retorna estadísticas del período especificado"
)
async def estadisticas_periodo(
    periodo_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'coordinador', 'administrativo']))
) -> Dict[str, Any]:
    """
    Obtiene estadísticas de un período
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Verificar que existe el período
            cur.execute(
                "SELECT * FROM public.periodos_lectivos WHERE id = %s",
                (periodo_id,)
            )
            
            periodo = cur.fetchone()
            
            if not periodo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Período no encontrado"
                )
            
            periodo_dict = dict(periodo)
            
            # Estadísticas de inscripciones
            cur.execute(
                """
                SELECT 
                    COUNT(*) as total_inscripciones,
                    COUNT(CASE WHEN estado = 'aprobado' THEN 1 END) as aprobados,
                    COUNT(CASE WHEN estado = 'reprobado' THEN 1 END) as reprobados,
                    COUNT(CASE WHEN estado = 'inscrito' THEN 1 END) as inscritos,
                    AVG(nota_final) as promedio_general
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE s.periodo_id = %s
                """,
                (periodo_id,)
            )
            
            stats = cur.fetchone()
            
            # Estudiantes únicos
            cur.execute(
                """
                SELECT COUNT(DISTINCT i.estudiante_id) as total_estudiantes
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE s.periodo_id = %s
                """,
                (periodo_id,)
            )
            
            estudiantes = cur.fetchone()
            
            # Secciones
            cur.execute(
                """
                SELECT COUNT(*) as total_secciones
                FROM public.secciones
                WHERE periodo_id = %s
                """,
                (periodo_id,)
            )
            
            secciones = cur.fetchone()
            
            cur.close()
            
            total_insc = stats['total_inscripciones'] or 0
            aprobados = stats['aprobados'] or 0
            
            return {
                "periodo": {
                    "id": periodo_dict['id'],
                    "codigo": periodo_dict['codigo'],
                    "nombre": periodo_dict['nombre'],
                    "activo": periodo_dict['activo']
                },
                "estadisticas": {
                    "total_estudiantes": estudiantes['total_estudiantes'] or 0,
                    "total_secciones": secciones['total_secciones'] or 0,
                    "total_inscripciones": total_insc,
                    "aprobados": aprobados,
                    "reprobados": stats['reprobados'] or 0,
                    "inscritos": stats['inscritos'] or 0,
                    "promedio_general": float(stats['promedio_general'] or 0),
                    "tasa_aprobacion": round((aprobados / total_insc * 100), 2) if total_insc > 0 else 0
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )
