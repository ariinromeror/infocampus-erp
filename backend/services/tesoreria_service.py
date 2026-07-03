"""
RQ-07 (docs/PRD.md): lógica de negocio de tesorería (pagos, mora, becas,
períodos, búsqueda de estudiantes) extraída de `routers/tesorero.py`.

El router queda reducido a autenticación/autorización, parseo de
query/body, una llamada a una de estas funciones, y el armado del sobre de
respuesta HTTP (`{"data": ...}`, `paginated_payload`, etc.) — ninguna
sentencia SQL vive ya en `tesorero.py`.

Cada función recibe `conn: asyncpg.Connection` de forma explícita en vez de
gestionar su propio pool, para conservar el patrón `async with get_db() as
conn:` que ya usan los routers, y para que estas funciones puedan probarse
directamente (RQ-04) contra una base de datos de test sin pasar por HTTP.
"""
from typing import Any, Dict, List, Optional, Tuple

import asyncpg

from schemas.common import PaginationParams


class EstudianteNoEncontrado(Exception):
    """Se lanza cuando el `estudiante_id` recibido no corresponde a un
    usuario con rol 'estudiante'. El router la traduce a HTTP 404."""


async def obtener_resumen_kpis(conn: asyncpg.Connection) -> Dict[str, Any]:
    pagos_stats = dict(await conn.fetchrow("""
        SELECT
            COALESCE(SUM(CASE WHEN estado = 'completado' THEN monto ELSE 0 END), 0) AS recaudado_total,
            COALESCE(SUM(CASE WHEN estado = 'pendiente'  THEN monto ELSE 0 END), 0) AS pendiente_cobro,
            COUNT(CASE WHEN estado = 'completado' THEN 1 END) AS pagos_completados,
            COUNT(CASE WHEN estado = 'pendiente'  THEN 1 END) AS pagos_pendientes
        FROM public.pagos
    """))

    estudiantes_mora_row = await conn.fetchrow("""
        SELECT COUNT(DISTINCT u.id) AS total
        FROM public.usuarios u
        JOIN public.inscripciones i ON i.estudiante_id = u.id
        WHERE u.rol = 'estudiante' AND i.pago_id IS NULL
    """)

    ingresos_rows = await conn.fetch("""
        SELECT
            DATE_TRUNC('month', fecha_pago) AS mes,
            COALESCE(SUM(monto), 0)         AS total
        FROM public.pagos
        WHERE estado = 'completado'
          AND fecha_pago >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', fecha_pago)
        ORDER BY mes DESC
        LIMIT 6
    """)
    ingresos_mensuales = [
        {
            "mes":   r["mes"].strftime("%Y-%m") if r["mes"] else None,
            "monto": float(r["total"]),
        }
        for r in (dict(row) for row in ingresos_rows)
    ]

    proyeccion_row = await conn.fetchrow("""
        SELECT COALESCE(SUM(monto), 0) AS proyeccion
        FROM public.pagos
        WHERE estado = 'pendiente'
    """)

    return {
        "recaudado_total":          float(pagos_stats["recaudado_total"]),
        "pendiente_cobro":          float(pagos_stats["pendiente_cobro"]),
        "estudiantes_mora":         estudiantes_mora_row["total"],
        "pagos_completados":        pagos_stats["pagos_completados"],
        "pagos_pendientes":         pagos_stats["pagos_pendientes"],
        "proyeccion_mes":           float(proyeccion_row["proyeccion"]),
        "ingresos_ultimos_6_meses": ingresos_mensuales,
    }


