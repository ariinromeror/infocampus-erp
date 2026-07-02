"""
Cola de tareas en background (arq sobre Redis) para trabajos pesados que no
deben bloquear el ciclo request/response de FastAPI.

Caso de uso concreto: generación masiva de boletines de notas al cierre de
un período (potencialmente cientos de PDFs para ~800 estudiantes a la vez),
mencionado explícitamente en el plan de escalabilidad. Los reportes
individuales (backend/routers/reportes.py) siguen siendo síncronos a
propósito porque ahí el usuario espera una descarga inmediata; aquí en
cambio el propio volumen del trabajo es lo que justifica desacoplarlo del
request HTTP.

Requiere `REDIS_URL` configurado. Si no lo está, `get_arq_pool()` devuelve
`None` y el endpoint que encola el trabajo responde 503 explícitamente en
vez de fallar de forma opaca.

Para que los trabajos encolados realmente se ejecuten hace falta un proceso
worker de arq corriendo por separado del proceso web (ver docs/DEPLOY.md):

    cd backend && arq services.task_queue.WorkerSettings
"""
import logging
import os
import zipfile
from typing import Any, Dict, Optional

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from config import settings
from database import get_db
from logging_setup import configure_logging
from services.pdf_generator import generar_boletin_notas

configure_logging()
logger = logging.getLogger(__name__)

# Almacenamiento local simple para los ZIP generados. En Render el
# filesystem es efímero entre deploys/reinicios: esto es intencional para un
# job de vida corta (se genera y se descarga poco después), no para
# archivado a largo plazo. Si se necesita persistencia duradera, cambiar a
# un bucket S3/Supabase Storage aquí sin tocar los endpoints que lo llaman.
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_reports")


def _redis_settings() -> RedisSettings:
    if settings.REDIS_URL:
        return RedisSettings.from_dsn(settings.REDIS_URL)
    return RedisSettings()


async def get_arq_pool() -> Optional[ArqRedis]:
    """
    Pool de conexión arq para *encolar* trabajos desde el proceso web.
    Devuelve `None` si Redis no está configurado; el llamador decide cómo
    responder (normalmente HTTP 503).
    """
    if not settings.REDIS_URL:
        return None
    return await create_pool(_redis_settings())


async def generar_boletines_lote(ctx: Dict[str, Any], periodo_id: int) -> Dict[str, Any]:
    """
    Job de arq: genera un boletín de notas en PDF por cada estudiante con
    inscripciones en `periodo_id` que ya tengan al menos una nota final
    registrada, y los empaqueta en un único .zip.

    Se ejecuta en el proceso worker (`arq services.task_queue.WorkerSettings`),
    fuera del ciclo request/response de la API, por lo que puede tardar
    minutos sin afectar la disponibilidad del backend.
    """
    os.makedirs(REPORTS_DIR, exist_ok=True)
    job_id = ctx["job_id"]
    zip_path = os.path.join(REPORTS_DIR, f"boletines_{job_id}.zip")

    generados = 0
    async with get_db() as conn:
        estudiantes = await conn.fetch(
            """
            SELECT DISTINCT u.id, u.cedula, u.first_name, u.last_name
            FROM public.usuarios u
            JOIN public.inscripciones i ON i.estudiante_id = u.id
            JOIN public.secciones s ON i.seccion_id = s.id
            WHERE s.periodo_id = $1 AND u.rol = 'estudiante'
            ORDER BY u.last_name, u.first_name
            """,
            periodo_id,
        )

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for est in estudiantes:
                est_dict = dict(est)
                notas_rows = await conn.fetch(
                    """
                    SELECT m.nombre as materia, i.nota_final as nota
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    JOIN public.materias m ON s.materia_id = m.id
                    WHERE i.estudiante_id = $1 AND s.periodo_id = $2
                    ORDER BY m.nombre
                    """,
                    est_dict["id"],
                    periodo_id,
                )
                notas = [dict(r) for r in notas_rows if r["nota"] is not None]
                if not notas:
                    continue

                promedio = sum(float(n["nota"]) for n in notas) / len(notas)
                pdf_buffer = generar_boletin_notas(est_dict, notas, promedio)
                filename = f"boletin_{est_dict.get('cedula') or est_dict['id']}.pdf"
                zf.writestr(filename, pdf_buffer.read())
                generados += 1

    logger.info("✅ Job %s: %d boletines generados en %s", job_id, generados, zip_path)
    return {"generados": generados, "zip_path": zip_path}


async def _on_startup(ctx: Dict[str, Any]) -> None:
    """
    Inicializa Sentry en el proceso worker (proceso separado del proceso
    web: `sentry_sdk.init()` en main.py no lo cubre). Sin SENTRY_DSN, no-op.
    """
    if settings.SENTRY_DSN:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            release=settings.APP_VERSION,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
        )
        logger.info("✅ Sentry inicializado en worker arq (environment=%s)", settings.ENVIRONMENT)


class WorkerSettings:
    functions = [generar_boletines_lote]
    redis_settings = _redis_settings()
    on_startup = _on_startup
    max_jobs = 5
    job_timeout = 600
    keep_result = 3600
