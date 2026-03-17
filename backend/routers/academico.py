from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import logging
import json
import unicodedata
from datetime import date

from auth.dependencies import require_roles, get_current_user
from database import get_db

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """Normaliza texto quitando tildes y acentos"""
    if not text:
        return ''
    # Normalizar unicode y quitar tildes
    normalized = unicodedata.normalize('NFD', text)
    return ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')

router = APIRouter(
    prefix="/academico",
    tags=["Academico"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}}
)


class SeccionCreateRequest(BaseModel):
    materia_id: int
    periodo_id: int
    docente_id: Optional[int] = None
    codigo: str
    cupo_maximo: int
    aula: str
    horario: Dict[str, Any]


class SeccionUpdateRequest(BaseModel):
    docente_id: Optional[int] = None
    codigo: Optional[str] = None
    cupo_maximo: Optional[int] = None
    aula: Optional[str] = None
    horario: Optional[Dict[str, Any]] = None


class CarreraUpdateRequest(BaseModel):
    precio_credito: float


class PeriodoCreateRequest(BaseModel):
    nombre: str
    codigo: str
    fecha_inicio: str
    fecha_fin: str
    activo: bool = False


class PeriodoUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    activo: Optional[bool] = None


class NotaCorreccionRequest(BaseModel):
    nota_final: float
    motivo: str


def _parse_horario(horario_raw) -> dict:
    horario_data = horario_raw or {}
    if isinstance(horario_data, str):
        try:
            horario_data = json.loads(horario_data)
        except Exception:
            horario_data = {}
    return horario_data


