from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta
import asyncio
import json
import logging
import os

from groq import AsyncGroq
from pydantic import BaseModel

from auth.dependencies import get_current_user
from config import settings
from database import get_db
from services.calculos_financieros import (
    calcular_deuda_total,
    calcular_en_mora,
    calcular_deuda_vencida,
)


class _ChatMensaje(BaseModel):
    role: str
    content: str


class _ChatRequest(BaseModel):
    message: str
    history: Optional[List[_ChatMensaje]] = []

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ia", tags=["IA"])


def _f(v) -> float:
    return float(v) if v is not None else 0.0


def _iso(v):
    if v is None:
        return None
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return str(v)


def _horario(raw) -> str:
    data = raw or {}
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            return ""
    dias = data.get("dias", [])
    hi = data.get("hora_inicio", "")
    hf = data.get("hora_fin", "")
    return f"{', '.join(dias)} {hi}-{hf}".strip()


@router.get("/contexto")
async def obtener_contexto(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    rol = current_user.get("rol")
    user_id = current_user["id"]

    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, nombre, codigo, activo, fecha_inicio, fecha_fin
                FROM public.periodos_lectivos
                WHERE activo = true
                ORDER BY fecha_inicio DESC LIMIT 1
                """
            )
            periodo = dict(row) if row else None
            if periodo:
                periodo["fecha_inicio"] = _iso(periodo["fecha_inicio"])
                periodo["fecha_fin"] = _iso(periodo["fecha_fin"])

            hoy = date.today()
            dias_para_fin = None
            if periodo and periodo.get("fecha_fin"):
                try:
                    dias_para_fin = (date.fromisoformat(periodo["fecha_fin"]) - hoy).days
                except Exception:
                    pass

            politicas_rows = await conn.fetch("SELECT clave, valor FROM public.configuracion_ia ORDER BY id")
            politicas = {r["clave"]: r["valor"] for r in politicas_rows}

            ctx: Dict[str, Any] = {
                "fecha_hoy": hoy.isoformat(),
                "periodo_activo": periodo,
                "dias_para_fin_periodo": dias_para_fin,
                "politicas_institucionales": politicas,
            }

            if rol == "estudiante":
                perfil_row = await conn.fetchrow(
                    """
                    SELECT u.es_becado, u.porcentaje_beca, u.tipo_beca,
                           u.convenio_activo, u.fecha_limite_convenio,
                           u.semestre_actual, u.creditos_aprobados, u.promedio_acumulado,
                           u.carrera_id,
                           c.nombre as carrera, c.precio_credito,
                           c.dias_gracia_pago, c.creditos_totales
                    FROM public.usuarios u
                    LEFT JOIN public.carreras c ON c.id = u.carrera_id
                    WHERE u.id = $1
                    """,
                    user_id,
                )
                perfil = dict(perfil_row or {})

                inscripciones_rows = await conn.fetch(
                    """
                    SELECT i.id, i.seccion_id, i.pago_id, i.fecha_inscripcion,
                           i.estado, i.nota_final,
                           m.nombre as materia, m.creditos,
                           s.aula, s.horario,
                           p.activo as periodo_activo,
                           p.codigo as periodo_codigo,
                           COALESCE(u.first_name||' '||u.last_name,'') as profesor
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    JOIN public.materias m ON s.materia_id = m.id
                    JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                    LEFT JOIN public.usuarios u ON s.docente_id = u.id
                    WHERE i.estudiante_id = $1
                    ORDER BY p.codigo DESC, m.nombre
                    """,
                    user_id,
                )
                inscripciones = [dict(r) for r in inscripciones_rows]

                pagos_rows = await conn.fetch(
                    """
                    SELECT monto, fecha_pago, metodo_pago, estado, concepto
                    FROM public.pagos
                    WHERE estudiante_id = $1
                    ORDER BY fecha_pago DESC LIMIT 6
                    """,
                    user_id,
                )
                pagos = [dict(r) for r in pagos_rows]

                asist_row = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(*) as total,
                        COUNT(CASE WHEN estado='presente' THEN 1 END) as presentes,
                        COUNT(CASE WHEN estado='ausente' THEN 1 END) as ausentes,
                        COUNT(CASE WHEN estado='tardanza' THEN 1 END) as tardanzas
                    FROM public.asistencias a
                    JOIN public.inscripciones i ON a.inscripcion_id = i.id
                    WHERE i.estudiante_id = $1
                    """,
                    user_id,
                )
                asist = dict(asist_row or {})

                evals_rows = await conn.fetch(
                    """
                    SELECT ev.tipo_evaluacion, ev.nota, ev.peso_porcentual,
                           m.nombre as materia
                    FROM public.evaluaciones_parciales ev
                    JOIN public.inscripciones i ON ev.inscripcion_id = i.id
                    JOIN public.secciones s ON i.seccion_id = s.id
                    JOIN public.materias m ON s.materia_id = m.id
                    JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                    WHERE i.estudiante_id = $1 AND p.activo = true
                    ORDER BY m.nombre
                    """,
                    user_id,
                )
                evals = [dict(r) for r in evals_rows]

                est_dict = {**current_user, **perfil}
                sin_pagar = [i for i in inscripciones if not i.get("pago_id")]
                deuda = await calcular_deuda_total(est_dict, sin_pagar, conn)
                en_mora = await calcular_en_mora(est_dict, sin_pagar, periodo, conn)
                deuda_vencida = await calcular_deuda_vencida(est_dict, sin_pagar, periodo, conn)

                dias_gracia = perfil.get("dias_gracia_pago") or 10
                fecha_limite_gracia = None
                if not en_mora and sin_pagar:
                    primera = min(
                        (i for i in sin_pagar if i.get("fecha_inscripcion")),
                        key=lambda x: x["fecha_inscripcion"],
                        default=None,
                    )
                    if primera and primera.get("fecha_inscripcion"):
                        fi = primera["fecha_inscripcion"]
                        if isinstance(fi, str):
                            fi = date.fromisoformat(fi)
                        fecha_limite_gracia = (fi + timedelta(days=dias_gracia)).isoformat()

                total_a = asist.get("total") or 0
                presentes = asist.get("presentes") or 0
                pct_asist = round(presentes / total_a * 100, 1) if total_a > 0 else 0.0
                minimo_asist = int(politicas.get("reglas_asistencia_minima", 75))

                evals_por_materia: Dict[str, list] = {}
                for ev in evals:
                    k = ev["materia"]
                    evals_por_materia.setdefault(k, []).append(
                        {
                            "tipo": ev["tipo_evaluacion"],
                            "nota": _f(ev.get("nota")),
                            "peso_pct": _f(ev.get("peso_porcentual")),
                        }
                    )

                materias_activas = [
                    {
                        "materia": i["materia"],
                        "creditos": i["creditos"],
                        "aula": i.get("aula"),
                        "horario": _horario(i.get("horario")),
                        "profesor": i.get("profesor"),
                        "nota_final": _f(i["nota_final"])
                        if i.get("nota_final") is not None
                        else None,
                        "estado": i.get("estado"),
                        "pagada": bool(i.get("pago_id")),
                    }
                    for i in inscripciones
                    if i.get("periodo_activo")
                ]

                historial = [
                    {
                        "materia": i["materia"],
                        "periodo": i["periodo_codigo"],
                        "nota_final": _f(i["nota_final"]),
                        "estado": i.get("estado"),
                    }
                    for i in inscripciones
                    if not i.get("periodo_activo") and i.get("nota_final") is not None
                ]

                ctx.update(
                    {
                        "perfil": {
                            "carrera": perfil.get("carrera"),
                            "semestre": perfil.get("semestre_actual"),
                            "creditos_aprobados": perfil.get("creditos_aprobados"),
                            "creditos_totales": perfil.get("creditos_totales"),
                            "promedio_acumulado": _f(perfil.get("promedio_acumulado")),
                            "es_becado": perfil.get("es_becado", False),
                            "porcentaje_beca": perfil.get("porcentaje_beca", 0),
                            "tipo_beca": perfil.get("tipo_beca"),
                            "precio_credito_usd": _f(perfil.get("precio_credito")),
                            "dias_gracia_pago": dias_gracia,
                        },
                        "estado_financiero": {
                            "en_mora": en_mora,
                            "deuda_total_usd": _f(deuda),
                            "deuda_vencida_usd": _f(deuda_vencida),
                            "materias_sin_pagar": len(sin_pagar),
                            "convenio_activo": perfil.get("convenio_activo", False),
                            "fecha_limite_convenio": _iso(
                                perfil.get("fecha_limite_convenio")
                            ),
                            "fecha_limite_gracia": fecha_limite_gracia,
                            "ultimos_pagos": [
                                {
                                    "monto": _f(p.get("monto")),
                                    "estado": p.get("estado"),
                                    "concepto": p.get("concepto"),
                                    "metodo": p.get("metodo_pago"),
                                    "fecha": _iso(p.get("fecha_pago")),
                                }
                                for p in pagos
                            ],
                        },
                        "asistencia": {
                            "porcentaje": pct_asist,
                            "minimo_requerido_pct": minimo_asist,
                            "en_riesgo": pct_asist < minimo_asist,
                            "total_clases": total_a,
                            "presentes": presentes,
                            "ausentes": asist.get("ausentes", 0),
                            "tardanzas": asist.get("tardanzas", 0),
                        },
                        "materias_activas": materias_activas,
                        "historial_notas": historial,
                        "evaluaciones_por_materia": evals_por_materia,
                    }
                )

            elif rol == "profesor":
                secciones_rows = await conn.fetch(
                    """
                    SELECT s.id, s.codigo, s.aula, s.horario, s.cupo_maximo,
                           m.nombre as materia, m.creditos,
                           p.codigo as periodo_codigo, p.activo,
                           COUNT(i.id) as inscritos,
                           ROUND(COALESCE(AVG(i.nota_final),0)::numeric,2) as promedio_seccion,
                           COUNT(CASE WHEN i.nota_final >= 7 THEN 1 END) as aprobados,
                           COUNT(CASE WHEN i.nota_final < 7 AND i.nota_final IS NOT NULL THEN 1 END) as reprobados
                    FROM public.secciones s
                    JOIN public.materias m ON s.materia_id = m.id
                    JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                    LEFT JOIN public.inscripciones i ON i.seccion_id = s.id
                    WHERE s.docente_id = $1
                    GROUP BY s.id, m.nombre, m.creditos, p.codigo, p.activo
                    ORDER BY p.activo DESC, p.codigo DESC
                    """,
                    user_id,
                )
                secciones = [
                    {
                        "materia": r["materia"],
                        "seccion": r["codigo"],
                        "aula": r.get("aula"),
                        "horario": _horario(r.get("horario")),
                        "periodo": r["periodo_codigo"],
                        "activo": r.get("activo", False),
                        "inscritos": r["inscritos"],
                        "cupo_maximo": r["cupo_maximo"],
                        "promedio_seccion": _f(r.get("promedio_seccion")),
                        "aprobados": r.get("aprobados", 0),
                        "reprobados": r.get("reprobados", 0),
                    }
                    for r in secciones_rows
                ]
                activas = [s for s in secciones if s["activo"]]
                ctx.update(
                    {
                        "resumen": {
                            "secciones_activas": len(activas),
                            "total_alumnos_activos": sum(
                                s["inscritos"] for s in activas
                            ),
                        },
                        "secciones": secciones,
                    }
                )

            elif rol == "tesorero":
                kpis_row = await conn.fetchrow(
                    """
                    SELECT
                        COALESCE(SUM(CASE WHEN estado='completado' THEN monto ELSE 0 END),0) as recaudado,
                        COUNT(CASE WHEN estado='completado' THEN 1 END) as completados,
                        COUNT(CASE WHEN estado='pendiente' THEN 1 END) as pendientes
                    FROM public.pagos
                    """
                )
                kpis_row = dict(kpis_row or {})

                con_deuda_rows = await conn.fetch(
                    """
                    SELECT
                        u.id,
                        u.first_name || ' ' || u.last_name AS nombre,
                        u.cedula,
                        u.es_becado,
                        u.porcentaje_beca,
                        u.carrera_id,
                        u.convenio_activo,
                        u.fecha_limite_convenio,
                        c.nombre AS carrera,
                        c.precio_credito,
                        c.dias_gracia_pago,
                        COUNT(i.id) AS insc_pendientes,
                        SUM(
                            m.creditos * c.precio_credito *
                            (1 - COALESCE(u.porcentaje_beca, 0) / 100.0)
                        ) AS deuda_calculada,
                        MAX(i.fecha_inscripcion) AS ultima_inscripcion
                    FROM public.usuarios u
                    JOIN public.inscripciones i ON i.estudiante_id = u.id AND i.pago_id IS NULL
                    JOIN public.secciones s ON i.seccion_id = s.id
                    JOIN public.materias m ON s.materia_id = m.id
                    JOIN public.carreras c ON u.carrera_id = c.id
                    WHERE u.rol = 'estudiante'
                    GROUP BY u.id, c.nombre, c.precio_credito, c.dias_gracia_pago
                    ORDER BY deuda_calculada DESC
                    """
                )
                con_deuda = [dict(r) for r in con_deuda_rows]

                if periodo:
                    periodo_id = periodo["id"]
                    try:
                        fecha_inicio_actual = date.fromisoformat(periodo["fecha_inicio"])
                    except Exception:
                        fecha_inicio_actual = date.today()
                else:
                    periodo_id = None
                    fecha_inicio_actual = date.today()

                mora_lista = []
                deuda_total_inst = Decimal("0")

                for est in con_deuda:
                    deuda_calc = Decimal(str(est.get("deuda_calculada") or 0))
                    deuda_total_inst += deuda_calc

                    en_mora = False
                    if est.get("convenio_activo"):
                        flc = est.get("fecha_limite_convenio")
                        if flc:
                            flc_date = (
                                date.fromisoformat(str(flc)[:10])
                                if isinstance(flc, (str, datetime))
                                else flc
                            )
                            en_mora = flc_date < date.today()
                        else:
                            en_mora = False
                    else:
                        insc_rows = await conn.fetch(
                            """
                            SELECT s.periodo_id, i.fecha_inscripcion, pl.fecha_fin
                            FROM public.inscripciones i
                            JOIN public.secciones s ON i.seccion_id = s.id
                            JOIN public.periodos_lectivos pl ON s.periodo_id = pl.id
                            WHERE i.estudiante_id = $1 AND i.pago_id IS NULL
                            """,
                            est["id"],
                        )
                        dias_gracia = est.get("dias_gracia_pago") or 10
                        for ir in insc_rows:
                            fecha_fin_p = ir["fecha_fin"]
                            if isinstance(fecha_fin_p, (str,)):
                                fecha_fin_p = date.fromisoformat(str(fecha_fin_p)[:10])
                            if fecha_fin_p < fecha_inicio_actual:
                                en_mora = True
                                break
                            if periodo_id and ir["periodo_id"] == periodo_id:
                                fi = ir["fecha_inscripcion"]
                                if fi:
                                    if isinstance(fi, str):
                                        fi = datetime.fromisoformat(fi)
                                    limite = datetime.now() - timedelta(days=dias_gracia)
                                    if fi < limite:
                                        en_mora = True
                                        break

                    if en_mora:
                        mora_lista.append(
                            {
                                "nombre": est["nombre"],
                                "cedula": est.get("cedula"),
                                "carrera": est.get("carrera"),
                                "deuda_usd": round(_f(deuda_calc), 2),
                                "materias_pendientes": est["insc_pendientes"],
                                "convenio": bool(est.get("convenio_activo")),
                            }
                        )

                mora_lista.sort(key=lambda x: x["deuda_usd"], reverse=True)
                recaudado = _f(kpis_row["recaudado"])
                total_proy = recaudado + _f(deuda_total_inst)
                tasa = round(recaudado / total_proy * 100, 1) if total_proy > 0 else 0.0

                ingresos_rows = await conn.fetch(
                    """
                    SELECT pl.nombre, pl.codigo, pl.activo,
                           COALESCE(SUM(p.monto),0) as recaudado,
                           COUNT(CASE WHEN p.estado='completado' THEN 1 END) as completados,
                           COUNT(CASE WHEN p.estado='pendiente' THEN 1 END) as pendientes
                    FROM public.periodos_lectivos pl
                    LEFT JOIN public.pagos p ON p.periodo_id = pl.id
                    GROUP BY pl.id, pl.nombre, pl.codigo, pl.activo
                    ORDER BY pl.codigo DESC LIMIT 5
                    """
                )
                ingresos_periodos = [
                    {
                        "periodo": r["nombre"],
                        "activo": r.get("activo", False),
                        "recaudado_usd": _f(r["recaudado"]),
                        "completados": r["completados"],
                        "pendientes": r["pendientes"],
                    }
                    for r in ingresos_rows
                ]

                ctx.update(
                    {
                        "kpis": {
                            "recaudado_total_usd": recaudado,
                            "deuda_real_institucional_usd": round(
                                _f(deuda_total_inst), 2
                            ),
                            "tasa_cobranza_pct": tasa,
                            "pagos_completados": kpis_row["completados"],
                            "pagos_pendientes": kpis_row["pendientes"],
                        },
                        "mora": {
                            "total_en_mora": len(mora_lista),
                            "deuda_total_mora_usd": round(
                                sum(e["deuda_usd"] for e in mora_lista), 2
                            ),
                            "listado": mora_lista[:15],
                        },
                        "ingresos_por_periodo": ingresos_periodos,
                    }
                )

            elif rol in ("director", "coordinador", "administrativo"):
                # Run 3 independent queries in parallel using separate DB connections
                async def _fetch_stats():
                    async with get_db() as c:
                        row = await c.fetchrow(
                            """
                            SELECT
                                (SELECT COUNT(*) FROM public.usuarios WHERE rol='estudiante') as estudiantes,
                                (SELECT COUNT(*) FROM public.usuarios WHERE rol='profesor') as profesores,
                                (SELECT COUNT(*) FROM public.materias) as materias,
                                (SELECT COUNT(*) FROM public.secciones) as secciones,
                                (SELECT ROUND(COALESCE(AVG(nota_final),0)::numeric,2)
                                 FROM public.inscripciones WHERE nota_final IS NOT NULL) as promedio_inst,
                                (SELECT COALESCE(SUM(monto),0) FROM public.pagos
                                 WHERE estado='completado') as recaudado_total,
                                (SELECT COUNT(*) FROM public.inscripciones
                                 WHERE estado='activo') as inscripciones_activas
                            """
                        )
                        return dict(row or {})

                async def _fetch_por_carrera():
                    async with get_db() as c:
                        rows = await c.fetch(
                            """
                            SELECT c.nombre, COUNT(u.id) as alumnos
                            FROM public.carreras c
                            LEFT JOIN public.usuarios u ON u.carrera_id = c.id AND u.rol='estudiante'
                            GROUP BY c.id, c.nombre ORDER BY alumnos DESC
                            """
                        )
                        return [{"carrera": r["nombre"], "alumnos": r["alumnos"]} for r in rows]

                async def _fetch_con_deuda():
                    async with get_db() as c:
                        rows = await c.fetch(
                            """
                            SELECT COUNT(*) as con_deuda
                            FROM public.usuarios u
                            JOIN public.inscripciones i ON i.estudiante_id = u.id
                                AND i.pago_id IS NULL
                            WHERE u.rol = 'estudiante'
                            GROUP BY u.id
                            """
                        )
                        return len(rows)

                stats, por_carrera, con_deuda_count = await asyncio.gather(
                    _fetch_stats(), _fetch_por_carrera(), _fetch_con_deuda()
                )

                ctx.update(
                    {
                        "estadisticas": {
                            "total_estudiantes": stats["estudiantes"],
                            "total_profesores": stats["profesores"],
                            "total_materias": stats["materias"],
                            "total_secciones": stats["secciones"],
                            "promedio_institucional": _f(stats["promedio_inst"]),
                            "recaudado_total_usd": _f(stats["recaudado_total"]),
                            "inscripciones_activas": stats["inscripciones_activas"],
                            "estudiantes_con_deuda": con_deuda_count,
                        },
                        "distribucion_por_carrera": por_carrera,
                    }
                )

        return ctx

    except Exception as e:
        logger.error(f"Error en /ia/contexto: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener contexto de IA")


