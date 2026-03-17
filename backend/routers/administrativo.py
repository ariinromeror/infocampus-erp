from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from decimal import Decimal
import logging
from passlib.context import CryptContext

from auth.dependencies import require_roles
from database import get_db

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

router = APIRouter(
    prefix="/administrativo",
    tags=["Administrativo"],
    responses={401: {"description": "No autorizado"}, 403: {"description": "Prohibido"}}
)


class InscripcionRequest(BaseModel):
    estudiante_id: int
    seccion_id: int
    generar_pago: bool = True


class PrimeraMatriculaRequest(BaseModel):
    first_name: str = Field(..., description="Nombre(s) del estudiante")
    last_name: str = Field(..., description="Apellido(s) del estudiante")
    cedula: str = Field(..., description="Cédula de identidad")
    email: str = Field(..., description="Email del estudiante")
    carrera_id: int = Field(..., description="ID de la carrera")
    metodo_pago: str = Field(..., description="efectivo, transferencia, tarjeta_debito, tarjeta_credito")
    referencia: Optional[str] = Field(None, description="Número de transacción (opcional)")
    valor_inscripcion: float = Field(50.0, description="Valor fijo de inscripción")
    creditos: int = Field(..., description="Número de créditos del primer período")
    precio_credito: float = Field(..., description="Precio por crédito de la carrera")
    es_becado: bool = False
    porcentaje_beca: int = 0


class UsuarioCreateRequest(BaseModel):
    cedula: str
    email: str
    first_name: str
    last_name: str
    password: str
    rol: str
    carrera_id: Optional[int] = None
    es_becado: bool = False
    porcentaje_beca: int = 0
    titulo_academico: Optional[str] = None
    especialidad: Optional[str] = None


