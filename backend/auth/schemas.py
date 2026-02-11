"""
Schemas Pydantic para autenticación
"""
from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    """
    Schema para solicitud de login
    REFERENCIA DJANGO: views.py - login_view
    """
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario")
    password: str = Field(..., min_length=1, description="Contraseña")
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "juan.perez",
                "password": "mi_password_seguro"
            }
        }


class TokenData(BaseModel):
    """
    Datos decodificados del token JWT
    """
    user_id: int
    username: str
    rol: str
    exp: Optional[int] = None


class TokenResponse(BaseModel):
    """
    Respuesta de autenticación exitosa
    REFERENCIA DJANGO: views.py - login_view (líneas 412-415)
    """
    access_token: str = Field(..., description="Token JWT de acceso")
    token_type: str = Field(default="bearer", description="Tipo de token")
    user: dict = Field(..., description="Datos del usuario autenticado")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "username": "juan.perez",
                    "rol": "estudiante",
                    "nombre_completo": "Juan Pérez"
                }
            }
        }


class UserProfile(BaseModel):
    """
    Perfil de usuario
    REFERENCIA DJANGO: views.py - perfil_usuario
    """
    id: int
    username: str
    email: Optional[str] = None
    rol: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nombre_completo: str
    carrera_id: Optional[int] = None
    es_becado: bool = False
    porcentaje_beca: int = 0
    
    class Config:
        from_attributes = True
