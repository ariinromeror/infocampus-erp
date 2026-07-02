"""
Configuración compartida de pytest para el backend.

Requiere una base de datos PostgreSQL accesible vía la variable de entorno
DATABASE_URL (ver README.md / CI en .github/workflows/backend-ci.yml).
No se usa SQLite ni mocks de base de datos: el proyecto usa asyncpg con SQL
crudo (placeholders $1, $2), por lo que los tests corren contra un Postgres
real para detectar errores de sintaxis SQL que un mock no vería.
"""
import os
import sys
from pathlib import Path

# Permite `import main`, `import database`, etc. sin depender de cómo se invoque
# pytest (python -m pytest sí antepone el cwd a sys.path; `pytest` a secas no
# siempre lo hace, p.ej. en el runner de GitHub Actions).
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/infocampus_test")
os.environ.setdefault("SECRET_KEY_AUTH", "test_secret_key_ci_only_do_not_use_in_prod_32chars")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")
os.environ.setdefault("GROQ_API_KEY", "")

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    """Cliente de test con el ciclo de vida (lifespan) de la app ya inicializado."""
    import main as app_module
    with TestClient(app_module.app) as c:
        yield c
