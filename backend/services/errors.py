"""
RQ-07 (docs/PRD.md): excepciones de dominio compartidas por la capa de
`services/`. Permiten que un servicio señale un error de negocio (404 "no
encontrado", 400 "dato inválido", etc.) sin depender de FastAPI —
`HTTPException` es un detalle del transporte HTTP y no debería filtrarse a
funciones que RQ-04 necesita poder testear sin levantar el stack HTTP
completo. El router captura `ServiceError` y la traduce a `HTTPException`.
"""


class ServiceError(Exception):
    """Error de negocio genérico levantado por una función de `services/`."""

    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class NotFoundError(ServiceError):
    def __init__(self, detail: str = "Recurso no encontrado"):
        super().__init__(detail, status_code=404)


class ValidationError(ServiceError):
    def __init__(self, detail: str = "Datos inválidos"):
        super().__init__(detail, status_code=400)


class ForbiddenError(ServiceError):
    def __init__(self, detail: str = "Sin permiso"):
        super().__init__(detail, status_code=403)
