"""
Router de Estudiantes
Gestión de pagos y estado financiero
REFERENCIA DJANGO: views.py - registrar_pago_alumno (líneas 199-245)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List
from datetime import datetime
from decimal import Decimal
import logging

from ..auth.dependencies import require_roles
from ..database import get_db
from ..services.calculos_financieros import calcular_deuda_total

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/estudiantes",
    tags=["Estudiantes"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
        404: {"description": "Estudiante no encontrado"}
    }
)


# ================================================================
# SCHEMAS
# ================================================================

class PagoRequest(BaseModel):
    """Schema para registrar pago"""
    metodo_pago: str = Field(default="efectivo", description="Método de pago")
    comprobante: str = Field(default="", description="Número de comprobante")
    
    class Config:
        json_schema_extra = {
            "example": {
                "metodo_pago": "transferencia",
                "comprobante": "TRX-2024-001"
            }
        }


class PagoResponse(BaseModel):
    """Schema de respuesta para pago"""
    message: str
    pagos_registrados: int
    monto_total: float
    inscripciones_pagadas: List[Dict[str, Any]]


# ================================================================
# ENDPOINTS DE PAGOS
# ================================================================

@router.post(
    "/{estudiante_id}/registrar-pago",
    summary="Registrar pago de estudiante",
    description="""
    Registra el pago de TODAS las inscripciones pendientes de un estudiante.
    
    **Proceso:**
    1. Busca todas las inscripciones sin pagar del estudiante
    2. Calcula el costo de cada una (aplicando becas si corresponde)
    3. Crea un registro de pago para cada inscripción
    4. Asocia el pago a la inscripción (limpiando la deuda)
    
    **Roles:** tesorero, director
    
    **Cálculo de costos:**
    - costo = créditos × precio_crédito
    - Si tiene beca: aplica descuento porcentaje_beca%
    """
)
async def registrar_pago(
    estudiante_id: int,
    pago_data: PagoRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director']))
) -> Dict[str, Any]:
    """
    Registra el pago de un estudiante
    
    REFERENCIA DJANGO: views.py - registrar_pago_alumno (líneas 199-245)
    """
    logger.info(f"💰 Registrando pago para estudiante {estudiante_id} por {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # 1. Verificar que el estudiante existe
            cur.execute(
                """
                SELECT id, username, first_name, last_name, rol, carrera_id, 
                       es_becado, porcentaje_beca
                FROM public.usuarios 
                WHERE id = %s AND rol = 'estudiante'
                """,
                (estudiante_id,)
            )
            
            estudiante = cur.fetchone()
            
            if not estudiante:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Estudiante no encontrado"
                )
            
            est_dict = dict(estudiante)
            
            # 2. Obtener inscripciones pendientes
            cur.execute(
                """
                SELECT i.id, i.seccion_id, s.materia_id
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE i.estudiante_id = %s AND i.pago_id IS NULL
                """,
                (estudiante_id,)
            )
            
            inscripciones_pendientes = cur.fetchall()
            
            if not inscripciones_pendientes:
                return {
                    "message": "El estudiante no tiene deudas pendientes",
                    "pagos_registrados": 0,
                    "monto_total": 0.0,
                    "inscripciones_pagadas": []
                }
            
            # 3. Obtener precio por crédito de la carrera
            precio_credito = Decimal('50.00')
            if est_dict.get('carrera_id'):
                cur.execute(
                    "SELECT precio_credito FROM public.carreras WHERE id = %s",
                    (est_dict['carrera_id'],)
                )
                result = cur.fetchone()
                if result and result.get('precio_credito'):
                    precio_credito = Decimal(str(result['precio_credito']))
            
            # 4. Procesar cada inscripción pendiente
            pagos_creados = 0
            monto_total = Decimal('0.00')
            inscripciones_pagadas = []
            
            for insc in inscripciones_pendientes:
                insc_dict = dict(insc)
                
                try:
                    # Obtener créditos de la materia
                    cur.execute(
                        "SELECT creditos FROM public.materias WHERE id = %s",
                        (insc_dict['materia_id'],)
                    )
                    
                    materia = cur.fetchone()
                    if not materia:
                        logger.warning(f"⚠️ Materia no encontrada para inscripción {insc_dict['id']}")
                        continue
                    
                    creditos = Decimal(str(materia['creditos']))
                    costo = creditos * precio_credito
                    
                    # Aplicar descuento por beca
                    if est_dict.get('es_becado') and est_dict.get('porcentaje_beca', 0) > 0:
                        porcentaje_beca = Decimal(str(est_dict['porcentaje_beca']))
                        descuento = costo * (porcentaje_beca / Decimal('100'))
                        costo -= descuento
                        logger.info(f"💰 Beca aplicada: {porcentaje_beca}% = ${descuento:.2f}")
                    
                    # Crear el pago
                    cur.execute(
                        """
                        INSERT INTO public.pagos (
                            inscripcion_id, monto, metodo_pago, fecha_pago, 
                            comprobante, procesado_por_id
                        ) VALUES (%s, %s, %s, NOW(), %s, %s)
                        RETURNING id
                        """,
                        (
                            insc_dict['id'],
                            costo,
                            pago_data.metodo_pago,
                            pago_data.comprobante or f"PAGO-{datetime.now().timestamp()}",
                            current_user['id']
                        )
                    )
                    
                    pago = cur.fetchone()
                    pago_id = pago['id']
                    
                    # Actualizar la inscripción con el pago_id
                    cur.execute(
                        "UPDATE public.inscripciones SET pago_id = %s WHERE id = %s",
                        (pago_id, insc_dict['id'])
                    )
                    
                    # Guardar info para respuesta
                    inscripciones_pagadas.append({
                        "inscripcion_id": insc_dict['id'],
                        "pago_id": pago_id,
                        "monto": float(costo)
                    })
                    
                    monto_total += costo
                    pagos_creados += 1
                    
                    logger.info(f"✅ Pago ${costo:.2f} registrado para inscripción {insc_dict['id']}")
                    
                except Exception as e:
                    logger.error(f"❌ Error procesando inscripción {insc_dict['id']}: {e}")
                    continue
            
            conn.commit()
            cur.close()
            
            # Mensaje de éxito
            nombre_estudiante = f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip() or est_dict['username']
            
            respuesta = {
                "message": f"Pago registrado exitosamente para {nombre_estudiante}. {pagos_creados} inscripciones procesadas.",
                "pagos_registrados": pagos_creados,
                "monto_total": float(monto_total.quantize(Decimal('0.01'))),
                "inscripciones_pagadas": inscripciones_pagadas,
                "estudiante": {
                    "id": est_dict['id'],
                    "nombre": nombre_estudiante,
                    "username": est_dict['username']
                },
                "procesado_por": current_user['username'],
                "fecha_procesamiento": datetime.now().isoformat()
            }
            
            logger.info(f"✅ Pago completado: ${float(monto_total):.2f} para {pagos_creados} inscripciones")
            
            return respuesta
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error registrando pago: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registrando pago: {str(e)}"
        )


# ================================================================
# ENDPOINTS DE CONSULTA
# ================================================================

@router.get(
    "/{estudiante_id}",
    summary="Detalle de estudiante",
    description="""
    Retorna el detalle completo de un estudiante con sus inscripciones.
    
    **Permisos:**
    - Director, Coordinador, Tesorero: Cualquier estudiante
    - Estudiante: Solo su propio perfil
    """
)
async def detalle_estudiante(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'coordinador', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    """
    Obtiene el detalle completo de un estudiante
    
    REFERENCIA DJANGO: views.py - detalle_estudiante (líneas 461-526)
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Obtener datos del estudiante
            cur.execute(
                """
                SELECT 
                    u.id, u.username, u.email, u.dni, u.first_name, u.last_name,
                    u.rol, u.carrera_id, u.es_becado, u.porcentaje_beca,
                    u.convenio_activo, u.fecha_limite_convenio,
                    c.nombre as carrera_nombre, c.codigo as carrera_codigo
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE u.id = %s AND u.rol = 'estudiante'
                """,
                (estudiante_id,)
            )
            
            estudiante = cur.fetchone()
            
            if not estudiante:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Estudiante no encontrado"
                )
            
            est_dict = dict(estudiante)
            
            # Obtener inscripciones
            cur.execute(
                """
                SELECT 
                    i.id, i.nota_final, i.estado, i.fecha_inscripcion,
                    m.nombre as materia_nombre, m.codigo as materia_codigo,
                    s.codigo_seccion, p.nombre as periodo_nombre,
                    CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.pagos pg ON i.pago_id = pg.id
                WHERE i.estudiante_id = %s
                ORDER BY p.codigo DESC
                """,
                (estudiante_id,)
            )
            
            inscripciones = []
            for row in cur.fetchall():
                row_dict = dict(row)
                inscripciones.append({
                    'id': row_dict['id'],
                    'materia_nombre': row_dict['materia_nombre'],
                    'materia_codigo': row_dict['materia_codigo'],
                    'seccion': row_dict['codigo_seccion'],
                    'periodo': row_dict['periodo_nombre'],
                    'nota_final': float(row_dict['nota_final']) if row_dict['nota_final'] else None,
                    'estado': row_dict['estado'],
                    'pagado': row_dict['pagado']
                })
            
            # Calcular deuda
            cur.execute(
                """
                SELECT i.*, s.id as seccion_id
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE i.estudiante_id = %s AND i.pago_id IS NULL
                """,
                (estudiante_id,)
            )
            
            inscripciones_pendientes = [dict(row) for row in cur.fetchall()]
            deuda_total = calcular_deuda_total(est_dict, inscripciones_pendientes, conn)
            
            cur.close()
            
            return {
                'id': est_dict['id'],
                'username': est_dict['username'],
                'nombre_completo': f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip() or est_dict['username'],
                'email': est_dict.get('email'),
                'dni': est_dict.get('dni'),
                'rol': est_dict['rol'],
                'carrera_detalle': {
                    'id': est_dict['carrera_id'],
                    'nombre': est_dict['carrera_nombre'],
                    'codigo': est_dict['carrera_codigo']
                } if est_dict.get('carrera_id') else None,
                'es_becado': est_dict.get('es_becado', False),
                'porcentaje_beca': est_dict.get('porcentaje_beca', 0),
                'convenio_activo': est_dict.get('convenio_activo', False),
                'fecha_limite_convenio': (
                    est_dict.get('fecha_limite_convenio').isoformat() 
                    if hasattr(est_dict.get('fecha_limite_convenio'), 'isoformat') 
                    else None
                ),
                'deuda_total': str(deuda_total),
                'inscripciones': inscripciones
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo detalle: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalle: {str(e)}"
        )


