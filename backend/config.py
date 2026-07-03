"""
Configuración global del proyecto Info Campus ERP
Migrado desde Django settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """
    Configuración del sistema usando variables de entorno
    """
    # Database - PostgreSQL
    DATABASE_URL: str
    
    # JWT Configuration
    SECRET_KEY_AUTH: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 60 minutos (antes: 1440 = 24 horas)
    
    # CORS
    ALLOWED_ORIGINS: str = "https://ariinromeror-infocampus-erp.vercel.app"

    # AI / Groq
    GROQ_API_KEY: str = ""

    # Observability (RQ-10) — opcional: sin DSN, Sentry queda deshabilitado
    # y el resto de la app funciona exactamente igual.
    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "development"

    # Demo login (RQ-01, docs/PRD.md): "apagador" del acceso demo. Todas las
    # cuentas sembradas por scripts_db/populate.py comparten esta contraseña
    # (`UNIVERSAL_PASSWORD` ahí, `DEMO_PASSWORD` en el frontend) a propósito,
    # como feature de portafolio. Si este código se reutiliza para una
    # institución real, poner ENABLE_DEMO_LOGIN=false rechaza cualquier login
    # que use esta contraseña compartida (aunque el hash almacenado coincida),
    # sin afectar a cuentas reales con contraseñas propias.
    ENABLE_DEMO_LOGIN: bool = True
    DEMO_PASSWORD: str = "campus2026"

    # App Info
    APP_NAME: str = "Info Campus ERP API"
    APP_VERSION: str = "2.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  

@lru_cache()
def get_settings() -> Settings:
    """
    Retorna instancia cacheada de settings
    """
    return Settings()

settings = get_settings()