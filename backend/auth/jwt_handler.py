"""
Manejo de JWT (JSON Web Tokens)
Migrado desde Django Token Authentication
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import uuid

from jose import JWTError, jwt

from config import settings
from database import get_db

logger = logging.getLogger(__name__)


def _generate_jti() -> str:
    return uuid.uuid4().hex


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Crear un token JWT con los datos del usuario.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),  # Issued at
            "type": "access",
            "jti": _generate_jti(),
        }
    )

    try:
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY_AUTH,
            algorithm=settings.ALGORITHM,
        )
        logger.info(f"✅ Token JWT creado para usuario_id={data.get('user_id')}")
        return encoded_jwt
    except Exception as e:
        logger.error(f"❌ Error creando token JWT: {e}")
        raise


async def is_token_revoked(jti: Optional[str]) -> bool:
    """
    Verifica si un token ha sido revocado consultando la tabla revoked_tokens.
    Si hay cualquier error de base de datos, falla en modo permisivo (no bloquea).
    """
    if not jti:
        return False

    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                "SELECT 1 FROM public.revoked_tokens WHERE jti = $1 LIMIT 1",
                jti,
            )
        return row is not None
    except Exception as e:
        logger.error(f"❌ Error comprobando revocación de token: {e}")
        return False


async def revoke_token(jti: str) -> None:
    """
    Marca un token como revocado insertando su jti en la tabla revoked_tokens.
    """
    if not jti:
        return

    try:
        async with get_db() as conn:
            await conn.execute(
                """
                INSERT INTO public.revoked_tokens (jti, revoked_at)
                VALUES ($1, NOW())
                """,
                jti,
            )
    except Exception as e:
        logger.error(f"❌ Error revocando token (jti={jti}): {e}")


async def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodificar y verificar un token JWT, incluyendo revocación básica.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY_AUTH,
            algorithms=[settings.ALGORITHM],
        )

        # Validar campos requeridos
        if "user_id" not in payload:
            logger.warning("⚠️ Token JWT sin user_id")
            return None

        jti = payload.get("jti")
        if await is_token_revoked(jti):
            logger.warning(f"⚠️ Token JWT revocado jti={jti}")
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


async def verify_token(token: str) -> bool:
    """
    Verifica si un token es válido (incluyendo si está revocado).
    """
    return await decode_access_token(token) is not None
