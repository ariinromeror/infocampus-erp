# InfoCampus ERP — Backend
# Imagen de referencia para paridad dev/CI/prod. Render puede desplegar
# directamente desde este Dockerfile (Settings > Build > Docker) como
# alternativa al buildpack de Python nativo definido en render.yaml.

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias del sistema requeridas por psycopg2 y reportlab
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# healthcheck local: exige DATABASE_URL/SECRET_KEY_AUTH ya configurados via env
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health', timeout=3).status == 200 else 1)"

# Forma shell (no exec) a propósito: permite expandir WEB_CONCURRENCY/PORT
# en tiempo de arranque del contenedor (Render los inyecta como env vars).
CMD gunicorn main:app -w ${WEB_CONCURRENCY:-2} -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8000} --timeout 120
