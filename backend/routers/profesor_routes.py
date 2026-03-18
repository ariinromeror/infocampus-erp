from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import json

from auth.dependencies import require_roles
from database import get_db

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


@router.get("/{profesor_id}/secciones", summary="Secciones del profesor")
async def mis_secciones(
    profesor_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Secciones profesor {profesor_id} por {current_user['cedula']}")

    if current_user['rol'] == 'profesor' and current_user['id'] != profesor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    try:
        async with get_db() as conn:
            rows = await conn.fetch("""
                SELECT
                    s.id, s.codigo, s.aula, s.horario, s.cupo_maximo, s.cupo_actual,
                    m.id as materia_id, m.nombre as materia_nombre,
                    m.codigo as materia_codigo, m.creditos,
                    p.id as periodo_id, p.nombre as periodo_nombre, p.codigo as periodo_codigo,
                    COUNT(i.id) as inscritos
                FROM public.secciones s
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.inscripciones i ON i.seccion_id = s.id
                WHERE s.docente_id = $1
                GROUP BY s.id, m.id, p.id
                ORDER BY p.codigo DESC, m.nombre
            """, profesor_id)

            secciones = []
            for row in rows:
                r = dict(row)
                horario_data = r.get('horario') or {}
                if isinstance(horario_data, str):
                    try:
                        horario_data = json.loads(horario_data)
                    except:
                        horario_data = {}

                dias = horario_data.get('dias', [])
                hora_inicio = horario_data.get('hora_inicio', '')
                hora_fin = horario_data.get('hora_fin', '')

                secciones.append({
                    "id": r['id'],
                    "codigo": r['codigo'],
                    "aula": r['aula'],
                    "materia_id": r['materia_id'],
                    "materia": r['materia_nombre'],
                    "materia_codigo": r['materia_codigo'],
                    "creditos": r['creditos'],
                    "periodo_id": r['periodo_id'],
                    "periodo": r['periodo_nombre'],
                    "cupo_maximo": r['cupo_maximo'],
                    "inscritos": r['inscritos'],
                    "dias": dias,
                    "hora_inicio": hora_inicio,
                    "hora_fin": hora_fin,
                    "horario": f"{', '.join(dias)} {hora_inicio}-{hora_fin}".strip()
                })

            return {"data": {"secciones": secciones}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error secciones profesor: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.get("/{profesor_id}/seccion/{seccion_id}/alumnos", summary="Alumnos de una sección")
async def alumnos_seccion(
    profesor_id: int,
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Alumnos sección {seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", seccion_id)

            if not seccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

            if current_user['rol'] == 'profesor' and seccion['docente_id'] != current_user['id']:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

            rows = await conn.fetch("""
                SELECT
                    u.id, u.first_name, u.last_name, u.cedula,
                    i.id as inscripcion_id, i.nota_final, i.estado,
                    COUNT(a.id) as total_asistencias,
                    COUNT(CASE WHEN a.estado = 'presente' THEN 1 END) as presentes
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                LEFT JOIN public.asistencias a ON a.inscripcion_id = i.id
                WHERE i.seccion_id = $1
                GROUP BY u.id, i.id
                ORDER BY u.last_name, u.first_name
            """, seccion_id)

            alumnos = []
            for row in rows:
                r = dict(row)
                total = r['total_asistencias'] or 0
                presentes = r['presentes'] or 0
                alumnos.append({
                    "id": r['id'],
                    "nombre": f"{r['first_name']} {r['last_name']}",
                    "cedula": r['cedula'],
                    "inscripcion_id": r['inscripcion_id'],
                    "nota_final": float(r['nota_final']) if r['nota_final'] else None,
                    "estado": r['estado'],
                    "total_asistencias": total,
                    "porcentaje_asistencia": round((presentes / total * 100), 1) if total > 0 else 0
                })

            return {"data": {"alumnos": alumnos}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error alumnos sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.post("/asistencia", summary="Registrar asistencia")
async def registrar_asistencia(
    data: AsistenciaRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor']))
) -> Dict[str, Any]:

    logger.info(f"Registrando asistencia sección {data.seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", data.seccion_id)

            if not seccion or seccion['docente_id'] != current_user['id']:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso sobre esta sección")

            fecha_date = datetime.strptime(data.fecha, "%Y-%m-%d").date()
            guardados = 0
            for registro in data.registros:
                await conn.execute("""
                    INSERT INTO public.asistencias (inscripcion_id, fecha, estado, observaciones)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (inscripcion_id, fecha) DO UPDATE
                    SET estado = EXCLUDED.estado, observaciones = EXCLUDED.observaciones
                """, registro.inscripcion_id, fecha_date, registro.estado, registro.observaciones)
                guardados += 1

            return {"data": {"registros_guardados": guardados, "fecha": data.fecha}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando asistencia: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.get("/{profesor_id}/seccion/{seccion_id}/evaluaciones", summary="Evaluaciones de una sección")
async def evaluaciones_seccion(
    profesor_id: int,
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Evaluaciones sección {seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", seccion_id)

            if not seccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

            if current_user['rol'] == 'profesor' and seccion['docente_id'] != current_user['id']:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

            rows = await conn.fetch("""
                SELECT
                    u.id as estudiante_id, u.first_name, u.last_name,
                    i.id as inscripcion_id, i.nota_final,
                    ev.tipo_evaluacion, ev.nota, ev.peso_porcentual, ev.fecha_evaluacion
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                LEFT JOIN public.evaluaciones_parciales ev ON ev.inscripcion_id = i.id
                WHERE i.seccion_id = $1
                ORDER BY u.last_name, ev.tipo_evaluacion
            """, seccion_id)

            por_estudiante = {}
            for row in rows:
                r = dict(row)
                eid = r['estudiante_id']
                if eid not in por_estudiante:
                    por_estudiante[eid] = {
                        "estudiante_id": eid,
                        "nombre": f"{r['first_name']} {r['last_name']}",
                        "inscripcion_id": r['inscripcion_id'],
                        "nota_final": float(r['nota_final']) if r['nota_final'] else None,
                        "evaluaciones": []
                    }
                if r['tipo_evaluacion']:
                    por_estudiante[eid]['evaluaciones'].append({
                        "tipo": r['tipo_evaluacion'],
                        "nota": float(r['nota']) if r['nota'] else None,
                        "peso": float(r['peso_porcentual']) if r['peso_porcentual'] else None,
                        "fecha": r['fecha_evaluacion'].isoformat() if r['fecha_evaluacion'] else None
                    })

            return {"data": {"evaluaciones": list(por_estudiante.values())}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluaciones sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.post("/evaluacion", summary="Registrar evaluación parcial")
async def registrar_evaluacion(
    data: EvaluacionRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor']))
) -> Dict[str, Any]:

    logger.info(f"Registrando evaluación por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            result = await conn.fetchrow("""
                SELECT s.docente_id FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE i.id = $1
            """, data.inscripcion_id)

            if not result or result['docente_id'] != current_user['id']:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso sobre esta inscripción")

            ev = await conn.fetchrow("""
                INSERT INTO public.evaluaciones_parciales
                (inscripcion_id, tipo_evaluacion, nota, peso_porcentual, fecha_evaluacion)
                VALUES ($1, $2, $3, $4, CURRENT_DATE)
                ON CONFLICT (inscripcion_id, tipo_evaluacion)
                DO UPDATE SET nota = EXCLUDED.nota, fecha_evaluacion = EXCLUDED.fecha_evaluacion
                RETURNING id
            """, data.inscripcion_id, data.tipo_evaluacion, data.nota, data.peso_porcentual)

            return {"data": {"evaluacion_id": ev['id'], "mensaje": "Evaluación guardada"}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando evaluación: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")

@router.get("/{profesor_id}/seccion/{seccion_id}/asistencia-historica", summary="Historial de asistencia de una sección")
async def asistencia_historica(
    profesor_id: int,
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['profesor', 'coordinador', 'director', 'admin']))
) -> Dict[str, Any]:

    logger.info(f"Historial asistencia sección {seccion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", seccion_id)

            if not seccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

            if current_user['rol'] == 'profesor' and seccion['docente_id'] != current_user['id']:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

            rows = await conn.fetch("""
                SELECT
                    u.id as estudiante_id,
                    u.first_name, u.last_name, u.cedula,
                    i.id as inscripcion_id,
                    a.fecha, a.estado, a.observaciones
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                LEFT JOIN public.asistencias a ON a.inscripcion_id = i.id
                WHERE i.seccion_id = $1
                ORDER BY u.last_name, u.first_name, a.fecha
            """, seccion_id)

            por_estudiante = {}
            fechas_set = set()

            for row in rows:
                r = dict(row)
                eid = r['estudiante_id']
                if eid not in por_estudiante:
                    por_estudiante[eid] = {
                        "estudiante_id": eid,
                        "nombre": f"{r['first_name']} {r['last_name']}",
                        "cedula": r['cedula'],
                        "inscripcion_id": r['inscripcion_id'],
                        "registros": {}
                    }
                if r['fecha']:
                    fecha_str = r['fecha'].isoformat()
                    fechas_set.add(fecha_str)
                    por_estudiante[eid]['registros'][fecha_str] = {
                        "estado": r['estado'],
                        "observaciones": r['observaciones']
                    }

            fechas = sorted(list(fechas_set))

            for eid in por_estudiante:
                registros = por_estudiante[eid]['registros']
                total = len(fechas)
                presentes = sum(1 for f in fechas if registros.get(f, {}).get('estado') == 'presente')
                tardanzas = sum(1 for f in fechas if registros.get(f, {}).get('estado') == 'tardanza')
                ausentes = sum(1 for f in fechas if registros.get(f, {}).get('estado') == 'ausente')
                justificados = sum(1 for f in fechas if registros.get(f, {}).get('estado') == 'justificado')
                efectivos = presentes + tardanzas
                porcentaje = round((efectivos / total * 100), 1) if total > 0 else 0
                por_estudiante[eid]['resumen'] = {
                    "total_clases": total,
                    "presentes": presentes,
                    "tardanzas": tardanzas,
                    "ausentes": ausentes,
                    "justificados": justificados,
                    "porcentaje_asistencia": porcentaje,
                    "en_riesgo": porcentaje < 75 and total > 0
                }

            return {
                "data": {
                    "fechas": fechas,
                    "alumnos": list(por_estudiante.values())
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error historial asistencia: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")
