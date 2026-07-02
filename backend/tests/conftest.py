"""
Configuracion compartida de pytest.

Estas variables de entorno deben existir ANTES de que se importe `config.py`
(o cualquier modulo que lo importe transitivamente), ya que `Settings` valida
campos obligatorios (DATABASE_URL, SECRET_KEY_AUTH) en el momento de la
importacion. Los tests unitarios no usan una base de datos real: donde se
necesita `conn`, se inyecta un mock (ver tests/fakes.py).
"""
import os

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db")
os.environ.setdefault("SECRET_KEY_AUTH", "test-secret-key-only-for-automated-tests")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")