# ─── System prompt ────────────────────────────────────────────────────────────

def _build_system_prompt(nombre: str, rol: str, contexto: dict) -> str:
    hoy = date.today().isoformat()

    rol_instrucciones: dict = {
        "estudiante": """
ERES EL ASISTENTE PERSONAL DE ESTE ESTUDIANTE. Puedes responder sobre:
- Notas finales y parciales por materia y período
- Materias inscritas, horarios, aulas y profesores
- Estado de cuenta: deuda total, pagos, mora, convenios, fechas de gracia
- Asistencia: porcentaje, faltas, tardanzas, riesgo de pérdida por inasistencia
- Perfil: semestre, carrera, créditos aprobados, beca
- Historial académico completo""",

        "profesor": """
ERES EL ASISTENTE DEL PROFESOR. Puedes responder sobre:
- Secciones y materias asignadas (activas e históricas)
- Lista de alumnos por sección con notas y estado
- Estadísticas: promedio, aprobados, reprobados por sección
- Horarios y aulas""",

        "tesorero": """
ERES EL ASISTENTE DE TESORERÍA. Puedes responder sobre:
- KPIs financieros: recaudado, deuda real institucional, tasa de cobranza
- Estudiantes en mora con montos exactos y estado de convenio
- Ingresos recaudados por período
- Pagos completados vs pendientes""",

        "director": """
ERES EL ASISTENTE DE DIRECCIÓN. Puedes responder sobre:
- Estadísticas institucionales: estudiantes, profesores, materias, secciones
- Promedio institucional y recaudación total
- Distribución de estudiantes por carrera
- Inscripciones activas y estudiantes con deuda
- Período académico activo""",

        "coordinador": """
ERES EL ASISTENTE DE COORDINACIÓN. Puedes responder sobre:
- Estadísticas académicas institucionales
- Distribución de estudiantes por carrera
- Promedio institucional""",

        "administrativo": """
ERES EL ASISTENTE ADMINISTRATIVO. Responde sobre estadísticas generales de la institución.""",
    }

    instruccion = rol_instrucciones.get(rol, "Responde consultas generales sobre InfoCampus.")
    ctx_str = json.dumps(contexto, ensure_ascii=False, default=str, indent=2)

    return f"""Eres Eva, asistente académica inteligente de InfoCampus ERP. Hoy es {hoy}.
Atiendes a: {nombre} ({rol.upper()}).

IDENTIDAD:
Eres la colega más inteligente del sistema. No eres un bot de FAQ. Analizas, calculas, comparas y das recomendaciones basadas en datos reales. Hablas como una persona real — directa, cálida, precisa.

REGLAS ABSOLUTAS:
- Responde SIEMPRE en español, de forma natural y directa.
- NUNCA inventes datos. Solo usa los datos del contexto que recibes abajo.
- Si un dato no está en el contexto, di: "No tengo ese dato disponible en este momento."
- No uses términos técnicos como "null", "undefined", "array". Usa lenguaje natural.
- Para listas usa saltos de línea simples, sin markdown complejo.
- Notas: formato → Materia: X.X (Estado)
- Montos: formato → $X.XX

CÓMO RAZONAS:
- Cuando te pregunten por datos, no solo los repites — los INTERPRETAS.
  Ejemplo: si la asistencia es 68%, no digas solo "tu asistencia es 68%". Di "tu asistencia es 68%, estás por debajo del mínimo requerido del 75%. Corres riesgo de perder la materia."
- Cuando hay múltiples datos relacionados, los CONECTAS.
- Cuando detectas algo preocupante (mora, riesgo académico, baja asistencia), lo mencionas proactivamente.
- Si te piden un resumen general, das un análisis ejecutivo con los puntos más importantes.

FORMATO:
- Respuestas cortas para preguntas simples (1-3 líneas).
- Respuestas largas y detalladas cuando el usuario pide análisis o comparaciones.
- Nunca termines con "¿hay algo más en lo que pueda ayudarte?"
- No empieces con "¡Claro!", "Por supuesto", "Entendido". Ve directo al punto.
{instruccion}

════════════════════════════════════════
DATOS EN TIEMPO REAL ({hoy}):
════════════════════════════════════════
{ctx_str}
════════════════════════════════════════"""


