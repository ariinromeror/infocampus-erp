"""
RQ-07 (docs/PRD.md): lógica de negocio académica (carreras, materias,
secciones, períodos, profesores, notas) extraída de `routers/academico.py`.

El router queda reducido a autenticación/autorización, parseo de
query/body (Pydantic), una llamada a una de estas funciones, y el armado
del sobre de respuesta HTTP — ninguna sentencia SQL vive ya en
`academico.py`.

Cada función recibe `conn: asyncpg.Connection` de forma explícita (no
gestiona su propio pool) para conservar el patrón `async with get_db() as
conn:` ya usado en los routers, y para que estas funciones puedan probarse
directamente (RQ-04) sin pasar por HTTP. Los errores de negocio (recurso no
encontrado, dato inválido) se señalan con `services.errors.ServiceError`
en vez de `fastapi.HTTPException`, que es un detalle de transporte.
"""
import json
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

import asyncpg

from schemas.common import PaginationParams
from services.errors import NotFoundError, ValidationError


def normalize_text(text: str) -> str:
    """Normaliza texto quitando tildes y acentos."""
    if not text:
        return ''
    normalized = unicodedata.normalize('NFD', text)
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')


def _parse_horario(horario_raw) -> dict:
    horario_data = horario_raw or {}
    if isinstance(horario_data, str):
        try:
            horario_data = json.loads(horario_data)
        except Exception:
            horario_data = {}
    return horario_data


async def crear_seccion(
    conn: asyncpg.Connection,
    materia_id: int,
    periodo_id: int,
    docente_id: Optional[int],
    codigo: str,
    cupo_maximo: int,
    aula: str,
    horario: Dict[str, Any],
) -> int:
    if not await conn.fetchrow("SELECT id FROM public.materias WHERE id = $1", materia_id):
        raise NotFoundError("Materia no encontrada")

    if not await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE id = $1", periodo_id):
        raise NotFoundError("Período no encontrado")

    if docente_id:
        docente = await conn.fetchrow("SELECT id, rol FROM public.usuarios WHERE id = $1", docente_id)
        if not docente or docente['rol'] != 'profesor':
            raise ValidationError("Docente inválido")

    horario_json = json.dumps(horario)

    row = await conn.fetchrow("""
        INSERT INTO public.secciones
        (materia_id, periodo_id, docente_id, codigo, cupo_maximo, cupo_actual, aula, horario)
        VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
        RETURNING id
    """, materia_id, periodo_id, docente_id, codigo, cupo_maximo, aula, horario_json)

    return row['id']


async def actualizar_seccion(
    conn: asyncpg.Connection,
    seccion_id: int,
    docente_id: Optional[int],
    codigo: Optional[str],
    cupo_maximo: Optional[int],
    aula: Optional[str],
    horario: Optional[Dict[str, Any]],
) -> None:
    if not await conn.fetchrow("SELECT id FROM public.secciones WHERE id = $1", seccion_id):
        raise NotFoundError("Sección no encontrada")

    updates = []
    params = []
    idx = 1

    if docente_id:
        docente = await conn.fetchrow("SELECT id, rol FROM public.usuarios WHERE id = $1", docente_id)
        if not docente or docente['rol'] != 'profesor':
            raise ValidationError("Docente inválido")
        updates.append(f"docente_id = ${idx}")
        params.append(docente_id)
        idx += 1

    if codigo:
        updates.append(f"codigo = ${idx}")
        params.append(codigo)
        idx += 1

    if cupo_maximo:
        updates.append(f"cupo_maximo = ${idx}")
        params.append(cupo_maximo)
        idx += 1

    if aula:
        updates.append(f"aula = ${idx}")
        params.append(aula)
        idx += 1

    if horario:
        updates.append(f"horario = ${idx}")
        params.append(json.dumps(horario))
        idx += 1

    if not updates:
        raise ValidationError("No hay campos para actualizar")

    params.append(seccion_id)
    await conn.execute(f"""
        UPDATE public.secciones
        SET {', '.join(updates)}
        WHERE id = ${idx}
    """, *params)