class UsuarioUpdateRequest(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    carrera_id: Optional[int] = None
    es_becado: Optional[bool] = None
    porcentaje_beca: Optional[int] = None
    semestre_actual: Optional[int] = None
    activo: Optional[bool] = None
    convenio_activo: Optional[bool] = None
    fecha_limite_convenio: Optional[str] = None


@router.post("/inscribir-estudiante", summary="Inscribir estudiante a sección")
async def inscribir_estudiante(
    data: InscripcionRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['administrativo', 'director', 'admin', 'coordinador']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow("SELECT id, rol FROM public.usuarios WHERE id = $1", data.estudiante_id)
            if not estudiante or estudiante['rol'] != 'estudiante':
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            seccion = await conn.fetchrow("SELECT id, cupo_maximo, cupo_actual FROM public.secciones WHERE id = $1", data.seccion_id)
            if not seccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sección no encontrada")

            if seccion['cupo_actual'] >= seccion['cupo_maximo']:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sección sin cupo disponible")

            if await conn.fetchrow("SELECT id FROM public.inscripciones WHERE estudiante_id = $1 AND seccion_id = $2",
                       data.estudiante_id, data.seccion_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estudiante ya inscrito en esta sección")

            pago_id = None
            monto = Decimal('0.00')
            if data.generar_pago:
                est = dict(await conn.fetchrow("""
                    SELECT u.es_becado, u.porcentaje_beca, u.carrera_id, c.precio_credito
                    FROM public.usuarios u
                    LEFT JOIN public.carreras c ON u.carrera_id = c.id
                    WHERE u.id = $1
                """, data.estudiante_id))

                materia_info = dict(await conn.fetchrow("""
                    SELECT m.creditos, s.periodo_id
                    FROM public.secciones s
                    JOIN public.materias m ON s.materia_id = m.id
                    WHERE s.id = $1
                """, data.seccion_id))

                creditos = Decimal(str(materia_info['creditos']))
                precio_credito = Decimal(str(est.get('precio_credito') or 50))
                monto = creditos * precio_credito

                if est.get('es_becado') and est.get('porcentaje_beca', 0) > 0:
                    porcentaje = Decimal(str(est['porcentaje_beca']))
                    monto -= monto * (porcentaje / Decimal('100'))

                pago_row = await conn.fetchrow("""
                    INSERT INTO public.pagos (estudiante_id, monto, metodo_pago, fecha_pago, estado, periodo_id, concepto)
                    VALUES ($1, $2, 'pendiente', NOW(), 'pendiente', $3, 'Inscripción')
                    RETURNING id
                """, data.estudiante_id, monto, materia_info['periodo_id'])
                pago_id = pago_row['id']

            insc_row = await conn.fetchrow("""
                INSERT INTO public.inscripciones (estudiante_id, seccion_id, pago_id, estado)
                VALUES ($1, $2, $3, 'activo')
                RETURNING id
            """, data.estudiante_id, data.seccion_id, pago_id)
            inscripcion_id = insc_row['id']

            await conn.execute("UPDATE public.secciones SET cupo_actual = cupo_actual + 1 WHERE id = $1", data.seccion_id)

        return {
            "message": "Estudiante inscrito exitosamente",
            "inscripcion_id": inscripcion_id,
            "pago_id": pago_id,
            "monto": float(monto)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inscribiendo estudiante: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/usuarios", summary="Listar usuarios del sistema")
async def listar_usuarios(
    rol: Optional[str] = None,
    activo: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_roles(['administrativo', 'director', 'admin', 'coordinador']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            filtros = []
            params = []
            idx = 1
            if rol:
                filtros.append(f"u.rol = ${idx}")
                params.append(rol)
                idx += 1
            if activo is not None:
                filtros.append(f"u.activo = ${idx}")
                params.append(activo)
                idx += 1

            where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

            total_row = await conn.fetchrow(f"SELECT COUNT(*) as total FROM public.usuarios u {where}", *params)
            total = total_row['total']

            param_count = len(params)
            data_params = params + [limit, (page - 1) * limit]
            rows = await conn.fetch(f"""
                SELECT u.id, u.cedula, u.email, u.first_name, u.last_name,
                    u.rol, u.activo, u.carrera_id, c.nombre as carrera_nombre
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                {where}
                ORDER BY u.rol, u.last_name
                LIMIT ${param_count + 1} OFFSET ${param_count + 2}
            """, *data_params)

            usuarios = []
            for row in rows:
                r = dict(row)
                usuarios.append({
                    "id":      r['id'],
                    "cedula":  r['cedula'],
                    "email":   r['email'],
                    "nombre":  f"{r['first_name']} {r['last_name']}",
                    "rol":     r['rol'],
                    "activo":  r['activo'],
                    "carrera": r['carrera_nombre']
                })

        return {
            "data": {
                "usuarios":    usuarios,
                "total":       total,
                "page":        page,
                "total_pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        logger.error(f"Error listando usuarios: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/usuarios", summary="Crear nuevo usuario")
async def crear_usuario(
    data: UsuarioCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'coordinador', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            cur = conn.cursor()

            cur.execute("SELECT id FROM public.usuarios WHERE cedula = %s OR email = %s", (data.cedula, data.email))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario ya existe (cédula o email duplicado)")

            password_hash = pwd_context.hash(data.password)
            username = data.email.split('@')[0] + '_' + data.cedula[-4:]

            row = await conn.fetchrow("""
                INSERT INTO public.usuarios
                (username, cedula, email, first_name, last_name, password_hash, rol, carrera_id,
                 es_becado, porcentaje_beca, titulo_academico, especialidad, activo, semestre_actual)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, 1)
                RETURNING id
            """, username, data.cedula, data.email, data.first_name, data.last_name,
                password_hash, data.rol, data.carrera_id, data.es_becado,
                data.porcentaje_beca, data.titulo_academico, data.especialidad)

            usuario_id = row['id']

        return {"message": "Usuario creado exitosamente", "id": usuario_id, "usuario_id": usuario_id, "cedula": data.cedula}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando usuario: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.put("/usuarios/{usuario_id}", summary="Actualizar usuario")
async def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'admin', 'coordinador', 'tesorero', 'administrativo']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if not await conn.fetchrow("SELECT id FROM public.usuarios WHERE id = $1", usuario_id):
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

            updates = []
            params = []

            field_map = {
                'email': data.email,
                'first_name': data.first_name,
                'last_name': data.last_name,
                'carrera_id': data.carrera_id,
                'semestre_actual': data.semestre_actual,
            }
            idx = 1
            for col, val in field_map.items():
                if val is not None:
                    updates.append(f"{col} = ${idx}")
                    params.append(val)
                    idx += 1

            bool_fields = {
                'es_becado': data.es_becado,
                'porcentaje_beca': data.porcentaje_beca,
                'activo': data.activo,
                'convenio_activo': data.convenio_activo,
                'fecha_limite_convenio': data.fecha_limite_convenio,
            }
            for col, val in bool_fields.items():
                if val is not None:
                    updates.append(f"{col} = ${idx}")
                    params.append(val)
                    idx += 1

            if not updates:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

            params.append(usuario_id)
            await conn.execute(f"UPDATE public.usuarios SET {', '.join(updates)} WHERE id = ${idx}", *params)

        return {"message": "Usuario actualizado exitosamente"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando usuario: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/primera-matricula", summary="Crear estudiante y registrar pago de primera matrícula")
async def registrar_primera_matricula(
    data: PrimeraMatriculaRequest,
    current_user: Dict[str, Any] = Depends(require_roles(['administrativo', 'director', 'admin', 'coordinador']))
) -> Dict[str, Any]:
    try:
        async with get_db() as conn:
            if await conn.fetchrow("SELECT id FROM public.usuarios WHERE cedula = $1 OR email = $2", data.cedula, data.email):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un usuario con esa cédula o email")

            carrera = await conn.fetchrow("SELECT id, nombre, precio_credito FROM public.carreras WHERE id = $1", data.carrera_id)
            if not carrera:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carrera no encontrada")

            import random, string
            password_temp = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            password_hash = pwd_context.hash(password_temp)
            username = f"{data.email.split('@')[0]}_{data.cedula[-4:]}"

            est_row = await conn.fetchrow("""
                INSERT INTO public.usuarios
                (username, cedula, email, first_name, last_name, password_hash, rol, carrera_id,
                 es_becado, porcentaje_beca, activo, semestre_actual)
                VALUES ($1, $2, $3, $4, $5, $6, 'estudiante', $7, $8, $9, true, 1)
                RETURNING id
            """, username, data.cedula, data.email, data.first_name, data.last_name,
                password_hash, data.carrera_id, data.es_becado, data.porcentaje_beca)
            estudiante_id = est_row['id']

            monto_creditos = Decimal(str(data.creditos)) * Decimal(str(data.precio_credito))
            monto_total = Decimal(str(data.valor_inscripcion)) + monto_creditos

            if data.es_becado and data.porcentaje_beca > 0:
                descuento = monto_total * Decimal(str(data.porcentaje_beca)) / Decimal('100')
                monto_total -= descuento

            periodo = await conn.fetchrow("SELECT id FROM public.periodos_lectivos WHERE activo = true LIMIT 1")
            periodo_id = periodo['id'] if periodo else None

            pago_row = await conn.fetchrow("""
                INSERT INTO public.pagos
                (estudiante_id, monto, metodo_pago, fecha_pago, estado, referencia, concepto, periodo_id)
                VALUES ($1, $2, $3, NOW(), 'completado', $4, $5, $6)
                RETURNING id
            """, estudiante_id, monto_total, data.metodo_pago, data.referencia,
                f'Primera Matrícula - {data.creditos} créditos - {carrera["nombre"]}',
                periodo_id)
            pago_id = pago_row['id']

        return {
            "message": "Primera matrícula registrada exitosamente",
            "estudiante": {
                "id":      estudiante_id,
                "nombre":  f"{data.first_name} {data.last_name}",
                "cedula":  data.cedula,
                "email":   data.email,
                "carrera": carrera['nombre'],
            },
            "pago": {
                "id":              pago_id,
                "total_pagado":    float(monto_total),
                "metodo_pago":     data.metodo_pago,
                "referencia":      data.referencia,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando primera matrícula: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
