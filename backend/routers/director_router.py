"""
Router exclusivo del Director
- GET /director/historial-notas   → Auditoría de correcciones de notas
- GET /director/configuracion      → Listar parámetros institucionales
- PUT /director/configuracion/{clave} → Actualizar parámetro
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/director",
    tags=["Director"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Solo Director"}},
)


class ConfiguracionUpdateRequest(BaseModel):
    clave: str
    valor: str


# ─────────────────────────────────────────────────────────────────
# HISTORIAL DE CORRECCIONES DE NOTAS
# ─────────────────────────────────────────────────────────────────

@router.get("/historial-notas", summary="Historial de correcciones de notas")
async def historial_notas(
    page: int = 1,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_roles(["director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            total_row = await conn.fetchrow("SELECT COUNT(*) as total FROM public.historial_notas")
            total = total_row["total"]

            rows = await conn.fetch("""
                SELECT
                    hn.id,
                    hn.inscripcion_id,
                    hn.estudiante_nombre,
                    hn.nota_anterior,
                    hn.nota_nueva,
                    hn.motivo,
                    hn.fecha_modificacion,
                    u.first_name || ' ' || u.last_name AS modificado_por_nombre,
                    hn.modificado_por
                FROM public.historial_notas hn
                LEFT JOIN public.usuarios u ON hn.modificado_por = u.id::TEXT
                ORDER BY hn.fecha_modificacion DESC
                LIMIT $1 OFFSET $2
            """, limit, (page - 1) * limit)

            registros = []
            for row in rows:
                r = dict(row)
                registros.append({
                    "id":                    r["id"],
                    "inscripcion_id":        r["inscripcion_id"],
                    "estudiante_nombre":     r["estudiante_nombre"],
                    "nota_anterior":         float(r["nota_anterior"]) if r["nota_anterior"] is not None else None,
                    "nota_nueva":            float(r["nota_nueva"])    if r["nota_nueva"]    is not None else None,
                    "motivo":                r["motivo"],
                    "modificado_por":        r["modificado_por"],
                    "modificado_por_nombre": r["modificado_por_nombre"],
                    "fecha_modificacion":    r["fecha_modificacion"].isoformat() if r["fecha_modificacion"] else None,
                })

        return {
            "data": {
                "registros":   registros,
                "total":       total,
                "page":        page,
                "total_pages": max(1, -(-total // limit)),  # ceil division
            }
        }

    except Exception as e:
        logger.error(f"Error obteniendo historial notas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────
# CONFIGURACIÓN INSTITUCIONAL
# ─────────────────────────────────────────────────────────────────

@router.get("/configuracion", summary="Listar configuración institucional")
async def listar_configuracion(
    current_user: Dict[str, Any] = Depends(require_roles(["director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            rows = await conn.fetch("SELECT clave, valor, descripcion, actualizado_en FROM public.configuracion_ia ORDER BY clave")
            config = {r["clave"]: r["valor"] for r in rows}

        return {"data": {"configuracion": config}}

    except Exception as e:
        logger.error(f"Error obteniendo configuración: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/configuracion/{clave}", summary="Actualizar parámetro de configuración")
async def actualizar_configuracion(
    clave: str,
    data: ConfiguracionUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(["director", "admin"]))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            await conn.execute("""
                INSERT INTO public.configuracion_ia (clave, valor, actualizado_en)
                VALUES ($1, $2, NOW())
                ON CONFLICT (clave) DO UPDATE
                SET valor = EXCLUDED.valor, actualizado_en = NOW()
            """, clave, data.valor)

        logger.info(f"Director {current_user['cedula']} actualizó config: {clave} = {data.valor}")

        return {
            "message": f"Configuración '{clave}' actualizada",
            "clave":   clave,
            "valor":   data.valor,
        }

    except Exception as e:
        logger.error(f"Error actualizando configuración: {e}")
        raise HTTPException(status_code=500, detail=str(e))