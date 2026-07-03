"""
RQ-09 (docs/PRD.md): estándar único de paginación para endpoints de listado.

Antes de este módulo, cada router implementaba `page`/`limit` a mano (o no
los implementaba en absoluto), sin límite máximo, y con formas de respuesta
ligeramente distintas (`total_pages` en unos, nada en otros). Este módulo
centraliza:

  1. `PaginationParams` / `pagination_params()` — dependencia FastAPI para
     `page`/`limit` con un tope máximo configurable por endpoint (red de
     seguridad contra abuso, vía `Query(..., le=max_limit)`).
  2. `paginated_payload()` — arma la porción `data` de la respuesta con una
     forma consistente: `{<items_key>: [...], "page": ..., "limit": ...,
     "total": ...}`.

Nota de diseño: los items se mantienen anidados bajo una clave nombrada
dentro de `data` (p.ej. `data.materias`, `data.secciones`) en vez de
reemplazar `data` directamente por la lista. Esto preserva el contrato ya
consumido por el frontend en producción (`res.data.data.materias`, etc.);
aplanarlo habría requerido tocar más de una decena de componentes de
frontend sin beneficio funcional real, violando el principio de "sin
big-bang rewrites" del PRD. Lo que sí se vuelve obligatorio y consistente en
todos los listados es: (a) un `LIMIT` real en la query SQL, (b) los mismos
nombres de campos de metadatos (`page`, `limit`, `total`) en cada respuesta.
"""
from dataclasses import dataclass

from fastapi import Query


@dataclass(frozen=True)
class PaginationParams:
    page: int
    limit: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def pagination_params(default_limit: int = 20, max_limit: int = 100):
    """Factory de dependencia FastAPI para `page`/`limit`.

    `default_limit`/`max_limit` se calibran por endpoint según el volumen de
    datos real que maneja cada listado (ver el valor usado en cada router):
    el mismo límite razonable para `/tesorero/pagos` (20/100) truncaría
    silenciosamente catálogos institucionales completos como
    `/academico/secciones`, que el frontend hoy consume sin ninguna UI de
    paginación. `max_limit` es siempre un tope duro que ninguna request
    puede superar, sin importar cuál sea el default.
    """
    def _dependency(
        page: int = Query(1, ge=1, description="Número de página (1-indexado)"),
        limit: int = Query(
            default_limit, ge=1, le=max_limit,
            description=f"Elementos por página (máximo {max_limit})",
        ),
    ) -> PaginationParams:
        return PaginationParams(page=page, limit=limit)

    return _dependency


def paginated_payload(items_key: str, items: list, pagination: PaginationParams, total: int) -> dict:
    """Arma el contenido de `data` para una respuesta de listado paginada,
    con la misma forma (`{<items_key>}, page, limit, total, total_pages`) en
    todos los endpoints que la usan.

    `total_pages` es un campo derivado (`ceil(total / limit)`) que ya
    consumía el frontend en los endpoints paginados existentes
    (`/tesorero/pagos`, `/academico/estudiantes`, `/director/historial-notas`)
    antes de RQ-09; se mantiene por compatibilidad además de los tres campos
    mínimos que pide el estándar (`page`, `limit`, `total`)."""
    limit = pagination.limit or 1
    return {
        items_key: items,
        "page": pagination.page,
        "limit": pagination.limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
    }
