"""
Manejo de JWT (JSON Web Tokens)
Migrado desde Django Token Authentication
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import uuid

from jose import JWTError, jwt

from cache import get_bool, set_bool
from config import settings
from database import get_db

logger = logging.getLogger(__name__)

# Cache de revocación (Redis opcional, ver backend/cache.py). Mitiga el costo
# del fail-closed de is_token_revoked bajo carga: en vez de una query a
# Postgres en *cada* request autenticado, se resuelve desde Redis casi
# siempre. Un jti nunca pasa de revocado a no-revocado, así que cachear
# "revocado" se hace con TTL largo (vida útil del token); "no revocado" se
# cachea con TTL corto para acotar la ventana de staleness ante un logout
# reciente en otro proceso/worker.
_REVOKED_CACHE_PREFIX = "infocampus:revoked_token:"
_NOT_REVOKED_CACHE_TTL_SECONDS = 30


def _revoked_cache_key(jti: str) -> str:
    return f"{_REVOKED_CACHE_PREFIX}{jti}"


def _revoked_cache_ttl_seconds() -> int:
    # Vida máxima útil de la entrada "revocado": no tiene sentido cachearla
    # más allá de lo que dura un access token, porque pasado ese tiempo el
    # token ya es inválido por expiración de todos modos.
    return max(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, 60)


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
    Verifica si un token ha sido revocado, primero en cache (Redis, si está
    configurado) y si no en la tabla revoked_tokens.

    Falla en modo "cerrado" (fail-closed): si la consulta a la base de datos
    falla por cualquier motivo, el token se trata como revocado. Un usuario
    ya autenticado ya depende de la DB para el resto del request (get_current_user
    también la consulta), así que no hay ganancia real en permitir el token
    aquí y sí hay riesgo de aceptar un token ya revocado durante un incidente
    de base de datos.
    """
    if not jti:
        return False

    cache_key = _revoked_cache_key(jti)
    cached = await get_bool(cache_key)
    if cached is not None:
        return cached

    try:
        async with get_db() as conn:
            row = await conn.fetchrow(
                "SELECT 1 FROM public.revoked_tokens WHERE jti = $1 LIMIT 1",
                jti,
            )
        revocado = row is not None
    except Exception as e:
        logger.error(f"❌ Error comprobando revocación de token, tratando como revocado (fail-closed): {e}")
        # No cachear un resultado de error: si Redis quedara con "revocado"
        # por un incidente puntual de DB, el usuario quedaría bloqueado más
        # allá del incidente. Se prefiere volver a consultar la DB la
        # próxima vez.
        return True

    ttl = _revoked_cache_ttl_seconds() if revocado else _NOT_REVOKED_CACHE_TTL_SECONDS
    await set_bool(cache_key, revocado, ttl)
    return revocado


async def revoke_token(jti: str) -> None:
    """
    Marca un token como revocado insertando su jti en la tabla revoked_tokens
    y actualiza el cache de inmediato (no espera al próximo miss) para que
    otros workers/procesos vean la revocación sin depender del TTL corto de
    "no revocado".
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

    await set_bool(_revoked_cache_key(jti), True, _revoked_cache_ttl_seconds())


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
