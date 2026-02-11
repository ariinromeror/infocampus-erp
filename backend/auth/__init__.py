"""
Módulo de autenticación
Exporta las funciones y clases principales
"""
from .jwt_handler import create_access_token, decode_access_token, verify_token
from .dependencies import (
    get_current_user,
    require_roles,
    require_admin,
    require_tesorero,
    require_profesor,
    require_estudiante,
    get_optional_user,
    security
)
from .schemas import LoginRequest, TokenResponse, TokenData, UserProfile

__all__ = [
    'create_access_token',
    'decode_access_token',
    'verify_token',
    'get_current_user',
    'require_roles',
    'require_admin',
    'require_tesorero',
    'require_profesor',
    'require_estudiante',
    'get_optional_user',
    'security',
    'LoginRequest',
    'TokenResponse',
    'TokenData',
    'UserProfile',
]