async def listar_pagos(
    conn: asyncpg.Connection,
    pagination: PaginationParams,
    estudiante_id: Optional[int] = None,
    estado: Optional[str] = None,
    periodo_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    filtros_data = ["u.rol = 'estudiante'"]
    params_data: list = []

    filtros_count: list = []
    params_count: list = []

    idx = 1
    if estudiante_id:
        filtros_data.append(f"p.estudiante_id = ${idx}")
        params_data.append(estudiante_id)
        filtros_count.append(f"p.estudiante_id = ${idx}")
        params_count.append(estudiante_id)
        idx += 1
    if estado:
        filtros_data.append(f"p.estado = ${idx}")
        params_data.append(estado)
        filtros_count.append(f"p.estado = ${idx}")
        params_count.append(estado)
        idx += 1
    if periodo_id:
        filtros_data.append(f"p.periodo_id = ${idx}")
        params_data.append(periodo_id)
        filtros_count.append(f"p.periodo_id = ${idx}")
        params_count.append(periodo_id)
        idx += 1
    if carrera_id:
        filtros_data.append(f"u.carrera_id = ${idx}")
        params_data.append(carrera_id)
        filtros_count.append(f"u.carrera_id = ${idx}")
        params_count.append(carrera_id)
        idx += 1
    if semestre:
        filtros_data.append(f"u.semestre_actual = ${idx}")
        params_data.append(semestre)
        filtros_count.append(f"u.semestre_actual = ${idx}")
        params_count.append(semestre)
        idx += 1

    where_data = " AND ".join(filtros_data)
    where_count = " AND ".join(filtros_count) if filtros_count else "1=1"

    count_from = "public.pagos p"
    if carrera_id or semestre:
        count_from = "public.pagos p JOIN public.usuarios u ON p.estudiante_id = u.id"
    total_row = await conn.fetchrow(
        f"SELECT COUNT(*) AS total FROM {count_from} WHERE {where_count}",
        *params_count,
    )
    total = total_row["total"]

    param_count = len(params_data)
    params_pag = params_data + [pagination.limit, pagination.offset]

    pagos_rows = await conn.fetch(
        f"""
        SELECT
            p.id, p.monto, p.fecha_pago, p.metodo_pago, p.estado,
            p.referencia, p.concepto, p.periodo_id,
            u.first_name, u.last_name, u.cedula,
            pl.nombre AS periodo_nombre, pl.codigo AS periodo_codigo
        FROM public.pagos p
        JOIN public.usuarios u ON p.estudiante_id = u.id
        LEFT JOIN public.periodos_lectivos pl ON p.periodo_id = pl.id
        WHERE {where_data}
        ORDER BY p.fecha_pago DESC
        LIMIT ${param_count + 1} OFFSET ${param_count + 2}
        """,
        *params_pag,
    )

    pagos = [
        {
            "id":          r["id"],
            "monto":       float(r["monto"]),
            "fecha_pago":  r["fecha_pago"].isoformat() if r["fecha_pago"] else None,
            "metodo_pago": r["metodo_pago"],
            "estado":      r["estado"],
            "referencia":  r["referencia"],
            "concepto":    r["concepto"],
            "estudiante":  f"{r['first_name']} {r['last_name']}",
            "cedula":      r["cedula"],
            "periodo":     r["periodo_nombre"],
        }
        for r in (dict(row) for row in pagos_rows)
    ]
    return pagos, total


async def listar_estudiantes_mora(
    conn: asyncpg.Connection, pagination: PaginationParams
) -> Tuple[List[Dict[str, Any]], int]:
    total_row = await conn.fetchrow("""
        SELECT COUNT(DISTINCT u.id) AS total
        FROM public.usuarios u
        JOIN public.inscripciones i ON i.estudiante_id = u.id AND i.pago_id IS NULL
        JOIN public.carreras      c ON u.carrera_id = c.id
        JOIN public.secciones     s ON i.seccion_id = s.id
        JOIN public.materias      m ON s.materia_id = m.id
        WHERE u.rol = 'estudiante'
    """)
    total = total_row["total"]

    rows = await conn.fetch("""
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.cedula,
            u.email,
            u.es_becado,
            u.porcentaje_beca,
            u.carrera_id,
            u.rol,
            u.semestre_actual,
            u.convenio_activo,
            u.fecha_limite_convenio,
            c.nombre AS carrera_nombre,
            COUNT(i.id) AS inscripciones_pendientes,
            COALESCE(SUM(
                m.creditos
                * c.precio_credito
                * (1.0 - COALESCE(u.porcentaje_beca, 0) / 100.0)
            ), 0) AS deuda_total
        FROM public.usuarios u
        JOIN public.inscripciones i ON i.estudiante_id = u.id AND i.pago_id IS NULL
        JOIN public.carreras      c ON u.carrera_id = c.id
        JOIN public.secciones     s ON i.seccion_id = s.id
        JOIN public.materias      m ON s.materia_id = m.id
        WHERE u.rol = 'estudiante'
        GROUP BY u.id, c.nombre, c.precio_credito
        ORDER BY deuda_total DESC
        LIMIT $1 OFFSET $2
    """, pagination.limit, pagination.offset)

    estudiantes = [
        {
            "id":                       r["id"],
            "nombre":                   f"{r['first_name']} {r['last_name']}",
            "cedula":                   r["cedula"],
            "email":                    r["email"],
            "carrera":                  r["carrera_nombre"],
            "es_becado":                r["es_becado"],
            "porcentaje_beca":          r["porcentaje_beca"],
            "rol":                      r["rol"],
            "semestre_actual":          r.get("semestre_actual"),
            "inscripciones_pendientes": int(r["inscripciones_pendientes"]),
            "deuda_total":              round(float(r["deuda_total"]), 2),
        }
        for r in (dict(row) for row in rows)
    ]
    return estudiantes, total


async def obtener_ingresos_por_periodo(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    rows = await conn.fetch("""
        SELECT
            pl.id, pl.nombre, pl.codigo, pl.activo,
            COUNT(p.id)                                          AS num_pagos,
            COALESCE(SUM(p.monto), 0)                           AS ingresos_totales,
            COUNT(CASE WHEN p.estado = 'completado' THEN 1 END) AS pagos_completados,
            COUNT(CASE WHEN p.estado = 'pendiente'  THEN 1 END) AS pagos_pendientes
        FROM public.periodos_lectivos pl
        LEFT JOIN public.pagos p ON p.periodo_id = pl.id
        GROUP BY pl.id, pl.nombre, pl.codigo, pl.activo
        ORDER BY pl.codigo DESC
    """)
    return [
        {
            "id":                r["id"],
            "nombre":            r["nombre"],
            "codigo":            r["codigo"],
            "activo":            r["activo"],
            "num_pagos":         r["num_pagos"],
            "ingresos_totales":  float(r["ingresos_totales"]),
            "pagos_completados": r["pagos_completados"],
            "pagos_pendientes":  r["pagos_pendientes"],
        }
        for r in (dict(row) for row in rows)
    ]


async def buscar_estudiante(conn: asyncpg.Connection, q: str) -> List[Dict[str, Any]]:
    search_term = f"%{q}%"
    rows = await conn.fetch("""
        SELECT
            u.id, u.first_name, u.last_name, u.cedula, u.email,
            u.es_becado, u.porcentaje_beca, u.carrera_id,
            u.convenio_activo,
            c.nombre AS carrera_nombre, c.precio_credito,
            COUNT(i.id) AS inscripciones_pendientes
        FROM public.usuarios u
        LEFT JOIN public.carreras c ON u.carrera_id = c.id
        LEFT JOIN public.inscripciones i
               ON i.estudiante_id = u.id AND i.pago_id IS NULL
        WHERE u.rol = 'estudiante'
          AND (
              LOWER(u.first_name) LIKE LOWER($1) OR
              LOWER(u.last_name)  LIKE LOWER($2) OR
              u.cedula            LIKE $3
          )
        GROUP BY u.id, c.nombre, c.precio_credito
        LIMIT 10
    """, search_term, search_term, search_term)

    estudiantes = []
    for row in rows:
        r = dict(row)
        # Estimación rápida: precio_credito × 3 créditos promedio × pendientes.
        # Para datos exactos se usa el endpoint de estado-cuenta individual.
        precio = float(r.get("precio_credito") or 50)
        pct_beca = float(r.get("porcentaje_beca") or 0)
        pendientes = int(r.get("inscripciones_pendientes") or 0)
        estudiantes.append({
            "id":                       r["id"],
            "nombre":                   f"{r['first_name']} {r['last_name']}",
            "cedula":                   r["cedula"],
            "email":                    r["email"],
            "carrera":                  r["carrera_nombre"],
            "es_becado":                r["es_becado"],
            "porcentaje_beca":          r["porcentaje_beca"],
            "inscripciones_pendientes": pendientes,
            "deuda_total":              round(precio * 3 * pendientes * (1 - pct_beca / 100), 2),
        })
    return estudiantes


async def asignar_beca(
    conn: asyncpg.Connection,
    estudiante_id: int,
    porcentaje_beca: int,
    tipo_beca: Optional[str],
) -> Dict[str, Any]:
    estudiante = await conn.fetchrow(
        "SELECT id, first_name, last_name FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'",
        estudiante_id,
    )
    if not estudiante:
        raise EstudianteNoEncontrado(str(estudiante_id))

    es_becado = porcentaje_beca > 0
    await conn.execute(
        """
        UPDATE public.usuarios
        SET es_becado = $1, porcentaje_beca = $2, tipo_beca = $3
        WHERE id = $4
        """,
        es_becado, porcentaje_beca, tipo_beca, estudiante_id,
    )

    est = dict(estudiante)
    return {
        "estudiante_id":   estudiante_id,
        "nombre":          f"{est['first_name']} {est['last_name']}",
        "es_becado":       es_becado,
        "porcentaje_beca": porcentaje_beca,
        "tipo_beca":       tipo_beca,
    }


async def listar_periodos(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    rows = await conn.fetch("""
        SELECT
            p.id, p.nombre, p.codigo, p.fecha_inicio, p.fecha_fin, p.activo,
            COUNT(DISTINCT s.id) AS total_secciones,
            COUNT(DISTINCT i.id) AS total_inscripciones
        FROM public.periodos_lectivos p
        LEFT JOIN public.secciones s ON p.id = s.periodo_id
        LEFT JOIN public.inscripciones i
               ON i.seccion_id = s.id AND i.estado = 'aprobado'
        GROUP BY p.id
        ORDER BY p.activo DESC, p.fecha_inicio DESC
    """)
    return [
        {
            "id":                  r["id"],
            "nombre":              r["nombre"],
            "codigo":              r["codigo"],
            "fecha_inicio":        r["fecha_inicio"].isoformat() if r["fecha_inicio"] else None,
            "fecha_fin":           r["fecha_fin"].isoformat() if r["fecha_fin"] else None,
            "activo":              r["activo"],
            "total_secciones":     r["total_secciones"] or 0,
            "total_inscripciones": r["total_inscripciones"] or 0,
        }
        for r in (dict(row) for row in rows)
    ]


async def listar_becados(conn: asyncpg.Connection) -> List[Dict[str, Any]]:
    rows = await conn.fetch("""
        SELECT
            u.id AS estudiante_id, u.cedula,
            u.first_name, u.last_name, u.email,
            c.nombre AS carrera,
            u.es_becado, u.porcentaje_beca, u.tipo_beca,
            COALESCE(SUM(pag.monto), 0) AS total_pagado
        FROM public.usuarios u
        LEFT JOIN public.carreras c ON u.carrera_id = c.id
        LEFT JOIN public.pagos pag
               ON u.id = pag.estudiante_id AND pag.estado = 'completado'
        WHERE u.rol = 'estudiante' AND u.es_becado = true
        GROUP BY u.id, u.cedula, u.first_name, u.last_name, u.email,
                 c.nombre, u.es_becado, u.porcentaje_beca, u.tipo_beca
        ORDER BY u.porcentaje_beca DESC, u.last_name, u.first_name
    """)
    return [
        {
            "estudiante_id":   r["estudiante_id"],
            "cedula":          r["cedula"],
            "nombre":          f"{r['first_name']} {r['last_name']}",
            "email":           r["email"],
            "carrera":         r["carrera"],
            "es_becado":       r["es_becado"],
            "porcentaje_beca": float(r["porcentaje_beca"]) if r["porcentaje_beca"] else 0,
            "tipo_beca":       r["tipo_beca"],
            "total_pagado":    float(r["total_pagado"]),
        }
        for r in (dict(row) for row in rows)
    ]
