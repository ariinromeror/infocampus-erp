"""
Dependencies de autenticación y autorización
Implementa RBAC (Role-Based Access Control) con 6 roles
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
from .jwt_handler import decode_access_token
from ..database import get_db
import logging

logger = logging.getLogger(__name__)

# Security scheme para Swagger/OpenAPI
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency para obtener el usuario actual desde el token JWT
    
    REFERENCIA DJANGO: @permission_classes([IsAuthenticated])
    
    Uso:
        @app.get("/perfil")
        async def perfil(current_user = Depends(get_current_user)):
            return current_user
    
    Args:
        credentials: Credenciales HTTP Bearer
    
    Returns:
        dict: Datos del usuario autenticado
    
    Raises:
        HTTPException: 401 si el token es inválido
    """
    # Validar que existe el header de autorización
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # Decodificar token
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extraer datos del payload
    user_id = payload.get("user_id")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta user_id",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Buscar usuario en la base de datos
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM public.usuarios WHERE id = %s",
            (user_id,)
        )
        user = cur.fetchone()
        cur.close()
    
    if not user:
        logger.warning(f"⚠️ Usuario {user_id} no encontrado en BD")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convertir a dict si es necesario
    if hasattr(user, 'dict'):
        user_dict = user.dict()
    elif hasattr(user, '_mapping'):
        user_dict = dict(user._mapping)
    else:
        user_dict = dict(user)
    
    logger.info(f"✅ Usuario autenticado: {user_dict.get('username')} (rol: {user_dict.get('rol')})")
    
    return user_dict


def require_roles(allowed_roles: List[str]):
    """
    Factory de dependencies para validar roles permitidos
    
    REFERENCIA DJANGO: 
        - views.py línea 44: if request.user.rol not in [...]
        - @permission_classes con roles específicos
    
    Implementa RBAC con 6 roles:
        - estudiante
        - profesor
        - coordinador
        - director
        - tesorero
        - administrativo
    
    Uso:
        @app.get("/admin/dashboard")
        async def dashboard(
            current_user = Depends(require_roles(['director', 'coordinador']))
        ):
            return {"message": "Bienvenido"}
    
    Args:
        allowed_roles: Lista de roles permitidos
    
    Returns:
        Dependency function que valida el rol
    """
    async def role_checker(
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        user_rol = current_user.get('rol')
        
        if user_rol not in allowed_roles:
            logger.warning(
                f"🚫 Acceso denegado: usuario {current_user.get('username')} "
                f"con rol '{user_rol}' intentó acceder a recurso que requiere: {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(allowed_roles)}"
            )
        
        return current_user
    
    return role_checker


# Shorthand dependencies para roles comunes
require_admin = require_roles(['director', 'coordinador', 'administrativo'])
require_tesorero = require_roles(['tesorero', 'director'])
require_profesor = require_roles(['profesor', 'director', 'coordinador'])
require_estudiante = require_roles(['estudiante', 'director', 'coordinador', 'tesorero'])


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Similar a get_current_user pero NO lanza excepción si no hay token
    Útil para endpoints que pueden funcionar con o sin autenticación
    
    Returns:
        dict: Usuario autenticado o None
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
