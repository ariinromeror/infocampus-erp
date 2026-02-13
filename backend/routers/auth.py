"""
Router de Autenticación
Endpoints: /auth/login, /auth/perfil
REFERENCIA DJANGO: views.py líneas 398-428
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Dict, Any
import bcrypt

from auth.schemas import LoginRequest, TokenResponse
from auth.jwt_handler import create_access_token
from auth.dependencies import get_current_user
from database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
    }
)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Autenticación de usuarios",
    description="""
    Autentica un usuario con cédula y password.
    
    Retorna un token JWT si las credenciales son correctas.
    
    **Roles válidos:** estudiante, profesor, coordinador, director, tesorero, administrativo
    """
)
async def login(credentials: LoginRequest) -> TokenResponse:
    """
    Autenticación de usuarios
    
    REFERENCIA DJANGO: views.py - login_view (líneas 398-419)
    
    Args:
        credentials: Cedula (campo username en frontend) y password
    
    Returns:
        TokenResponse con access_token y datos del usuario
    
    Raises:
        HTTPException: 401 si credenciales inválidas
    """
    logger.info(f"🔐 Intento de login: {credentials.username}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Buscar usuario por cedula (el campo username en frontend envía la cedula)
            cur.execute(
                """
                SELECT id, cedula, password_hash, email, rol, 
                       first_name, last_name, carrera_id,
                       es_becado, porcentaje_beca
                FROM public.usuarios 
                WHERE cedula = %s
                """,
                (credentials.username,)
            )
            
            user = cur.fetchone()
            cur.close()
        
        if not user:
            logger.warning(f"⚠️ Usuario no encontrado: {credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Convertir a dict
        user_dict = dict(user)
        
        # Verificar password usando bcrypt
        stored_password_hash = user_dict.get('password_hash', '')
        if not bcrypt.checkpw(credentials.password.encode('utf-8'), stored_password_hash.encode('utf-8')):
            logger.warning(f"⚠️ Password incorrecto para: {credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Crear token JWT
        token_data = {
            "user_id": user_dict['id'],
            "cedula": user_dict['cedula'],
            "rol": user_dict['rol']
        }
        
        access_token = create_access_token(token_data)
        
        # Preparar datos del usuario (sin password)
        user_data = {
            "id": user_dict['id'],
            "cedula": user_dict['cedula'],
            "email": user_dict.get('email'),
            "rol": user_dict['rol'],
            "first_name": user_dict.get('first_name', ''),
            "last_name": user_dict.get('last_name', ''),
            "nombre_completo": f"{user_dict.get('first_name', '')} {user_dict.get('last_name', '')}".strip() or user_dict['cedula'],
            "carrera_id": user_dict.get('carrera_id'),
            "es_becado": user_dict.get('es_becado', False),
            "porcentaje_beca": user_dict.get('porcentaje_beca', 0),
        }
        
        logger.info(f"✅ Login exitoso: {credentials.username} (rol: {user_dict['rol']})")
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )


@router.get(
    "/perfil",
    summary="Obtener perfil del usuario",
    description="Retorna los datos del usuario autenticado"
)
async def obtener_perfil(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retorna los datos del usuario autenticado
    
    REFERENCIA DJANGO: views.py - perfil_usuario (líneas 422-428)
    
    Args:
        current_user: Usuario autenticado (inyectado por Depends)
    
    Returns:
        dict: Datos del usuario
    """
    # Preparar datos del usuario (sin información sensible)
    user_data = {
        "id": current_user['id'],
        "cedula": current_user['cedula'],
        "email": current_user.get('email'),
        "rol": current_user['rol'],
        "first_name": current_user.get('first_name', ''),
        "last_name": current_user.get('last_name', ''),
        "nombre_completo": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user['cedula'],
        "carrera_id": current_user.get('carrera_id'),
        "es_becado": current_user.get('es_becado', False),
        "porcentaje_beca": current_user.get('porcentaje_beca', 0),
    }
    
    logger.info(f"👤 Perfil consultado: {current_user['cedula']}")
    
    return user_data


@router.get(
    "/verify",
    summary="Verificar validez del token",
    description="Endpoint para verificar si un token JWT es válido"
)
async def verify_token_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Verifica si el token es válido y retorna información básica
    
    Returns:
        dict: Información de validez del token
    """
    return {
        "valid": True,
        "user_id": current_user['id'],
        "cedula": current_user['cedula'],
        "rol": current_user['rol']
    }