@router.get(
    "/{estudiante_id}/estado-cuenta",
    summary="Estado de cuenta simplificado",
    description="Retorna el estado financiero actual del estudiante"
)
async def estado_cuenta(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'coordinador']))
) -> Dict[str, Any]:
    """
    Obtiene el estado de cuenta de un estudiante
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Obtener estudiante
            cur.execute(
                "SELECT * FROM public.usuarios WHERE id = %s AND rol = 'estudiante'",
                (estudiante_id,)
            )
            
            estudiante = cur.fetchone()
            
            if not estudiante:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Estudiante no encontrado"
                )
            
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
            
            # Obtener inscripciones
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
            
            # Calcular métricas
            from ..services.calculos_financieros import calcular_en_mora, calcular_deuda_vencida
            
            en_mora = calcular_en_mora(
                est_dict,
                inscripciones,
                dict(periodo_actual) if periodo_actual else None,
                conn
            )
            
            deuda_total = calcular_deuda_total(est_dict, inscripciones, conn)
            deuda_vencida = calcular_deuda_vencida(
                est_dict,
                inscripciones,
                dict(periodo_actual) if periodo_actual else None,
                conn
            )
            
            cur.close()
            
            return {
                "estudiante_id": estudiante_id,
                "username": est_dict['username'],
                "nombre": f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip(),
                "en_mora": en_mora,
                "deuda_total": float(deuda_total),
                "deuda_vencida": float(deuda_vencida),
                "convenio_activo": est_dict.get('convenio_activo', False),
                "es_becado": est_dict.get('es_becado', False),
                "porcentaje_beca": est_dict.get('porcentaje_beca', 0),
                "inscripciones_pendientes": len([i for i in inscripciones if not i.get('pago_id')]),
                "inscripciones_pagadas": len([i for i in inscripciones if i.get('pago_id')])
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo estado de cuenta: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estado: {str(e)}"
        )
