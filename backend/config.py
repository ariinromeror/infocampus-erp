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
    # Sin valor por defecto: en producción es obligatorio configurar los
    # orígenes permitidos explícitamente vía variable de entorno.
    ALLOWED_ORIGINS: str = ""

    # Entorno de ejecución: "production" | "development" | "test"
    # Controla comportamientos de seguridad (p.ej. fallback de CORS a wildcard
    # solo se permite fuera de "production"). Por defecto "production" para
    # que un despliegue mal configurado falle de forma segura (cerrado) en
    # vez de abrirse accidentalmente.
    ENVIRONMENT: str = "production"

    # AI / Groq
    GROQ_API_KEY: str = ""
    
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