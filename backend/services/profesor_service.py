"""
RQ-07 (docs/PRD.md): lógica de negocio de profesor (secciones asignadas,
alumnos, asistencia, evaluaciones parciales) extraída de
`routers/profesor_routes.py`.

El router queda reducido a autenticación/autorización de alto nivel,
parseo de query/body (Pydantic), una llamada a una de estas funciones, y el
armado del sobre de respuesta HTTP — ninguna sentencia SQL vive ya en
`profesor_routes.py`.

Las comprobaciones de "¿esta sección es de este profesor?" dependen de un
dato que solo se conoce tras consultar la base (`seccion.docente_id`), así
que viven dentro del servicio junto a la query que las hace posibles;
señalan la violación con `services.errors.ForbiddenError` en vez de
`fastapi.HTTPException`, igual que `NotFoundError`/`ValidationError`.
"""
from datetime import datetime
from typing import Any, Dict, List, Tuple

import asyncpg

from schemas.common import PaginationParams
from services.errors import ForbiddenError, NotFoundError


def _parse_horario(horario_raw) -> dict:
    import json
    horario_data = horario_raw or {}
    if isinstance(horario_data, str):
        try:
            horario_data = json.loads(horario_data)
        except Exception:
            horario_data = {}
    return horario_data


async def obtener_secciones_profesor(
    conn: asyncpg.Connection, profesor_id: int, pagination: PaginationParams
) -> Tuple[List[Dict[str, Any]], int]:
    total = await conn.fetchval(
        "SELECT COUNT(*) FROM public.secciones s WHERE s.docente_id = $1",
        profesor_id,
    )

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
        LIMIT $2 OFFSET $3
    """, profesor_id, pagination.limit, pagination.offset)

    secciones = []
    for row in rows:
        r = dict(row)
        h = _parse_horario(r.get('horario'))
        dias = h.get('dias', [])
        hora_inicio = h.get('hora_inicio', '')
        hora_fin = h.get('hora_fin', '')
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
            "horario": f"{', '.join(dias)} {hora_inicio}-{hora_fin}".strip(),
        })
    return secciones, total


async def _verificar_acceso_seccion(
    conn: asyncpg.Connection, seccion_id: int, current_user_id: int, current_user_rol: str
) -> Dict[str, Any]:
    """Verifica que la sección exista y que, si quien pregunta es un
    profesor, sea el docente asignado. Devuelve la fila de la sección."""
    seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", seccion_id)
    if not seccion:
        raise NotFoundError("Sección no encontrada")
    if current_user_rol == 'profesor' and seccion['docente_id'] != current_user_id:
        raise ForbiddenError("Sin permiso")
    return dict(seccion)


async def obtener_alumnos_seccion(
    conn: asyncpg.Connection, seccion_id: int, current_user_id: int, current_user_rol: str
) -> List[Dict[str, Any]]:
    await _verificar_acceso_seccion(conn, seccion_id, current_user_id, current_user_rol)

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
            "porcentaje_asistencia": round((presentes / total * 100), 1) if total > 0 else 0,
        })
    return alumnos


async def registrar_asistencia(
    conn: asyncpg.Connection,
    seccion_id: int,
    fecha: str,
    registros: List[Any],
    current_user_id: int,
) -> int:
    seccion = await conn.fetchrow("SELECT docente_id FROM public.secciones WHERE id = $1", seccion_id)
    if not seccion or seccion['docente_id'] != current_user_id:
        raise ForbiddenError("Sin permiso sobre esta sección")

    fecha_date = datetime.strptime(fecha, "%Y-%m-%d").date()
    guardados = 0
    for registro in registros:
        await conn.execute("""
            INSERT INTO public.asistencias (inscripcion_id, fecha, estado, observaciones)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (inscripcion_id, fecha) DO UPDATE
            SET estado = EXCLUDED.estado, observaciones = EXCLUDED.observaciones
        """, registro.inscripcion_id, fecha_date, registro.estado, registro.observaciones)
        guardados += 1

    return guardados


async def obtener_evaluaciones_seccion(
    conn: asyncpg.Connection, seccion_id: int, current_user_id: int, current_user_rol: str
) -> List[Dict[str, Any]]:
    await _verificar_acceso_seccion(conn, seccion_id, current_user_id, current_user_rol)

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

    por_estudiante: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        r = dict(row)
        eid = r['estudiante_id']
        if eid not in por_estudiante:
            por_estudiante[eid] = {
                "estudiante_id": eid,
                "nombre": f"{r['first_name']} {r['last_name']}",
                "inscripcion_id": r['inscripcion_id'],
                "nota_final": float(r['nota_final']) if r['nota_final'] else None,
                "evaluaciones": [],
            }
        if r['tipo_evaluacion']:
            por_estudiante[eid]['evaluaciones'].append({
                "tipo": r['tipo_evaluacion'],
                "nota": float(r['nota']) if r['nota'] else None,
                "peso": float(r['peso_porcentual']) if r['peso_porcentual'] else None,
                "fecha": r['fecha_evaluacion'].isoformat() if r['fecha_evaluacion'] else None,
            })

    return list(por_estudiante.values())


async def registrar_evaluacion(
    conn: asyncpg.Connection,
    inscripcion_id: int,
    tipo_evaluacion: str,
    nota: float,
    peso_porcentual: float,
    current_user_id: int,
) -> int:
    result = await conn.fetchrow("""
        SELECT s.docente_id FROM public.inscripciones i
        JOIN public.secciones s ON i.seccion_id = s.id
        WHERE i.id = $1
    """, inscripcion_id)

    if not result or result['docente_id'] != current_user_id:
        raise ForbiddenError("Sin permiso sobre esta inscripción")

    ev = await conn.fetchrow("""
        INSERT INTO public.evaluaciones_parciales
        (inscripcion_id, tipo_evaluacion, nota, peso_porcentual, fecha_evaluacion)
        VALUES ($1, $2, $3, $4, CURRENT_DATE)
        ON CONFLICT (inscripcion_id, tipo_evaluacion)
        DO UPDATE SET nota = EXCLUDED.nota, fecha_evaluacion = EXCLUDED.fecha_evaluacion
        RETURNING id
    """, inscripcion_id, tipo_evaluacion, nota, peso_porcentual)

    return ev['id']


async def obtener_asistencia_historica(
    conn: asyncpg.Connection, seccion_id: int, current_user_id: int, current_user_rol: str
) -> Dict[str, Any]:
    await _verificar_acceso_seccion(conn, seccion_id, current_user_id, current_user_rol)

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

    por_estudiante: Dict[int, Dict[str, Any]] = {}
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
                "registros": {},
            }
        if r['fecha']:
            fecha_str = r['fecha'].isoformat()
            fechas_set.add(fecha_str)
            por_estudiante[eid]['registros'][fecha_str] = {
                "estado": r['estado'],
                "observaciones": r['observaciones'],
            }

    fechas = sorted(fechas_set)

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
            "en_riesgo": porcentaje < 75 and total > 0,
        }

    return {
        "fechas": fechas,
        "alumnos": list(por_estudiante.values()),
    }
