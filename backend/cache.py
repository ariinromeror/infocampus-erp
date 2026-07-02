"""
Cliente Redis async opcional para InfoCampus ERP.

Diseñado para degradar con seguridad si Redis no está configurado o si la
conexión falla: en ese caso todas las funciones se comportan como si hubiera
"cache miss" (devuelven `None`) o simplemente no hacen nada al escribir, en
vez de romper el request. Redis aquí es una optimización de performance
(menos carga sobre el pool de Postgres, revocación de tokens más rápida),
nunca la fuente de verdad: Postgres sigue siendo el sistema de registro,
Redis solo acelera lecturas repetidas.

`REDIS_URL` vacío (configuración por defecto) deshabilita el cache por
completo sin requerir ningún cambio de código en quien lo consume.
"""
import json
import logging
from typing import Any, Optional

from config import settings

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as redis  # type: ignore
except ImportError:  # pragma: no cover - redis es una dependencia opcional
    redis = None

_client = None
_client_init_attempted = False


def _get_client():
    """
    Devuelve el cliente Redis (creándolo perezosamente en el primer uso) o
    `None` si Redis no está configurado/disponible. Aislado en su propia
    función para poder monkeypatchearlo fácilmente en tests.
    """
    global _client, _client_init_attempted
    if _client_init_attempted:
        return _client
    _client_init_attempted = True

    redis_url = getattr(settings, "REDIS_URL", "") or ""
    if not redis_url or redis is None:
        logger.info(
            "Redis no configurado (REDIS_URL vacío o paquete 'redis' no instalado): "
            "cache deshabilitado, se usa Postgres directamente."
        )
        return None

    try:
        _client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        logger.info("✅ Cliente Redis inicializado")
    except Exception as e:
        logger.error("❌ Error inicializando cliente Redis, cache deshabilitado: %s", e)
        _client = None
    return _client


def _reset_client_for_tests() -> None:
    """Solo para tests: fuerza a que el próximo `_get_client()` reintente la conexión."""
    global _client, _client_init_attempted
    _client = None
    _client_init_attempted = False


async def get_json(key: str) -> Optional[Any]:
    client = _get_client()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        return json.loads(raw) if raw is not None else None
    except Exception as e:
        logger.warning("Cache miss forzado (error leyendo Redis key=%s): %s", key, e)
        return None


async def set_json(key: str, value: Any, ttl_seconds: int) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
    except Exception as e:
        logger.warning("No se pudo escribir en Redis key=%s: %s", key, e)


async def delete(*keys: str) -> None:
    client = _get_client()
    if client is None or not keys:
        return
    try:
        await client.delete(*keys)
    except Exception as e:
        logger.warning("No se pudo borrar de Redis keys=%s: %s", keys, e)


async def get_bool(key: str) -> Optional[bool]:
    """`None` = cache miss / cache deshabilitado; distinto de `False`."""
    value = await get_json(key)
    if value is None:
        return None
    return bool(value)


async def set_bool(key: str, value: bool, ttl_seconds: int) -> None:
    await set_json(key, value, ttl_seconds)