@router.post("/secciones", summary="Crear nueva sección")
async def crear_seccion(
    data: SeccionCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.materias WHERE id = $1", data.materia_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia no encontrada")

            if not await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE id = $1", data.periodo_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Período no encontrado")

            if data.docente_id:
                docente = await conn.fetchrow("SELECT id, rol FROM public.usuarios WHERE id = $1", data.docente_id)
                if not docente or docente['rol'] != 'profesor':
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Docente inválido")

            horario_json = json.dumps(data.horario)

            row = await conn.fetchrow("""
                INSERT INTO public.secciones 
                (materia_id, periodo_id, docente_id, codigo, cupo_maximo, cupo_actual, aula, horario)
                VALUES ($1, $2, $3, $4, $5, 0, $6, $7)
                RETURNING id
            """, data.materia_id, data.periodo_id, data.docente_id,
                data.codigo, data.cupo_maximo, data.aula, horario_json)

            seccion_id = row['id']

        return {
            "message": "Sección creada exitosamente",
            "seccion_id": seccion_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/secciones/{seccion_id}", summary="Actualizar sección")
async def actualizar_seccion(
    seccion_id: int,
    data: SeccionUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.secciones WHERE id = $1", seccion_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

            updates = []
            params = []
            idx = 1

            if data.docente_id:
                docente = await conn.fetchrow("SELECT id, rol FROM public.usuarios WHERE id = $1", data.docente_id)
                if not docente or docente['rol'] != 'profesor':
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Docente inválido")
                updates.append(f"docente_id = ${idx}")
                params.append(data.docente_id)
                idx += 1

            if data.codigo:
                updates.append(f"codigo = ${idx}")
                params.append(data.codigo)
                idx += 1

            if data.cupo_maximo:
                updates.append(f"cupo_maximo = ${idx}")
                params.append(data.cupo_maximo)
                idx += 1

            if data.aula:
                updates.append(f"aula = ${idx}")
                params.append(data.aula)
                idx += 1

            if data.horario:
                updates.append(f"horario = ${idx}")
                params.append(json.dumps(data.horario))
                idx += 1

            if not updates:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

            params.append(seccion_id)
            await conn.execute(f"""
                UPDATE public.secciones 
                SET {', '.join(updates)}
                WHERE id = ${idx}
            """, *params)

        return {"message": "Sección actualizada exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/periodos", summary="Crear nuevo período lectivo")
async def crear_periodo(
    data: PeriodoCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'admin', 'coordinador', 'tesorero']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE codigo = $1", data.codigo):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un período con este código")

            if data.activo:
                await conn.execute("UPDATE public.periodos_lectivos SET activo = false WHERE activo = true")

            row = await conn.fetchrow("""
                INSERT INTO public.periodos_lectivos (nombre, codigo, fecha_inicio, fecha_fin, activo)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """, data.nombre, data.codigo, data.fecha_inicio, data.fecha_fin, data.activo)

            periodo_id = row['id']

        return {
            "message": "Período lectivo creado exitosamente",
            "periodo_id": periodo_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando período: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/periodos/{periodo_id}", summary="Actualizar período lectivo")
async def actualizar_periodo(
    periodo_id: int,
    data: PeriodoUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'admin', 'coordinador', 'tesorero']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE id = $1", periodo_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Período no encontrado")

            if data.activo:
                await conn.execute("UPDATE public.periodos_lectivos SET activo = false WHERE activo = true")

            updates = []
            params = []
            idx = 1

            if data.nombre:
                updates.append(f"nombre = ${idx}")
                params.append(data.nombre)
                idx += 1
            if data.fecha_inicio:
                updates.append(f"fecha_inicio = ${idx}")
                params.append(data.fecha_inicio)
                idx += 1
            if data.fecha_fin:
                updates.append(f"fecha_fin = ${idx}")
                params.append(data.fecha_fin)
                idx += 1
            if data.activo is not None:
                updates.append(f"activo = ${idx}")
                params.append(data.activo)
                idx += 1

            if not updates:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

            params.append(periodo_id)
            await conn.execute(f"""
                UPDATE public.periodos_lectivos 
                SET {', '.join(updates)}
                WHERE id = ${idx}
            """, *params)

        return {"message": "Período actualizado exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando período: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/inscripciones/{inscripcion_id}/corregir-nota", summary="Corregir nota (solo coordinador)")
async def corregir_nota(
    inscripcion_id: int,
    data: NotaCorreccionRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            inscripcion = await conn.fetchrow("""
                SELECT i.*, u.first_name, u.last_name
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                WHERE i.id = $1
            """, inscripcion_id)

            if not inscripcion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada")

            insc = dict(inscripcion)
            nota_anterior = insc.get('nota_final')

            await conn.execute("""
                INSERT INTO public.historial_notas 
                (inscripcion_id, estudiante_nombre, nota_anterior, nota_nueva, modificado_por, motivo)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, inscripcion_id,
                f"{insc['first_name']} {insc['last_name']}",
                nota_anterior,
                data.nota_final,
                current_user['id'],
                data.motivo)

            nuevo_estado = 'aprobado' if data.nota_final >= 7.0 else 'reprobado'

            await conn.execute("""
                UPDATE public.inscripciones
                SET nota_final = $1, estado = $2
                WHERE id = $3
            """, data.nota_final, nuevo_estado, inscripcion_id)

        return {
            "message": "Nota corregida y registrada en historial",
            "nota_anterior": float(nota_anterior) if nota_anterior else None,
            "nota_nueva": data.nota_final,
            "estado": nuevo_estado,
            "corregido_por": f"{current_user['first_name']} {current_user['last_name']}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error corrigiendo nota: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/carreras", summary="Listar carreras")
async def listar_carreras(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            """)
            carreras = []
            for row in rows:
                r = dict(row)
                carreras.append({
                    "id": r['id'],
                    "nombre": r['nombre'],
                    "codigo": r['codigo'],
                    "duracion_semestres": r['duracion_semestres'],
                    "creditos_totales": r['creditos_totales'],
                    "precio_credito": float(r['precio_credito']),
                    "dias_gracia_pago": r['dias_gracia_pago'],
                    "descripcion": r['descripcion'],
                    "total_estudiantes": r['total_estudiantes'],
                    "total_materias": r['total_materias']
                })
            return {"data": {"carreras": carreras}}
    except Exception as e:
        logger.error(f"Error listando carreras: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/carreras/{carrera_id}", summary="Actualizar carrera (precio_credito)")
async def actualizar_carrera(
    carrera_id: int,
    data: CarreraUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero', 'director', 'coordinador', 'admin']))
) -> Dict[str, Any]:
    """Actualiza precio_credito de una carrera."""
    try:
        precio = float(data.precio_credito)
        if precio < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="precio_credito debe ser >= 0")
        async with get_db() as conn:
            row = await conn.fetchrow(
                "UPDATE public.carreras SET precio_credito = $1 WHERE id = $2 RETURNING id, nombre, precio_credito",
                precio, carrera_id
            )
            if not row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrera no encontrada")
            return {
                "data": {
                    "id": row["id"],
                    "nombre": row["nombre"],
                    "precio_credito": float(row["precio_credito"])
                },
                "message": "Carrera actualizada"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando carrera: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/carreras/{carrera_id}/primer-semestre", summary="Obtener créditos del primer semestre")
async def obtener_primer_semestre(
    carrera_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            carrera = await conn.fetchrow("SELECT id, nombre, precio_credito FROM public.carreras WHERE id = $1", carrera_id)
            if not carrera:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrera no encontrada")
            
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
                    "creditos": row['creditos']
                })
                total_creditos += row['creditos']
            
            return {
                "data": {
                    "carrera": {
                        "id": carrera['id'],
                        "nombre": carrera['nombre'],
                        "precio_credito": float(carrera['precio_credito']) if carrera['precio_credito'] else 0
                    },
                    "semestre": 1,
                    "materias": materias,
                    "total_creditos": total_creditos
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo primer semestre: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/materias", summary="Listar materias")
async def listar_materias(
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            rows = await conn.fetch(f"""
                SELECT m.id, m.nombre, m.codigo, m.creditos, m.semestre,
                    m.carrera_id, m.descripcion, c.nombre as carrera_nombre
                FROM public.materias m
                JOIN public.carreras c ON m.carrera_id = c.id
                {where}
                ORDER BY m.semestre, m.nombre
            """, *params)
            materias = []
            for row in rows:
                r = dict(row)
                materias.append({
                    "id": r['id'],
                    "nombre": r['nombre'],
                    "codigo": r['codigo'],
                    "creditos": r['creditos'],
                    "semestre": r['semestre'],
                    "carrera_id": r['carrera_id'],
                    "carrera": r['carrera_nombre'],
                    "descripcion": r['descripcion']
                })
            return {"data": {"materias": materias}}
    except Exception as e:
        logger.error(f"Error listando materias: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/carreras/{carrera_id}/malla", summary="Obtener malla curricular de una carrera")
async def obtener_malla_curricular(
    carrera_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            carrera = await conn.fetchrow("""
                SELECT id, nombre, creditos_totales, precio_credito, duracion_semestres, descripcion
                FROM public.carreras WHERE id = $1
            """, carrera_id)
            if not carrera:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrera no encontrada")
            
            prereq_rows = await conn.fetch("""
                SELECT p.materia_id, pr.id, pr.codigo, pr.nombre
                FROM public.prerequisitos p
                JOIN public.materias pr ON p.prerequisito_id = pr.id
                JOIN public.materias m  ON p.materia_id = m.id
                WHERE m.carrera_id = $1
            """, carrera_id)
            prereqs_by_materia = {}
            for row in prereq_rows:
                r = dict(row)
                mid = r["materia_id"]
                if mid not in prereqs_by_materia:
                    prereqs_by_materia[mid] = []
                prereqs_by_materia[mid].append({
                    "id": r["id"], "codigo": r["codigo"], "nombre": r["nombre"]
                })

            materia_rows = await conn.fetch("""
                SELECT id, nombre, codigo, creditos, semestre, descripcion
                FROM public.materias
                WHERE carrera_id = $1
                ORDER BY semestre, nombre
            """, carrera_id)

            semestres = {}
            seen_ids = set()
            for row in materia_rows:
                r = dict(row)
                if r['id'] in seen_ids:
                    continue
                seen_ids.add(r['id'])
                semestre = r['semestre']
                if semestre not in semestres:
                    semestres[semestre] = {
                        "numero": semestre,
                        "materias": [],
                        "creditos": 0
                    }
                semestres[semestre]["materias"].append({
                    "id": r['id'],
                    "codigo": r['codigo'],
                    "nombre": r['nombre'],
                    "creditos": r['creditos'],
                    "descripcion": r['descripcion'],
                    "prerrequisitos": prereqs_by_materia.get(r['id'], [])
                })
                semestres[semestre]["creditos"] += r['creditos']
            
            return {
                "data": {
                    "carrera": {
                        "id": carrera['id'],
                        "nombre": carrera['nombre'],
                        "creditos_totales": carrera['creditos_totales'],
                        "precio_credito": float(carrera['precio_credito']) if carrera['precio_credito'] else 0,
                        "duracion_semestres": carrera['duracion_semestres'],
                        "descripcion": carrera['descripcion']
                    },
                    "semestres": list(semestres.values()),
                    "total_creditos": sum(s['creditos'] for s in semestres.values())
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo malla curricular: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/secciones", summary="Listar secciones")
async def listar_secciones(
    periodo_id: Optional[int] = None,
    materia_id: Optional[int] = None,
    docente_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin', 'profesor', 'administrativo', 'tesorero', 'estudiante']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            """, *params)
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
                    "horario": f"{', '.join(dias)} {h.get('hora_inicio', '')}-{h.get('hora_fin', '')}".strip()
                })
            return {"data": {"secciones": secciones}}
    except Exception as e:
        logger.error(f"Error listando secciones: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/periodos", summary="Listar períodos lectivos")
async def listar_periodos(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            rows = await conn.fetch("""
                SELECT id, nombre, codigo, fecha_inicio, fecha_fin, activo
                FROM public.periodos_lectivos
                ORDER BY codigo DESC
            """)
            periodos = []
            for row in rows:
                r = dict(row)
                periodos.append({
                    "id": r['id'],
                    "nombre": r['nombre'],
                    "codigo": r['codigo'],
                    "fecha_inicio": r['fecha_inicio'].isoformat() if r['fecha_inicio'] else None,
                    "fecha_fin": r['fecha_fin'].isoformat() if r['fecha_fin'] else None,
                    "activo": r['activo']
                })
            return {"data": {"periodos": periodos}}
    except Exception as e:
        logger.error(f"Error listando periodos: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/estudiantes", summary="Listar estudiantes")
async def listar_estudiantes(
    q: Optional[str] = None,
    carrera_id: Optional[int] = None,
    semestre: Optional[int] = None,
    es_becado: Optional[bool] = None,
    page: int = 1,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            data_params = params + [limit, (page - 1) * limit]
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
            estudiantes = []
            for row in rows:
                r = dict(row)
                estudiantes.append({
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
                    "convenio_activo": r['convenio_activo']
                })
            return {"data": {"estudiantes": estudiantes, "total": total, "page": page, "total_pages": (total + limit - 1) // limit}}
    except Exception as e:
        logger.error(f"Error listando estudiantes: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/profesores", summary="Listar profesores")
async def listar_profesores(
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
            """)
            profesores = []
            for row in rows:
                r = dict(row)
                profesores.append({
                    "id": r['id'],
                    "nombre": f"{r['first_name']} {r['last_name']}",
                    "cedula": r['cedula'],
                    "email": r['email'],
                    "titulo": r['titulo_academico'],
                    "especialidad": r['especialidad'],
                    "años_experiencia": r['años_experiencia'],
                    "secciones_activas": r['secciones_activas']
                })
            return {"data": {"profesores": profesores}}
    except Exception as e:
        logger.error(f"Error listando profesores: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/secciones/{seccion_id}/estudiantes", summary="Listar estudiantes de una sección")
async def listar_estudiantes_seccion(
    seccion_id: int,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            seccion = await conn.fetchrow("SELECT id, materia_id, codigo FROM public.secciones WHERE id = $1", seccion_id)
            if not seccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

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

            estudiantes = []
            for row in rows:
                r = dict(row)
                estudiantes.append({
                    "id": r['id'],
                    "nombre": f"{r['first_name']} {r['last_name']}",
                    "cedula": r['cedula'],
                    "carrera": r['carrera'] or '—',
                    "inscripcion_id": r['inscripcion_id'],
                    "nota_final": float(r['nota_final']) if r['nota_final'] else None,
                    "estado": r['estado'],
                    "pago_id": r['pago_id'],
                    "pagado": r['pago_id'] is not None
                })

            return {"data": {"estudiantes": estudiantes, "seccion": {"id": seccion['id'], "codigo": seccion['codigo'], "materia_id": seccion['materia_id']}}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando estudiantes de sección: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/profesores/{profesor_id}/rendimiento", summary="Obtener rendimiento de un profesor")
async def obtener_rendimiento_profesor(
    profesor_id: int,
    periodo_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            profesor = await conn.fetchrow("SELECT id, first_name, last_name, email, titulo_academico, especialidad FROM public.usuarios WHERE id = $1 AND rol = 'profesor'", profesor_id)
            if not profesor:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profesor no encontrado")

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

            secciones = []
            for row in seccion_rows:
                r = dict(row)
                secciones.append({
                    "seccion_id": r['seccion_id'],
                    "seccion_codigo": r['seccion_codigo'],
                    "materia": r['materia'],
                    "carrera": r['carrera'],
                    "periodo": r['periodo'],
                    "periodo_id": r['periodo_id'],
                    "total_estudiantes": r['total_estudiantes'] or 0,
                    "promedio_notas": round(float(r['promedio_notas']), 2) if r['promedio_notas'] else None,
                    "estudiantes_aprobados": r['estudiantes_aprobados'] or 0,
                    "estudiantes_reprobados": r['estudiantes_reprobados'] or 0
                })

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

            historial = []
            for row in historial_rows:
                r = dict(row)
                historial.append({
                    "periodo_id": r['periodo_id'],
                    "periodo": r['periodo'],
                    "total_secciones": r['total_secciones'] or 0,
                    "total_inscripciones": r['total_inscripciones'] or 0,
                    "promedio_general": round(float(r['promedio_general']), 2) if r['promedio_general'] else None
                })

            return {
                "data": {
                    "profesor": {
                        "id": profesor['id'],
                        "nombre": f"{profesor['first_name']} {profesor['last_name']}",
                        "email": profesor['email'],
                        "titulo": profesor['titulo_academico'],
                        "especialidad": profesor['especialidad']
                    },
                    "secciones_actuales": secciones,
                    "historial_periodos": historial
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo rendimiento del profesor: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/horarios", summary="Obtener horarios de todas las secciones")
async def obtener_horarios(
    periodo_id: Optional[int] = None,
    carrera_id: Optional[int] = None,
    current_user: Dict[str, Any] = Depends(require_roles(['coordinador', 'director', 'admin', 'administrativo', 'profesor']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
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
                    "cupo_actual": r['cupo_actual']
                })

            return {"data": {"secciones": secciones}}
    except Exception as e:
        logger.error(f"Error obteniendo horarios: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))