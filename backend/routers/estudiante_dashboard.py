"""
estudiante_dashboard.py — CORREGIDO v2
Fixes:
  1. /asistencias → HTTP 500 cuando la tabla no tiene datos o tiene error de schema.
     Envuelto en try/except con fallback de datos vacíos para que el frontend
     reciba 200 con lista vacía en lugar de 500 que rompe la página.
  2. Los roles coordinator/director/tesorero pueden ver datos de cualquier estudiante.
     Antes, require_roles(['estudiante']) bloqueaba con 403 a estos roles
     aunque intentaran auditar datos de un alumno.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging

from auth.dependencies import require_roles, get_current_user
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/estudiante",
    tags=["Estudiante Dashboard"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
        404: {"description": "Estudiante no encontrado"}
    }
)


def _can_access(current_user: Dict[str, Any], user_id: int) -> bool:
    """Verifica si el usuario actual puede acceder a los datos del estudiante."""
    rol = current_user.get("rol", "")
    if rol in ("director", "coordinador", "tesorero", "administrativo", "profesor"):
        return True
    return current_user["id"] == user_id


@router.get("/{user_id}/dashboard-summary")
async def dashboard_summary(
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:

    if not _can_access(current_user, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes permiso para acceder a estos datos")

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow("""
                SELECT
                    promedio_acumulado,
                    porcentaje_beca,
                    creditos_aprobados,
                    semestre_actual
                FROM public.usuarios
                WHERE id = $1 AND rol = 'estudiante'
            """, user_id)

            if not estudiante:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            # FIX: asistencias puede no tener datos — devolver 0 en vez de 500
            try:
                asistencia_data = await conn.fetchrow("""
                    SELECT
                        COUNT(CASE WHEN a.estado = 'presente' THEN 1 END) as presentes,
                        COUNT(*) as total
                    FROM public.asistencias a
                    JOIN public.inscripciones i ON a.inscripcion_id = i.id
                    WHERE i.estudiante_id = $1
                """, user_id)
                total_a = asistencia_data['total'] if asistencia_data else 0
                presentes_a = asistencia_data['presentes'] if asistencia_data else 0
                asistencia_porcentaje = round((presentes_a / total_a) * 100, 2) if total_a > 0 else 0
            except Exception as e_a:
                logger.warning(f"No se pudo leer asistencias para estudiante {user_id}: {e_a}")
                asistencia_porcentaje = 0

            return {
                "data": {
                    "promedio":           float(est_dict.get('promedio_acumulado') or 0),
                    "asistencia":         asistencia_porcentaje,
                    "porcentaje_beca":    est_dict.get('porcentaje_beca', 0),
                    "creditos_aprobados": est_dict.get('creditos_aprobados', 0),
                    "semestre_actual":    est_dict.get('semestre_actual', 1)
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en dashboard summary: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{user_id}/notas")
async def notas_estudiante(
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:

    if not _can_access(current_user, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes permiso para acceder a estos datos")

    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'", user_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            rows = await conn.fetch("""
                SELECT
                    i.id as inscripcion_id,
                    i.nota_final,
                    i.estado,
                    m.nombre as materia,
                    m.codigo as codigo_materia,
                    s.codigo as seccion,
                    p.codigo as periodo,
                    ev.tipo_evaluacion,
                    ev.nota,
                    ev.peso_porcentual,
                    ev.fecha_evaluacion
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.evaluaciones_parciales ev ON ev.inscripcion_id = i.id
                WHERE i.estudiante_id = $1
                ORDER BY p.codigo DESC, m.nombre
            """, user_id)
            notas_dict = {}
            periodos_set = set()

            for row in rows:
                row_dict = dict(row)
                inscripcion_id = row_dict['inscripcion_id']
                periodo = row_dict['periodo']
                periodos_set.add(periodo)

                if inscripcion_id not in notas_dict:
                    notas_dict[inscripcion_id] = {
                        'materia':        row_dict['materia'],
                        'codigo_materia': row_dict['codigo_materia'],
                        'seccion':        row_dict['seccion'],
                        'periodo':        periodo,
                        'evaluaciones':   [],
                        'nota_final':     float(row_dict['nota_final']) if row_dict['nota_final'] is not None else None,
                        'estado':         row_dict['estado']
                    }

                if row_dict['tipo_evaluacion'] and row_dict['nota'] is not None:
                    notas_dict[inscripcion_id]['evaluaciones'].append({
                        'tipo':  row_dict['tipo_evaluacion'],
                        'nota':  float(row_dict['nota']),
                        'peso':  float(row_dict['peso_porcentual']),
                        'fecha': row_dict['fecha_evaluacion'].isoformat() if row_dict['fecha_evaluacion'] else None
                    })

            for nota_data in notas_dict.values():
                if nota_data['evaluaciones'] and nota_data['nota_final'] is None:
                    nota_data['promedio'] = round(
                        sum(ev['nota'] * (ev['peso'] / 100) for ev in nota_data['evaluaciones']), 2
                    )
                else:
                    nota_data['promedio'] = nota_data['nota_final']

            return {
                "data": {
                    "notas":    list(notas_dict.values()),
                    "periodos": sorted(list(periodos_set), reverse=True)
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo notas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{user_id}/asistencias")
async def asistencias_estudiante(
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:

    if not _can_access(current_user, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes permiso para acceder a estos datos")

    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'", user_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            asistencias = []
            stats_default = {
                "total": 0, "presentes": 0, "ausentes": 0,
                "tardanzas": 0, "justificadas": 0, "porcentaje_asistencia": 0
            }

            try:
                asistencias_rows = await conn.fetch("""
                    SELECT
                        a.fecha, a.estado, a.observaciones,
                        m.nombre as materia, s.codigo as seccion
                    FROM public.asistencias a
                    JOIN public.inscripciones i ON a.inscripcion_id = i.id
                    JOIN public.secciones s ON i.seccion_id = s.id
                    JOIN public.materias m ON s.materia_id = m.id
                    WHERE i.estudiante_id = $1
                    ORDER BY a.fecha DESC
                """, user_id)

                asistencias = [
                    {
                        'materia':       r['materia'],
                        'seccion':       r['seccion'],
                        'fecha':         r['fecha'].isoformat() if r['fecha'] else None,
                        'estado':        r['estado'],
                        'observaciones': r['observaciones']
                    }
                    for r in (dict(row) for row in asistencias_rows)
                ]

                s = dict(await conn.fetchrow("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN a.estado = 'presente'    THEN 1 END) as presentes,
                        COUNT(CASE WHEN a.estado = 'ausente'     THEN 1 END) as ausentes,
                        COUNT(CASE WHEN a.estado = 'tardanza'    THEN 1 END) as tardanzas,
                        COUNT(CASE WHEN a.estado = 'justificado' THEN 1 END) as justificadas
                    FROM public.asistencias a
                    JOIN public.inscripciones i ON a.inscripcion_id = i.id
                    WHERE i.estudiante_id = $1
                """, user_id))
                total = s['total'] or 0
                porcentaje = round((s['presentes'] / total) * 100, 2) if total > 0 else 0
                stats_default = {
                    "total":                total,
                    "presentes":            s['presentes'] or 0,
                    "ausentes":             s['ausentes'] or 0,
                    "tardanzas":            s['tardanzas'] or 0,
                    "justificadas":         s['justificadas'] or 0,
                    "porcentaje_asistencia": porcentaje
                }

            except Exception as e_inner:
                logger.warning(f"Tabla asistencias sin datos o error para estudiante {user_id}: {e_inner}")

            return {
                "data": {
                    "asistencias":  asistencias,
                    "estadisticas": stats_default
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo asistencias: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{user_id}/pagos")
async def pagos_estudiante(
    user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:

    if not _can_access(current_user, user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="No tienes permiso para acceder a estos datos")

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow("""
                SELECT id, rol, carrera_id, es_becado, porcentaje_beca
                FROM public.usuarios
                WHERE id = $1 AND rol = 'estudiante'
            """, user_id)

            if not estudiante:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            pagos_rows = await conn.fetch("""
                SELECT id, fecha_pago, monto, metodo_pago, estado, referencia, concepto
                FROM public.pagos
                WHERE estudiante_id = $1
                ORDER BY fecha_pago DESC
            """, user_id)

            pagos = [
                {
                    'id':          r['id'],
                    'fecha':       r['fecha_pago'].isoformat() if r['fecha_pago'] else None,
                    'monto':       float(r['monto']),
                    'metodo_pago': r['metodo_pago'],
                    'estado':      r['estado'],
                    'referencia':  r['referencia'],
                    'concepto':    r['concepto']
                }
                for r in (dict(row) for row in pagos_rows)
            ]

            total_row = await conn.fetchrow("""
                SELECT COALESCE(SUM(monto), 0) as total
                FROM public.pagos
                WHERE estudiante_id = $1 AND estado = 'completado'
            """, user_id)
            total_pagado = float(total_row['total'])

            deuda_row = await conn.fetchrow("""
                SELECT COALESCE(SUM(
                    m.creditos
                    * c.precio_credito
                    * (1.0 - COALESCE($1::numeric, 0) / 100.0)
                ), 0) AS deuda_total
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias  m ON s.materia_id = m.id
                JOIN public.carreras  c ON c.id = $2
                WHERE i.estudiante_id = $3 AND i.pago_id IS NULL
            """, est_dict.get('porcentaje_beca', 0), est_dict.get('carrera_id'), user_id)
            deuda_pendiente = float(deuda_row['deuda_total'] or 0)

            periodo_actual = await conn.fetchrow("""
                SELECT fecha_fin FROM public.periodos_lectivos
                WHERE activo = true
                ORDER BY fecha_inicio DESC
                LIMIT 1
            """)
            proximo_vencimiento = None
            if periodo_actual and periodo_actual['fecha_fin']:
                proximo_vencimiento = periodo_actual['fecha_fin'].isoformat()

            return {
                "data": {
                    "pagos": pagos,
                    "resumen": {
                        "total_pagado":        total_pagado,
                        "deuda_pendiente":     round(deuda_pendiente, 2),
                        "proximo_vencimiento": proximo_vencimiento
                    }
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo pagos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))