async def crear_periodo(
    conn: asyncpg.Connection,
    nombre: str,
    codigo: str,
    fecha_inicio: str,
    fecha_fin: str,
    activo: bool,
) -> int:
    if await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE codigo = $1", codigo):
        raise ValidationError("Ya existe un período con este código")

    if activo:
        await conn.execute("UPDATE public.periodos_lectivos SET activo = false WHERE activo = true")

    row = await conn.fetchrow("""
        INSERT INTO public.periodos_lectivos (nombre, codigo, fecha_inicio, fecha_fin, activo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    """, nombre, codigo, fecha_inicio, fecha_fin, activo)

    return row['id']


async def actualizar_periodo(
    conn: asyncpg.Connection,
    periodo_id: int,
    nombre: Optional[str],
    fecha_inicio: Optional[str],
    fecha_fin: Optional[str],
    activo: Optional[bool],
) -> None:
    if not await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE id = $1", periodo_id):
        raise NotFoundError("Período no encontrado")

    if activo:
        await conn.execute("UPDATE public.periodos_lectivos SET activo = false WHERE activo = true")

    updates = []
    params = []
    idx = 1

    if nombre:
        updates.append(f"nombre = ${idx}")
        params.append(nombre)
        idx += 1
    if fecha_inicio:
        updates.append(f"fecha_inicio = ${idx}")
        params.append(fecha_inicio)
        idx += 1
    if fecha_fin:
        updates.append(f"fecha_fin = ${idx}")
        params.append(fecha_fin)
        idx += 1
    if activo is not None:
        updates.append(f"activo = ${idx}")
        params.append(activo)
        idx += 1

    if not updates:
        raise ValidationError("No hay campos para actualizar")

    params.append(periodo_id)
    await conn.execute(f"""
        UPDATE public.periodos_lectivos
        SET {', '.join(updates)}
        WHERE id = ${idx}
    """, *params)


async def corregir_nota(
    conn: asyncpg.Connection,
    inscripcion_id: int,
    nota_final: float,
    motivo: str,
    modificado_por_id: int,
) -> Dict[str, Any]:
    inscripcion = await conn.fetchrow("""
        SELECT i.*, u.first_name, u.last_name
        FROM public.inscripciones i
        JOIN public.usuarios u ON i.estudiante_id = u.id
        WHERE i.id = $1
    """, inscripcion_id)

    if not inscripcion:
        raise NotFoundError("Inscripción no encontrada")

    insc = dict(inscripcion)
    nota_anterior = insc.get('nota_final')

    await conn.execute("""
        INSERT INTO public.historial_notas
        (inscripcion_id, estudiante_nombre, nota_anterior, nota_nueva, modificado_por, motivo)
        VALUES ($1, $2, $3, $4, $5, $6)
    """, inscripcion_id,
        f"{insc['first_name']} {insc['last_name']}",
        nota_anterior,
        nota_final,
        # `modificado_por` es VARCHAR(100) pero almacena el id del usuario como
        # texto: `director_router.historial_notas` hace
        # `JOIN public.usuarios u ON hn.modificado_por = u.id::TEXT` para
        # resolver el nombre de quien corrigió. Bug preexistente detectado por
        # test_academico_crud.py: se pasaba el id como int y asyncpg lo
        # rechazaba contra la columna VARCHAR.
        str(modificado_por_id),
        motivo)

    nuevo_estado = 'aprobado' if nota_final >= 7.0 else 'reprobado'

    await conn.execute("""
        UPDATE public.inscripciones
        SET nota_final = $1, estado = $2
        WHERE id = $3
    """, nota_final, nuevo_estado, inscripcion_id)

    return {
        "nota_anterior": float(nota_anterior) if nota_anterior else None,
        "nota_nueva": nota_final,
        "estado": nuevo_estado,
    }


