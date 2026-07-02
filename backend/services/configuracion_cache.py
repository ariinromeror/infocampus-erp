"""
Cache-aside para la tabla `configuracion_ia` (políticas institucionales).

Los valores cambian con poca frecuencia (los actualiza el director desde el
panel de configuración), pero se leen en cada consulta al contexto de IA/chat
de todos los roles (`routers/ia_context.py`). Cachearlos en Redis evita una
consulta a Postgres por cada mensaje de chat/carga de contexto; la
invalidación es simple porque solo hay un punto de escritura
(`routers/director_router.py::actualizar_configuracion`), que llama a
`invalidate_configuracion_ia()` tras el UPDATE/INSERT.
"""
from typing import Dict

from cache import delete, get_json, set_json

CACHE_KEY = "infocampus:configuracion_ia"
CACHE_TTL_SECONDS = 300


async def get_configuracion_ia(conn) -> Dict[str, str]:
    cached = await get_json(CACHE_KEY)
    if cached is not None:
        return cached

    rows = await conn.fetch("SELECT clave, valor FROM public.configuracion_ia ORDER BY id")
    politicas = {r["clave"]: r["valor"] for r in rows}
    await set_json(CACHE_KEY, politicas, CACHE_TTL_SECONDS)
    return politicas


async def invalidate_configuracion_ia() -> None:
    await delete(CACHE_KEY)
