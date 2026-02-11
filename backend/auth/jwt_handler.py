"""
Manejo de JWT (JSON Web Tokens)
Migrado desde Django Token Authentication
"""
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional, Dict, Any
from config import settings
import logging

logger = logging.getLogger(__name__)


def create_access_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Crear un token JWT con los datos del usuario
    
    REFERENCIA DJANGO: views.py líneas 410-415
    
    Args:
        data: Diccionario con {user_id, username, rol}
        expires_delta: Tiempo de expiración (default: 24 horas)
    
    Returns:
        str: Token JWT firmado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued at
        "type": "access"
    })
    
    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY_AUTH,
            algorithm=settings.ALGORITHM
        )
        logger.info(f"✅ Token JWT creado para usuario: {data.get('username')}")
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Error creando token JWT: {e}")
        raise


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodificar y verificar un token JWT
    
    Args:
        token: Token JWT a decodificar
    
    Returns:
        dict: Payload del token si es válido, None si no
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY_AUTH,
            algorithms=[settings.ALGORITHM]
        )
        
        # Validar campos requeridos
        if "user_id" not in payload:
            logger.warning("⚠️ Token JWT sin user_id")
            return None
            
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("⚠️ Token JWT expirado")
        return None
    except JWTError as e:
        logger.warning(f"⚠️ Error decodificando JWT: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Error inesperado con JWT: {e}")
        return None


def verify_token(token: str) -> bool:
    """
    Verifica si un token es válido (sin decodificar completamente)
    
    Args:
        token: Token JWT
    
    Returns:
        bool: True si es válido, False si no
    """
    return decode_access_token(token) is not None
