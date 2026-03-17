from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from decimal import Decimal
import logging

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tesorero",
    tags=["Tesorero"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}},
)


@router.get("/resumen-kpis", summary="KPIs financieros rápidos")
async def resumen_kpis(
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            estudiantes_mora = estudiantes_mora_row["total"]

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
            ingresos_mensuales = []
            for row in ingresos_rows:
                r = dict(row)
                ingresos_mensuales.append({
                    "mes":   r["mes"].strftime("%Y-%m") if r["mes"] else None,
                    "monto": float(r["total"]),
                })

            proyeccion_row = await conn.fetchrow("""
                SELECT COALESCE(SUM(monto), 0) AS proyeccion
                FROM public.pagos
                WHERE estado = 'pendiente'
            """)
            proyeccion_mes = float(proyeccion_row["proyeccion"])

        return {
            "recaudado_total":          float(pagos_stats["recaudado_total"]),
            "pendiente_cobro":          float(pagos_stats["pendiente_cobro"]),
            "estudiantes_mora":         estudiantes_mora,
            "pagos_completados":        pagos_stats["pagos_completados"],
            "pagos_pendientes":         pagos_stats["pagos_pendientes"],
            "proyeccion_mes":           proyeccion_mes,
            "ingresos_ultimos_6_meses": ingresos_mensuales,
        }

    except Exception as e:
        logger.error(f"Error obteniendo KPIs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/pagos", summary="Listar todos los pagos")
async def listar_pagos(
    estudiante_id: Optional[int] = None,
    estado: Optional[str] = None,
    periodo_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"])),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            # Filtros para query de DATOS (incluye u.rol para mostrar info correcta)
            filtros_data = ["u.rol = 'estudiante'"]
            params_data: list = []

            # Filtros para COUNT (solo p.* - sin carrera/semestre)
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

            # COUNT: necesita JOIN a usuarios si hay filtros de carrera/semestre
            count_from = "public.pagos p"
            if carrera_id or semestre:
                count_from = "public.pagos p JOIN public.usuarios u ON p.estudiante_id = u.id"
            total_row = await conn.fetchrow(
                f"SELECT COUNT(*) AS total FROM {count_from} WHERE {where_count}",
                *params_count,
            )
            total = total_row["total"]

            param_count = len(params_data)
            params_pag = params_data + [limit, (page - 1) * limit]

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

            pagos = []
            for row in pagos_rows:
                r = dict(row)
                pagos.append({
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
                })

        return {
            "data": {
                "pagos":       pagos,
                "total":       total,
                "page":        page,
                "total_pages": (total + limit - 1) // limit,
            }
        }

    except Exception as e:
        logger.error(f"Error listando pagos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/estudiantes-mora", summary="Estudiantes en mora")
async def estudiantes_mora(
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
                LIMIT 200
            """)
            estudiantes = []
            for row in rows:
                r = dict(row)
                estudiantes.append({
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
                })

            return {"data": {"estudiantes": estudiantes}}

    except Exception as e:
        logger.error(f"Error consultando mora: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/ingresos-por-periodo", summary="Ingresos agrupados por período")
async def ingresos_por_periodo(
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            periodos = []
            for row in rows:
                r = dict(row)
                periodos.append({
                    "id":                r["id"],
                    "nombre":            r["nombre"],
                    "codigo":            r["codigo"],
                    "activo":            r["activo"],
                    "num_pagos":         r["num_pagos"],
                    "ingresos_totales":  float(r["ingresos_totales"]),
                    "pagos_completados": r["pagos_completados"],
                    "pagos_pendientes":  r["pagos_pendientes"],
                })
            return {"data": {"periodos": periodos}}

    except Exception as e:
        logger.error(f"Error consultando ingresos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/buscar-estudiante", summary="Buscar estudiante por nombre o cédula")
async def buscar_estudiante(
    q: str,
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"])),
) -> Dict[str, Any]:
    try:
        search_term = f"%{q}%"
        async with get_db() as conn:
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
                # calcular deuda inline con precio_credito ya traído en la query
                precio = float(r.get("precio_credito") or 50)
                pct_beca = float(r.get("porcentaje_beca") or 0)
                pendientes = int(r.get("inscripciones_pendientes") or 0)
                # estimación rápida: usamos precio_credito × 3 créditos promedio × pendientes
                # Para datos exactos se usa el endpoint de estado-cuenta individual
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

            return {"data": {"estudiantes": estudiantes}}

    except Exception as e:
        logger.error(f"Error buscando estudiante: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/becas/{estudiante_id}", summary="Asignar o modificar beca de estudiante")
async def asignar_beca(
    estudiante_id: int,
    porcentaje_beca: int = 0,
    tipo_beca: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(require_roles(["tesorero", "director", "admin"])),
) -> Dict[str, Any]:
    if not (0 <= porcentaje_beca <= 100):
        raise HTTPException(status_code=400, detail="El porcentaje debe estar entre 0 y 100")

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow(
                "SELECT id, first_name, last_name FROM public.usuarios WHERE id = $1 AND rol = 'estudiante'",
                estudiante_id,
            )
            if not estudiante:
                raise HTTPException(status_code=404, detail="Estudiante no encontrado")

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
            "ok": True,
            "message": "Beca actualizada correctamente",
            "data": {
                "estudiante_id":   estudiante_id,
                "nombre":          f"{est['first_name']} {est['last_name']}",
                "es_becado":       es_becado,
                "porcentaje_beca": porcentaje_beca,
                "tipo_beca":       tipo_beca,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error asignando beca: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/periodos", summary="Listar períodos lectivos")
async def listar_periodos(
    current_user: Dict[str, Any] = Depends(
        require_roles(["director", "admin", "coordinador", "tesorero"])
    ),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            periodos = []
            for row in rows:
                r = dict(row)
                periodos.append({
                    "id":                  r["id"],
                    "nombre":              r["nombre"],
                    "codigo":              r["codigo"],
                    "fecha_inicio":        r["fecha_inicio"].isoformat() if r["fecha_inicio"] else None,
                    "fecha_fin":           r["fecha_fin"].isoformat() if r["fecha_fin"] else None,
                    "activo":              r["activo"],
                    "total_secciones":     r["total_secciones"] or 0,
                    "total_inscripciones": r["total_inscripciones"] or 0,
                })
            return {"data": {"periodos": periodos}}

    except Exception as e:
        logger.error(f"Error listando períodos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/becas", summary="Listar todos los estudiantes con beca")
async def listar_becados(
    current_user: Dict[str, Any] = Depends(
        require_roles(["director", "admin", "coordinador", "tesorero"])
    ),
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            becados = []
            for row in rows:
                r = dict(row)
                becados.append({
                    "estudiante_id":   r["estudiante_id"],
                    "cedula":          r["cedula"],
                    "nombre":          f"{r['first_name']} {r['last_name']}",
                    "email":           r["email"],
                    "carrera":         r["carrera"],
                    "es_becado":       r["es_becado"],
                    "porcentaje_beca": float(r["porcentaje_beca"]) if r["porcentaje_beca"] else 0,
                    "tipo_beca":       r["tipo_beca"],
                    "total_pagado":    float(r["total_pagado"]),
                })
            return {"data": {"becados": becados}}

    except Exception as e:
        logger.error(f"Error listando becados: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))