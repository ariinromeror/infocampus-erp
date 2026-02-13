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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas
    
    # CORS
    ALLOWED_ORIGINS: str = "https://ariinromeror-infocampus-erp.vercel.app"
    
    # App Info
    APP_NAME: str = "Info Campus ERP API"
    APP_VERSION: str = "2.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """
    Retorna instancia cacheada de settings
    """
    return Settings()

settings = get_settings()