async def listar_carreras(
    conn: asyncpg.Connection, pagination: PaginationParams
) -> Tuple[List[Dict[str, Any]], int]:
    total_row = await conn.fetchrow("SELECT COUNT(*) as total FROM public.carreras")
    total = total_row['total']

    rows = await conn.fetch("""
        SELECT
            c.id, c.nombre, c.codigo, c.duracion_semestres,
            c.creditos_totales, c.precio_credito, c.dias_gracia_pago, c.descripcion,
            COUNT(DISTINCT u.id) as total_estudiantes,
            COUNT(DISTINCT m.id) as total_materias
        FROM public.carreras c
        LEFT JOIN public.usuarios u ON u.carrera_id = c.id AND u.rol = 'estudiante'
        LEFT JOIN public.materias m ON m.carrera_id = c.id
        GROUP BY c.id
        ORDER BY c.nombre
        LIMIT $1 OFFSET $2
    """, pagination.limit, pagination.offset)

    carreras = [
        {
            "id": r['id'],
            "nombre": r['nombre'],
            "codigo": r['codigo'],
            "duracion_semestres": r['duracion_semestres'],
            "creditos_totales": r['creditos_totales'],
            "precio_credito": float(r['precio_credito']),
            "dias_gracia_pago": r['dias_gracia_pago'],
            "descripcion": r['descripcion'],
            "total_estudiantes": r['total_estudiantes'],
            "total_materias": r['total_materias'],
        }
        for r in (dict(row) for row in rows)
    ]
    return carreras, total


async def actualizar_carrera(
    conn: asyncpg.Connection, carrera_id: int, precio_credito: float
) -> Dict[str, Any]:
    precio = float(precio_credito)
    if precio < 0:
        raise ValidationError("precio_credito debe ser >= 0")

    row = await conn.fetchrow(
        "UPDATE public.carreras SET precio_credito = $1 WHERE id = $2 RETURNING id, nombre, precio_credito",
        precio, carrera_id
    )
    if not row:
        raise NotFoundError("Carrera no encontrada")

    return {
        "id": row["id"],
        "nombre": row["nombre"],
        "precio_credito": float(row["precio_credito"]),
    }


async def obtener_primer_semestre(conn: asyncpg.Connection, carrera_id: int) -> Dict[str, Any]:
    carrera = await conn.fetchrow(
        "SELECT id, nombre, precio_credito FROM public.carreras WHERE id = $1", carrera_id
    )
    if not carrera:
        raise NotFoundError("Carrera no encontrada")

    rows = await conn.fetch("""
        SELECT id, codigo, nombre, creditos
        FROM public.materias
        WHERE carrera_id = $1 AND semestre = 1
        ORDER BY nombre
    """, carrera_id)

    materias = []
    total_creditos = 0
    for row in rows:
        materias.append({
            "id": row['id'],
            "codigo": row['codigo'],
            "nombre": row['nombre'],
            "creditos": row['creditos'],
        })
        total_creditos += row['creditos']

    return {
        "carrera": {
            "id": carrera['id'],
            "nombre": carrera['nombre'],
            "precio_credito": float(carrera['precio_credito']) if carrera['precio_credito'] else 0,
        },
        "semestre": 1,
        "materias": materias,
        "total_creditos": total_creditos,
    }


