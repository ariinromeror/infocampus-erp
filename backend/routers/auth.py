from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from typing import Dict, Any
from passlib.context import CryptContext
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth.schemas import LoginRequest, TokenResponse
from auth.jwt_handler import create_access_token, decode_access_token, revoke_token
from auth.dependencies import get_current_user
from database import get_db

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, headers_enabled=True)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
)

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    },
)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Autenticación de usuarios",
)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, credentials: LoginRequest) -> TokenResponse:
    logger.info(f"🔐 Intento de login: {credentials.username}")

    try:
        async with get_db() as conn:
            user = await conn.fetchrow(
                """
                SELECT u.id, u.cedula, u.password_hash, u.email, u.rol,
                       u.first_name, u.last_name, u.carrera_id,
                       u.es_becado, u.porcentaje_beca,
                       c.nombre as carrera_nombre
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON c.id = u.carrera_id
                WHERE (u.email = $1 OR u.cedula = $2) AND u.activo = true
                """,
                credentials.username,
                credentials.username,
            )
    except Exception as e:
        logger.error(f"❌ Error DB en login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor",
        )

    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        logger.warning(f"⚠️ Usuario no encontrado: {credentials.username}")
        raise invalid_exc

    user_dict = dict(user)

    if not pwd_context.verify(credentials.password, user_dict.get("password_hash", "")):
        logger.warning(f"⚠️ Password incorrecto: {credentials.username}")
        raise invalid_exc

    token_data = {
        "user_id": user_dict["id"],
        "cedula":  user_dict["cedula"],
        "rol":     user_dict["rol"],
    }
    access_token = create_access_token(token_data)

    user_data = {
        "id":              user_dict["id"],
        "cedula":          user_dict["cedula"],
        "email":           user_dict.get("email"),
        "rol":             user_dict["rol"],
        "first_name":      user_dict.get("first_name", ""),
        "last_name":       user_dict.get("last_name", ""),
        "nombre_completo": (
            f"{user_dict.get('first_name', '')} {user_dict.get('last_name', '')}".strip()
            or user_dict["cedula"]
        ),
        "carrera_id":      user_dict.get("carrera_id"),
        "carrera_nombre":  user_dict.get("carrera_nombre"),
        "es_becado":       user_dict.get("es_becado", False),
        "porcentaje_beca": user_dict.get("porcentaje_beca", 0),
    }

    logger.info(f"✅ Login exitoso: {credentials.username} (rol: {user_dict['rol']})")
    return TokenResponse(access_token=access_token, token_type="bearer", user=user_data)


@router.post("/logout", summary="Cerrar sesión (revocar token JWT)")
async def logout(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1].strip()
    payload = await decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = payload.get("jti")
    if jti:
        await revoke_token(jti)

    logger.info(f"🚪 Logout para usuario_id={payload.get('user_id')} jti={jti}")
    return {"detail": "Sesión cerrada"}


@router.get("/perfil", summary="Obtener perfil del usuario autenticado")
async def obtener_perfil(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    carrera_nombre = None
    if current_user.get("carrera_id"):
        try:
            async with get_db() as conn:
                row = await conn.fetchrow(
                    "SELECT nombre FROM public.carreras WHERE id = $1",
                    current_user["carrera_id"],
                )
                if row:
                    carrera_nombre = row["nombre"]
        except Exception:
            pass

    return {
        "id":              current_user["id"],
        "cedula":          current_user["cedula"],
        "email":           current_user.get("email"),
        "rol":             current_user["rol"],
        "first_name":      current_user.get("first_name", ""),
        "last_name":       current_user.get("last_name", ""),
        "nombre_completo": (
            f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
            or current_user["cedula"]
        ),
        "carrera_id":      current_user.get("carrera_id"),
        "carrera_nombre":  carrera_nombre,
        "es_becado":       current_user.get("es_becado", False),
        "porcentaje_beca": current_user.get("porcentaje_beca", 0),
    }


@router.get("/verify", summary="Verificar validez del token")
async def verify_token_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    return {
        "valid":   True,
        "user_id": current_user["id"],
        "cedula":  current_user["cedula"],
        "rol":     current_user["rol"],
    }
