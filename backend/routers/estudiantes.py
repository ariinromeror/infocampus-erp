"""
estudiantes.py — CORREGIDO v2
Fixes:
  1. estado_cuenta: reemplaza calcular_deuda_total() + calcular_en_mora() (N+1 en loop)
     por queries SQL directas. La función original abría 1 cursor adicional por cada
     inscripción pendiente → ~5-10 queries extras por request → timeout en Supabase free.
  2. detalle_estudiante: mismo fix para calcular_deuda_total.
  3. registrar_pago: sin cambios, ya usaba loop pero sobre pocas inscripciones (OK).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List
from datetime import datetime
from decimal import Decimal
import logging

from auth.dependencies import require_roles
from database import get_db

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


class PagoRequest(BaseModel):
    metodo_pago: str = Field(default="efectivo")
    comprobante: str = Field(default="")

    class Config:
        json_schema_extra = {"example": {"metodo_pago": "transferencia", "comprobante": "TRX-2024-001"}}


@router.post("/{estudiante_id}/registrar-pago", summary="Registrar pago de estudiante")
async def registrar_pago(
    estudiante_id: int,
    pago_data: PagoRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Registrando pago estudiante {estudiante_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow(
                "SELECT id, cedula, first_name, last_name, rol, carrera_id, es_becado, porcentaje_beca FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'",
                estudiante_id
            )

            if not estudiante:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            inscripciones_pendientes = await conn.fetch(
                "SELECT i.id, i.seccion_id, s.materia_id FROM public.inscripciones i JOIN public.secciones s ON i.seccion_id = s.id WHERE i.estudiante_id = $1 AND i.pago_id IS NULL",
                estudiante_id
            )

            if not inscripciones_pendientes:
                return {"message": "El estudiante no tiene deudas pendientes", "pagos_registrados": 0, "monto_total": 0.0, "inscripciones_pagadas": []}

            precio_credito = Decimal('50.00')
            if est_dict.get('carrera_id'):
                result = await conn.fetchrow("SELECT precio_credito FROM public.carreras WHERE id = $1", est_dict['carrera_id'])
                if result and result.get('precio_credito'):
                    precio_credito = Decimal(str(result['precio_credito']))

            pagos_creados = 0
            monto_total = Decimal('0.00')
            inscripciones_pagadas = []

            for insc in inscripciones_pendientes:
                insc_dict = dict(insc)
                try:
                    materia = await conn.fetchrow("SELECT creditos FROM public.materias WHERE id = $1", insc_dict['materia_id'])
                    if not materia:
                        continue

                    creditos = Decimal(str(materia['creditos']))
                    costo = creditos * precio_credito

                    if est_dict.get('es_becado') and est_dict.get('porcentaje_beca', 0) > 0:
                        porcentaje_beca = Decimal(str(est_dict['porcentaje_beca']))
                        costo -= costo * (porcentaje_beca / Decimal('100'))

                    pago = await conn.fetchrow(
                        """
                        INSERT INTO public.pagos (estudiante_id, monto, metodo_pago, fecha_pago, referencia, estado, periodo_id)
                        SELECT $1, $2, $3, NOW(), $4, 'completado',
                               (SELECT periodo_id FROM public.secciones WHERE id = $5)
                        RETURNING id
                        """,
                        estudiante_id, costo, pago_data.metodo_pago, pago_data.comprobante or f"PAGO-{datetime.now().timestamp()}", insc_dict['seccion_id']
                    )
                    pago_id = pago['id']

                    await conn.execute("UPDATE public.inscripciones SET pago_id = $1 WHERE id = $2", pago_id, insc_dict['id'])

                    inscripciones_pagadas.append({"inscripcion_id": insc_dict['id'], "pago_id": pago_id, "monto": float(costo)})
                    monto_total += costo
                    pagos_creados += 1

                except Exception as e_pago:
                    logger.error(f"Error procesando inscripción {insc_dict['id']}: {e_pago}")
                    continue

            return {
                "message": f"Pago registrado exitosamente. Total: ${float(monto_total):.2f}",
                "pagos_registrados": pagos_creados,
                "monto_total": float(monto_total),
                "inscripciones_pagadas": inscripciones_pagadas
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando pago: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.get("/{estudiante_id}", summary="Detalle de estudiante")
async def detalle_estudiante(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'admin', 'coordinador', 'administrativo']))
) -> Dict[str, Any]:

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow(
                """
                SELECT u.id, u.cedula, u.email, u.first_name, u.last_name,
                    u.rol, u.carrera_id, u.es_becado, u.porcentaje_beca,
                    u.convenio_activo, u.fecha_limite_convenio,
                    c.nombre as carrera_nombre, c.codigo as carrera_codigo
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE u.id = $1 AND u.rol = 'estudiante'
                """,
                estudiante_id
            )

            if not estudiante:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            inscripciones_rows = await conn.fetch(
                """
                SELECT i.id, i.nota_final, i.estado, i.fecha_inscripcion,
                    m.nombre as materia_nombre, m.codigo as materia_codigo,
                    s.codigo as codigo_seccion, p.nombre as periodo_nombre,
                    CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.pagos pg ON i.pago_id = pg.id
                WHERE i.estudiante_id = $1
                ORDER BY p.codigo DESC
                """,
                estudiante_id
            )

            inscripciones = []
            for row in inscripciones_rows:
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

            deuda_row = await conn.fetchrow("""
                SELECT COALESCE(SUM(
                    m.creditos * c.precio_credito
                    * (1.0 - COALESCE($1::numeric, 0) / 100.0)
                ), 0) AS deuda_total
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias  m ON s.materia_id = m.id
                JOIN public.carreras  c ON c.id = $2
                WHERE i.estudiante_id = $3 AND i.pago_id IS NULL
            """, est_dict.get('porcentaje_beca', 0), est_dict.get('carrera_id'), estudiante_id)
            deuda_total = float(deuda_row['deuda_total'] or 0)

            return {
                'id': est_dict['id'],
                'cedula': est_dict['cedula'],
                'nombre_completo': f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip(),
                'email': est_dict.get('email'),
                'rol': est_dict['rol'],
                'carrera_detalle': {
                    'id': est_dict['carrera_id'],
                    'nombre': est_dict['carrera_nombre'],
                    'codigo': est_dict['carrera_codigo']
                } if est_dict.get('carrera_id') else None,
                'es_becado': est_dict.get('es_becado', False),
                'porcentaje_beca': est_dict.get('porcentaje_beca', 0),
                'convenio_activo': est_dict.get('convenio_activo', False),
                'fecha_limite_convenio': est_dict.get('fecha_limite_convenio').isoformat() if hasattr(est_dict.get('fecha_limite_convenio'), 'isoformat') else None,
                'deuda_total': str(round(deuda_total, 2)),
                'inscripciones': inscripciones
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo detalle: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.get("/{estudiante_id}/estado-cuenta", summary="Estado de cuenta simplificado")
async def estado_cuenta(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'admin', 'coordinador', 'estudiante', 'administrativo']))
) -> Dict[str, Any]:

    if current_user['rol'] == 'estudiante' and current_user['id'] != estudiante_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver el estado de cuenta de otro estudiante."
        )

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow("SELECT * FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'", estudiante_id)

            if not estudiante:
                raise HTTPException(status_code=404, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            inscripciones_detalle = [dict(row) for row in await conn.fetch("""
                SELECT i.id, i.fecha_inscripcion, i.estado, i.nota_final,
                       s.codigo as seccion_codigo, m.nombre as materia_nombre,
                       m.creditos, p.nombre as periodo_nombre,
                       i.pago_id
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                WHERE i.estudiante_id = $1
                ORDER BY p.fecha_inicio DESC, i.fecha_inscripcion DESC
                LIMIT 50
            """, estudiante_id)]

            pagos = [dict(row) for row in await conn.fetch("""
                SELECT id, monto, fecha_pago, metodo_pago, estado, referencia, concepto
                FROM public.pagos
                WHERE estudiante_id = $1
                ORDER BY fecha_pago DESC
                LIMIT 50
            """, estudiante_id)]

            deuda_row = dict(await conn.fetchrow("""
                SELECT
                    COUNT(i.id) as pendientes,
                    COALESCE(SUM(
                        m.creditos * c.precio_credito
                        * (1.0 - COALESCE($1::numeric, 0) / 100.0)
                    ), 0) AS deuda_total
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias  m ON s.materia_id = m.id
                JOIN public.carreras  c ON c.id = $2
                WHERE i.estudiante_id = $3 AND i.pago_id IS NULL
            """, est_dict.get('porcentaje_beca', 0), est_dict.get('carrera_id'), estudiante_id))
            deuda_total = float(deuda_row['deuda_total'] or 0)
            inscripciones_pendientes_count = int(deuda_row['pendientes'] or 0)

            total_inscripciones = len(inscripciones_detalle)
            inscripciones_pagadas_count = total_inscripciones - inscripciones_pendientes_count

            # Mora simplificada: si tiene deuda > 0 y no tiene convenio vigente
            from datetime import date
            en_mora = False
            if deuda_total > 0:
                if est_dict.get('convenio_activo'):
                    fecha_lim = est_dict.get('fecha_limite_convenio')
                    if fecha_lim and hasattr(fecha_lim, 'date'):
                        en_mora = fecha_lim.date() < date.today()
                    else:
                        en_mora = False
                else:
                    en_mora = True

            return {
                "estudiante_id":          estudiante_id,
                "cedula":                 est_dict['cedula'],
                "nombre":                 f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip(),
                "en_mora":                en_mora,
                "deuda_total":            round(deuda_total, 2),
                "deuda_vencida":          round(deuda_total, 2),  # simplificado
                "convenio_activo":        est_dict.get('convenio_activo', False),
                "es_becado":              est_dict.get('es_becado', False),
                "porcentaje_beca":        est_dict.get('porcentaje_beca', 0),
                "inscripciones_pendientes": inscripciones_pendientes_count,
                "inscripciones_pagadas":  inscripciones_pagadas_count,
                "inscripciones":          inscripciones_detalle,
                "pagos":                  pagos
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en estado de cuenta: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{estudiante_id}/convenio", summary="Actualizar convenio de pago")
async def actualizar_convenio(
    estudiante_id: int,
    data: dict,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'", estudiante_id):
                raise HTTPException(status_code=404, detail="Estudiante no encontrado")

            await conn.execute("""
                UPDATE public.usuarios
                SET convenio_activo = $1, fecha_limite_convenio = $2
                WHERE id = $3
            """, data.get('convenio_activo', False), data.get('fecha_limite_convenio'), estudiante_id)

        return {"message": "Convenio actualizado correctamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando convenio: {e}")
        raise HTTPException(status_code=500, detail=str(e))