async def listar_materias(
    conn: asyncpg.Connection,
    pagination: PaginationParams,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    filtros, params = [], []
    idx = 1
    if carrera_id:
        filtros.append(f"m.carrera_id = ${idx}")
        params.append(carrera_id)
        idx += 1
    if semestre:
        filtros.append(f"m.semestre = ${idx}")
        params.append(semestre)
        idx += 1
    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    total_row = await conn.fetchrow(
        f"SELECT COUNT(*) as total FROM public.materias m {where}", *params
    )
    total = total_row['total']

    param_count = len(params)
    rows = await conn.fetch(f"""
        SELECT m.id, m.nombre, m.codigo, m.creditos, m.semestre,
            m.carrera_id, m.descripcion, c.nombre as carrera_nombre
        FROM public.materias m
        JOIN public.carreras c ON m.carrera_id = c.id
        {where}
        ORDER BY m.semestre, m.nombre
        LIMIT ${param_count + 1} OFFSET ${param_count + 2}
    """, *params, pagination.limit, pagination.offset)

    materias = [
        {
            "id": r['id'],
            "nombre": r['nombre'],
            "codigo": r['codigo'],
            "creditos": r['creditos'],
            "semestre": r['semestre'],
            "carrera_id": r['carrera_id'],
            "carrera": r['carrera_nombre'],
            "descripcion": r['descripcion'],
        }
        for r in (dict(row) for row in rows)
    ]
    return materias, total


async def obtener_malla_curricular(conn: asyncpg.Connection, carrera_id: int) -> Dict[str, Any]:
    carrera = await conn.fetchrow("""
        SELECT id, nombre, creditos_totales, precio_credito, duracion_semestres, descripcion
        FROM public.carreras WHERE id = $1
    """, carrera_id)
    if not carrera:
        raise NotFoundError("Carrera no encontrada")

    prereq_rows = await conn.fetch("""
        SELECT p.materia_id, pr.id, pr.codigo, pr.nombre
        FROM public.prerequisitos p
        JOIN public.materias pr ON p.prerequisito_id = pr.id
        JOIN public.materias m  ON p.materia_id = m.id
        WHERE m.carrera_id = $1
    """, carrera_id)
    prereqs_by_materia: Dict[int, List[Dict[str, Any]]] = {}
    for row in prereq_rows:
        r = dict(row)
        mid = r["materia_id"]
        prereqs_by_materia.setdefault(mid, []).append({
            "id": r["id"], "codigo": r["codigo"], "nombre": r["nombre"],
        })

    materia_rows = await conn.fetch("""
        SELECT id, nombre, codigo, creditos, semestre, descripcion
        FROM public.materias
        WHERE carrera_id = $1
        ORDER BY semestre, nombre
    """, carrera_id)

    semestres: Dict[int, Dict[str, Any]] = {}
    seen_ids = set()
    for row in materia_rows:
        r = dict(row)
        if r['id'] in seen_ids:
            continue
        seen_ids.add(r['id'])
        semestre = r['semestre']
        if semestre not in semestres:
            semestres[semestre] = {"numero": semestre, "materias": [], "creditos": 0}
        semestres[semestre]["materias"].append({
            "id": r['id'],
            "codigo": r['codigo'],
            "nombre": r['nombre'],
            "creditos": r['creditos'],
            "descripcion": r['descripcion'],
            "prerrequisitos": prereqs_by_materia.get(r['id'], []),
        })
        semestres[semestre]["creditos"] += r['creditos']

    return {
        "carrera": {
            "id": carrera['id'],
            "nombre": carrera['nombre'],
            "creditos_totales": carrera['creditos_totales'],
            "precio_credito": float(carrera['precio_credito']) if carrera['precio_credito'] else 0,
            "duracion_semestres": carrera['duracion_semestres'],
            "descripcion": carrera['descripcion'],
        },
        "semestres": list(semestres.values()),
        "total_creditos": sum(s['creditos'] for s in semestres.values()),
    }


async def listar_secciones(
    conn: asyncpg.Connection,
    pagination: PaginationParams,
    periodo_id: Optional[int] = None,
    materia_id: Optional[int] = None,
    docente_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    filtros, params = [], []
    idx = 1
    if periodo_id:
        filtros.append(f"s.periodo_id = ${idx}")
        params.append(periodo_id)
        idx += 1
    if materia_id:
        filtros.append(f"s.materia_id = ${idx}")
        params.append(materia_id)
        idx += 1
    if docente_id:
        filtros.append(f"s.docente_id = ${idx}")
        params.append(docente_id)
        idx += 1
    if carrera_id:
        filtros.append(f"m.carrera_id = ${idx}")
        params.append(carrera_id)
        idx += 1
    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    total_row = await conn.fetchrow(f"""
        SELECT COUNT(*) as total
        FROM public.secciones s
        JOIN public.materias m ON s.materia_id = m.id
        {where}
    """, *params)
    total = total_row['total']

    param_count = len(params)
    rows = await conn.fetch(f"""
        SELECT
            s.id, s.codigo, s.aula, s.horario, s.cupo_maximo, s.cupo_actual, m.semestre as semestre,
            m.nombre as materia_nombre, m.codigo as materia_codigo, m.carrera_id,
            p.nombre as periodo_nombre, p.codigo as periodo_codigo, p.activo,
            u.first_name as docente_nombre, u.last_name as docente_apellido,
            u.id as docente_id
        FROM public.secciones s
        JOIN public.materias m ON s.materia_id = m.id
        JOIN public.periodos_lectivos p ON s.periodo_id = p.id
        LEFT JOIN public.usuarios u ON s.docente_id = u.id
        {where}
        ORDER BY p.codigo DESC, m.semestre, m.nombre
        LIMIT ${param_count + 1} OFFSET ${param_count + 2}
    """, *params, pagination.limit, pagination.offset)

    secciones = []
    for row in rows:
        r = dict(row)
        h = _parse_horario(r.get('horario'))
        dias = h.get('dias', [])
        secciones.append({
            "id": r['id'],
            "codigo": r['codigo'],
            "aula": r['aula'],
            "materia": r['materia_nombre'],
            "materia_codigo": r['materia_codigo'],
            "carrera_id": r['carrera_id'],
            "semestre": r['semestre'],
            "periodo": r['periodo_nombre'],
            "periodo_codigo": r['periodo_codigo'],
            "periodo_activo": r['activo'],
            "docente_id": r['docente_id'],
            "docente": f"{r['docente_nombre']} {r['docente_apellido']}" if r['docente_nombre'] else None,
            "cupo_maximo": r['cupo_maximo'],
            "cupo_actual": r['cupo_actual'],
            "dias": dias,
            "hora_inicio": h.get('hora_inicio', ''),
            "hora_fin": h.get('hora_fin', ''),
            "horario": f"{', '.join(dias)} {h.get('hora_inicio', '')}-{h.get('hora_fin', '')}".strip(),
        })
    return secciones, total


async def listar_periodos(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    rows = await conn.fetch("""
        SELECT id, nombre, codigo, fecha_inicio, fecha_fin, activo
        FROM public.periodos_lectivos
        ORDER BY codigo DESC
    """)
    return [
        {
            "id": r['id'],
            "nombre": r['nombre'],
            "codigo": r['codigo'],
            "fecha_inicio": r['fecha_inicio'].isoformat() if r['fecha_inicio'] else None,
            "fecha_fin": r['fecha_fin'].isoformat() if r['fecha_fin'] else None,
            "activo": r['activo'],
        }
        for r in (dict(row) for row in rows)
    ]


async def listar_estudiantes(
    conn: asyncpg.Connection,
    pagination: PaginationParams,
    q: Optional[str] = None,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    es_becado: Optional[bool] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    filtros = ["u.rol = 'estudiante'", "u.activo = true"]
    params = []
    idx = 1

    if q:
        search_term = f"%{q}%"
        search_normalized = f"%{normalize_text(q)}%"
        filtros.append(f"""
            (LOWER(u.first_name) LIKE LOWER(${idx})
            OR LOWER(u.last_name) LIKE LOWER(${idx+1})
            OR LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER(${idx+2})
            OR u.cedula LIKE ${idx+3}
            OR LOWER(u.first_name) LIKE LOWER(${idx+4})
            OR LOWER(u.last_name) LIKE LOWER(${idx+5})
            OR LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER(${idx+6}))
        """)
        params.extend([search_term, search_term, search_term, search_term,
                      search_normalized, search_normalized, search_normalized])
        idx += 7

    if carrera_id:
        filtros.append(f"u.carrera_id = ${idx}")
        params.append(carrera_id)
        idx += 1
    if semestre:
        filtros.append(f"u.semestre_actual = ${idx}")
        params.append(semestre)
        idx += 1
    if es_becado is not None:
        filtros.append(f"u.es_becado = ${idx}")
        params.append(es_becado)
        idx += 1

    where_clause = " AND ".join(filtros)

    total_row = await conn.fetchrow(f"SELECT COUNT(*) as total FROM public.usuarios u WHERE {where_clause}", *params)
    total = total_row['total']

    param_count = len(params)
    data_params = params + [pagination.limit, pagination.offset]
    rows = await conn.fetch(f"""
        SELECT
            u.id, u.first_name, u.last_name, u.cedula, u.email,
            u.semestre_actual, u.promedio_acumulado, u.creditos_aprobados,
            u.es_becado, u.porcentaje_beca, u.tipo_beca, u.convenio_activo,
            c.nombre as carrera_nombre
        FROM public.usuarios u
        LEFT JOIN public.carreras c ON u.carrera_id = c.id
        WHERE {where_clause}
        ORDER BY u.last_name, u.first_name
        LIMIT ${param_count + 1} OFFSET ${param_count + 2}
    """, *data_params)

    estudiantes = [
        {
            "id": r['id'],
            "nombre": f"{r['first_name']} {r['last_name']}",
            "cedula": r['cedula'],
            "email": r['email'],
            "carrera": r['carrera_nombre'],
            "semestre_actual": r['semestre_actual'],
            "promedio_acumulado": float(r['promedio_acumulado']) if r['promedio_acumulado'] else None,
            "creditos_aprobados": r['creditos_aprobados'],
            "es_becado": r['es_becado'],
            "porcentaje_beca": r['porcentaje_beca'],
            "tipo_beca": r['tipo_beca'],
            "convenio_activo": r['convenio_activo'],
        }
        for r in (dict(row) for row in rows)
    ]
    return estudiantes, total


async def listar_profesores(
    conn: asyncpg.Connection, pagination: PaginationParams
) -> Tuple[List[Dict[str, Any]], int]:
    total_row = await conn.fetchrow(
        "SELECT COUNT(*) as total FROM public.usuarios WHERE rol = 'profesor' AND activo = true"
    )
    total = total_row['total']

    rows = await conn.fetch("""
        SELECT
            u.id, u.first_name, u.last_name, u.cedula, u.email,
            u.titulo_academico, u.especialidad, u.años_experiencia,
            COUNT(s.id) as secciones_activas
        FROM public.usuarios u
        LEFT JOIN public.secciones s ON s.docente_id = u.id
        WHERE u.rol = 'profesor' AND u.activo = true
        GROUP BY u.id
        ORDER BY u.last_name
        LIMIT $1 OFFSET $2
    """, pagination.limit, pagination.offset)

    profesores = [
        {
            "id": r['id'],
            "nombre": f"{r['first_name']} {r['last_name']}",
            "cedula": r['cedula'],
            "email": r['email'],
            "titulo": r['titulo_academico'],
            "especialidad": r['especialidad'],
            "años_experiencia": r['años_experiencia'],
            "secciones_activas": r['secciones_activas'],
        }
        for r in (dict(row) for row in rows)
    ]
    return profesores, total


async def listar_estudiantes_seccion(conn: asyncpg.Connection, seccion_id: int) -> Dict[str, Any]:
    seccion = await conn.fetchrow(
        "SELECT id, materia_id, codigo FROM public.secciones WHERE id = $1", seccion_id
    )
    if not seccion:
        raise NotFoundError("Sección no encontrada")

    rows = await conn.fetch("""
        SELECT
            u.id, u.first_name, u.last_name, u.cedula,
            i.id as inscripcion_id, i.nota_final, i.estado, i.pago_id,
            c.nombre as carrera
        FROM public.inscripciones i
        JOIN public.usuarios u ON i.estudiante_id = u.id
        LEFT JOIN public.carreras c ON u.carrera_id = c.id
        WHERE i.seccion_id = $1
        ORDER BY u.last_name, u.first_name
    """, seccion_id)

    estudiantes = [
        {
            "id": r['id'],
            "nombre": f"{r['first_name']} {r['last_name']}",
            "cedula": r['cedula'],
            "carrera": r['carrera'] or '—',
            "inscripcion_id": r['inscripcion_id'],
            "nota_final": float(r['nota_final']) if r['nota_final'] else None,
            "estado": r['estado'],
            "pago_id": r['pago_id'],
            "pagado": r['pago_id'] is not None,
        }
        for r in (dict(row) for row in rows)
    ]

    return {
        "estudiantes": estudiantes,
        "seccion": {"id": seccion['id'], "codigo": seccion['codigo'], "materia_id": seccion['materia_id']},
    }


async def obtener_rendimiento_profesor(
    conn: asyncpg.Connection, profesor_id: int, periodo_id: Optional[int] = None
) -> Dict[str, Any]:
    profesor = await conn.fetchrow(
        "SELECT id, first_name, last_name, email, titulo_academico, especialidad "
        "FROM public.usuarios WHERE id = $1 AND rol = 'profesor'",
        profesor_id,
    )
    if not profesor:
        raise NotFoundError("Profesor no encontrado")

    if periodo_id:
        seccion_rows = await conn.fetch("""
            SELECT
                s.id as seccion_id,
                s.codigo as seccion_codigo,
                m.nombre as materia,
                c.nombre as carrera,
                p.nombre as periodo,
                p.id as periodo_id,
                COUNT(i.id) as total_estudiantes,
                AVG(i.nota_final) as promedio_notas,
                COUNT(CASE WHEN i.nota_final >= 7.0 THEN 1 END) as estudiantes_aprobados,
                COUNT(CASE WHEN i.nota_final < 7.0 THEN 1 END) as estudiantes_reprobados
            FROM public.secciones s
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.carreras c ON m.carrera_id = c.id
            JOIN public.periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN public.inscripciones i ON s.id = i.seccion_id AND i.estado = 'aprobado'
            WHERE s.docente_id = $1 AND s.periodo_id = $2
            GROUP BY s.id, m.nombre, c.nombre, p.nombre, p.id
            ORDER BY p.fecha_inicio DESC, m.nombre
        """, profesor_id, periodo_id)
    else:
        seccion_rows = await conn.fetch("""
            SELECT
                s.id as seccion_id,
                s.codigo as seccion_codigo,
                m.nombre as materia,
                c.nombre as carrera,
                p.nombre as periodo,
                p.id as periodo_id,
                COUNT(i.id) as total_estudiantes,
                AVG(i.nota_final) as promedio_notas,
                COUNT(CASE WHEN i.nota_final >= 7.0 THEN 1 END) as estudiantes_aprobados,
                COUNT(CASE WHEN i.nota_final < 7.0 THEN 1 END) as estudiantes_reprobados
            FROM public.secciones s
            JOIN public.materias m ON s.materia_id = m.id
            JOIN public.carreras c ON m.carrera_id = c.id
            JOIN public.periodos_lectivos p ON s.periodo_id = p.id
            LEFT JOIN public.inscripciones i ON s.id = i.seccion_id AND i.estado = 'aprobado'
            WHERE s.docente_id = $1
            GROUP BY s.id, m.nombre, c.nombre, p.nombre, p.id
            ORDER BY p.fecha_inicio DESC, m.nombre
        """, profesor_id)

    secciones = [
        {
            "seccion_id": r['seccion_id'],
            "seccion_codigo": r['seccion_codigo'],
            "materia": r['materia'],
            "carrera": r['carrera'],
            "periodo": r['periodo'],
            "periodo_id": r['periodo_id'],
            "total_estudiantes": r['total_estudiantes'] or 0,
            "promedio_notas": round(float(r['promedio_notas']), 2) if r['promedio_notas'] else None,
            "estudiantes_aprobados": r['estudiantes_aprobados'] or 0,
            "estudiantes_reprobados": r['estudiantes_reprobados'] or 0,
        }
        for r in (dict(row) for row in seccion_rows)
    ]

    historial_rows = await conn.fetch("""
        SELECT
            p.id as periodo_id,
            p.nombre as periodo,
            COUNT(DISTINCT s.id) as total_secciones,
            COUNT(DISTINCT i.id) as total_inscripciones,
            AVG(i.nota_final) as promedio_general
        FROM public.periodos_lectivos p
        JOIN public.secciones s ON p.id = s.periodo_id AND s.docente_id = $1
        LEFT JOIN public.inscripciones i ON s.id = i.seccion_id AND i.estado = 'aprobado'
        GROUP BY p.id, p.nombre
        ORDER BY p.fecha_inicio DESC
        LIMIT 5
    """, profesor_id)

    historial = [
        {
            "periodo_id": r['periodo_id'],
            "periodo": r['periodo'],
            "total_secciones": r['total_secciones'] or 0,
            "total_inscripciones": r['total_inscripciones'] or 0,
            "promedio_general": round(float(r['promedio_general']), 2) if r['promedio_general'] else None,
        }
        for r in (dict(row) for row in historial_rows)
    ]

    return {
        "profesor": {
            "id": profesor['id'],
            "nombre": f"{profesor['first_name']} {profesor['last_name']}",
            "email": profesor['email'],
            "titulo": profesor['titulo_academico'],
            "especialidad": profesor['especialidad'],
        },
        "secciones_actuales": secciones,
        "historial_periodos": historial,
    }


async def obtener_horarios(
    conn: asyncpg.Connection, periodo_id: Optional[int] = None, carrera_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    params = []
    conditions = []
    idx = 1
    if periodo_id:
        conditions.append(f"s.periodo_id = ${idx}")
        params.append(periodo_id)
        idx += 1
    if carrera_id:
        conditions.append(f"m.carrera_id = ${idx}")
        params.append(carrera_id)
        idx += 1

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = await conn.fetch(f"""
        SELECT
            s.id as seccion_id,
            s.codigo as seccion_codigo,
            s.aula,
            s.horario,
            m.nombre as materia,
            m.codigo as materia_codigo,
            c.nombre as carrera,
            c.id as carrera_id,
            p.nombre as periodo,
            p.id as periodo_id,
            CONCAT(u.first_name, ' ', u.last_name) as profesor,
            s.cupo_maximo,
            s.cupo_actual
        FROM public.secciones s
        JOIN public.materias m ON s.materia_id = m.id
        JOIN public.carreras c ON m.carrera_id = c.id
        JOIN public.periodos_lectivos p ON s.periodo_id = p.id
        LEFT JOIN public.usuarios u ON s.docente_id = u.id
        {where_clause}
        ORDER BY p.activo DESC, c.nombre, m.nombre, s.codigo
    """, *params)

    secciones = []
    for row in rows:
        r = dict(row)
        horario = _parse_horario(r['horario'])
        secciones.append({
            "seccion_id": r['seccion_id'],
            "seccion_codigo": r['seccion_codigo'],
            "aula": r['aula'],
            "horario": horario,
            "materia": r['materia'],
            "materia_codigo": r['materia_codigo'],
            "carrera": r['carrera'],
            "carrera_id": r['carrera_id'],
            "periodo": r['periodo'],
            "periodo_id": r['periodo_id'],
            "profesor": r['profesor'],
            "cupo_maximo": r['cupo_maximo'],
            "cupo_actual": r['cupo_actual'],
        })
    return secciones