# ─── Chat endpoint ────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat_ia(
    body: _ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Mensaje vacío.")

    groq_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        raise HTTPException(
            status_code=503,
            detail="API de IA no configurada. Contacta al administrador.",
        )

    # Reutilizar la lógica de contexto ya existente — fallback a contexto vacío si falla
    try:
        contexto = await obtener_contexto(current_user=current_user)
    except Exception:
        contexto = {}

    # Obtener nombre del usuario para el system prompt
    rol = current_user.get("rol", "")
    nombre = (
        current_user.get("nombre")
        or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
    )
    if not nombre:
        try:
            async with get_db() as conn:
                row = await conn.fetchrow(
                    "SELECT first_name || ' ' || last_name AS nombre FROM public.usuarios WHERE id = $1",
                    current_user["id"],
                )
                nombre = row["nombre"] if row else "Usuario"
        except Exception:
            nombre = "Usuario"

    system_prompt = _build_system_prompt(nombre, rol, contexto)

    mensajes: list = [{"role": "system", "content": system_prompt}]
    for m in (body.history or [])[-20:]:
        if isinstance(m, dict):
            mensajes.append({"role": m.get("role"), "content": m.get("content")})
        else:
            mensajes.append({"role": m.role, "content": m.content})
    mensajes.append({"role": "user", "content": body.message.strip()})

    try:
        client = AsyncGroq(api_key=groq_key)
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=mensajes,
            temperature=0.2,
            max_tokens=4000,
        )
        respuesta = completion.choices[0].message.content or "No pude generar una respuesta."
        return {"response": respuesta}
    except Exception as e:
        err = str(e)
        logger.error(f"Error en Groq API: {err}")
        if "401" in err or "invalid_api_key" in err or "authentication" in err.lower():
            raise HTTPException(status_code=503, detail="Clave de IA inválida. Verifica GROQ_API_KEY en backend/.env y reinicia el backend.")
        if "429" in err or "rate_limit" in err or "quota" in err.lower():
            raise HTTPException(status_code=503, detail="Límite de uso de IA alcanzado. Espera unos minutos o genera una nueva clave en console.groq.com")
        if "model" in err.lower() and ("not found" in err.lower() or "does not exist" in err.lower()):
            raise HTTPException(status_code=503, detail="Modelo de IA no disponible. Contacta al administrador.")
        raise HTTPException(status_code=503, detail=f"Error al contactar el servicio de IA: {err[:120]}")