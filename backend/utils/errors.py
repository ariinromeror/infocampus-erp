"""
Utilidades de manejo de errores compartidas por los routers.

RQ-06 (docs/PRD.md): los `except Exception` de los routers no deben devolver
`str(e)` al cliente, porque puede filtrar detalles internos (nombres de
tabla/columna, mensajes de asyncpg, rutas de archivos, etc.). El detalle
completo del error se sigue logueando server-side vía `logger.error(...)`;
el cliente recibe siempre un mensaje genérico y seguro.
"""

GENERIC_ERROR_DETAIL = "Error interno del servidor. Intenta nuevamente más tarde."
