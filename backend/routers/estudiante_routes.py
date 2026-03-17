from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
import logging
import json
from datetime import datetime, timedelta

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/estudiante",
    tags=["Estudiante"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}}
)


@router.get("/{user_id}/horario", summary="Horario semanal del estudiante")
async def horario_estudiante(
    user_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['estudiante', 'director', 'admin', 'coordinador', 'administrativo']))
) -> Dict[str, Any]:
    if current_user['rol'] == 'estudiante' and current_user['id'] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")

    try:
        async with get_db() as conn:
            clases = await conn.fetch("""
                SELECT 
                    m.nombre as materia,
                    m.codigo as materia_codigo,
                    s.codigo as seccion,
                    s.aula,
                    s.horario,
                    u.first_name || ' ' || u.last_name as profesor,
                    p.nombre as periodo
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.usuarios u ON s.docente_id = u.id
                WHERE i.estudiante_id = $1 AND p.activo = true
                ORDER BY m.nombre
            """, user_id)

        horario_semanal = {
            "Lunes": [],
            "Martes": [],
            "Miércoles": [],
            "Jueves": [],
            "Viernes": [],
            "Sábado": []
        }

        for clase in clases:
            c = dict(clase)
            horario_data = c.get('horario') or {}
            if isinstance(horario_data, str):
                try:
                    horario_data = json.loads(horario_data)
                except Exception:
                    horario_data = {}

            dias = horario_data.get('dias', [])
            hora_inicio = horario_data.get('hora_inicio', '')
            hora_fin = horario_data.get('hora_fin', '')

            evento = {
                "materia": c['materia'],
                "materia_codigo": c['materia_codigo'],
                "seccion": c['seccion'],
                "aula": c['aula'],
                "profesor": c['profesor'],
                "hora_inicio": hora_inicio,
                "hora_fin": hora_fin
            }

            for dia in dias:
                if dia in horario_semanal:
                    horario_semanal[dia].append(evento)

        for dia in horario_semanal:
            horario_semanal[dia].sort(key=lambda x: x.get('hora_inicio', ''))

        return {"data": {"horario": horario_semanal}}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo horario: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))