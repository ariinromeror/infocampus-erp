"""
Script de carga (Locust) — Fase 5 del plan de escalabilidad.

Simula el escenario más exigente de InfoCampus ERP: apertura de matrícula /
cierre de pagos de fin de período con ~800 estudiantes concurrentes, más un
puñado de personal administrativo/tesorería procesando inscripciones y pagos
en paralelo.

Diseño clave — por qué NO se usa POST /api/auth/login para los 800 estudiantes:
    El login está protegido con rate limiting de 5/minuto POR IP (SlowAPI,
    ver backend/routers/auth.py), a propósito, para frenar fuerza bruta. En
    producción real, 800 estudiantes llegan desde ~800 IPs distintas, así que
    ese límite no los afecta entre sí. Pero un load test lanzado desde un
    único host de prueba SÍ comparte una sola IP: si cada "estudiante virtual"
    intentara loguearse por HTTP, el 99% recibiría 429 y el test mediría el
    rate limiter en vez de la capacidad real del sistema (DB pool, workers,
    Redis) ante tráfico ya autenticado, que es lo que esta fase quiere validar.

    Solución: se generan JWT válidos localmente (mismo algoritmo/secreto que
    el backend bajo prueba) para representar sesiones ya iniciadas — el
    estado normal de 800 estudiantes que abrieron sesión en la última hora y
    ahora refrescan su portal al abrirse la matrícula. El endpoint /login en
    sí se ejercita aparte, con concurrencia baja y realista (ver `LoginUser`),
    documentando el límite de forma explícita en vez de ignorarlo.

Uso:
    cd backend/loadtest
    pip install -r requirements.txt

    # Debe apuntar a la MISMA base de datos y compartir el MISMO
    # SECRET_KEY_AUTH/ALGORITHM que el proceso backend bajo prueba (para que
    # los tokens generados aquí sean válidos contra ese backend).
    export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/infocampus_loadtest
    export SECRET_KEY_AUTH=<mismo valor que backend/.env>
    export LOCUST_HOST=http://127.0.0.1:8000

    locust -f locustfile.py --headless -u 800 -r 40 -t 3m --host "$LOCUST_HOST" \
        --csv=resultados/run1

Ver README.md de este directorio para la metodología completa y
docs/DEPLOY.md#validación-de-capacidad para los resultados de referencia.
"""
import logging
import os
import random
import threading
import uuid
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
from jose import jwt
from locust import HttpUser, between, events, task

logger = logging.getLogger("loadtest")

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/infocampus_loadtest"
)
SECRET_KEY_AUTH = os.environ.get("SECRET_KEY_AUTH", "")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
UNIVERSAL_PASSWORD = os.environ.get("LOADTEST_PASSWORD", "campus2026")  # ver scripts_db/populate.py

if not SECRET_KEY_AUTH:
    raise RuntimeError(
        "SECRET_KEY_AUTH no está configurado. Debe ser EXACTAMENTE el mismo valor que usa "
        "el proceso backend bajo prueba, o los tokens generados aquí serán rechazados (401)."
    )

_state = {
    "estudiantes": [],  # [{id, cedula}]
    "staff": {},        # rol -> {id, cedula}
    "insc_pairs": [],   # [(estudiante_id, seccion_id), ...] aún no inscritos
    "insc_index": 0,
    "insc_lock": threading.Lock(),
}


def _mint_token(user_id: int, cedula: str, rol: str) -> str:
    """
    Genera un JWT con el mismo formato que auth/jwt_handler.create_access_token,
    sin pasar por el endpoint HTTP de login (ver docstring del módulo).
    """
    now = datetime.utcnow()
    payload = {
        "user_id": user_id,
        "cedula": cedula,
        "rol": rol,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
        "type": "access",
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, SECRET_KEY_AUTH, algorithm=ALGORITHM)


def _auth_headers(user_id: int, cedula: str, rol: str) -> dict:
    return {"Authorization": f"Bearer {_mint_token(user_id, cedula, rol)}"}


@events.test_start.add_listener
def cargar_datos_de_prueba(environment, **kwargs):
    """
    Se ejecuta una sola vez al arrancar el test (proceso master en modo
    distribuido, o el único proceso en modo standalone). Lee directamente de
    Postgres los estudiantes/personal sembrados por scripts_db/populate.py y
    precalcula pares (estudiante, sección) aún no inscritos, para que la
    tarea de "matrícula" pueda inscribir sin colisionar consigo misma durante
    la corrida (evita medir falsos negativos de "ya inscrito").
    """
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, cedula FROM public.usuarios WHERE rol = 'estudiante' AND activo = true"
            )
            _state["estudiantes"] = cur.fetchall()

            for rol in ("administrativo", "tesorero", "director"):
                cur.execute(
                    "SELECT id, cedula FROM public.usuarios WHERE rol = %s AND activo = true LIMIT 1",
                    (rol,),
                )
                row = cur.fetchone()
                if row:
                    _state["staff"][rol] = row

            cur.execute(
                """
                SELECT s.id AS seccion_id
                FROM public.secciones s
                JOIN public.periodos_lectivos p ON p.id = s.periodo_id
                WHERE p.activo = true AND s.cupo_actual < s.cupo_maximo
                """
            )
            secciones_con_cupo = [r["seccion_id"] for r in cur.fetchall()]

            cur.execute("SELECT estudiante_id, seccion_id FROM public.inscripciones")
            ya_inscritos = {(r["estudiante_id"], r["seccion_id"]) for r in cur.fetchall()}
    finally:
        conn.close()

    estudiante_ids = [e["id"] for e in _state["estudiantes"]]
    pares = [
        (est_id, sec_id)
        for sec_id in secciones_con_cupo
        for est_id in estudiante_ids
        if (est_id, sec_id) not in ya_inscritos
    ]
    random.shuffle(pares)
    _state["insc_pairs"] = pares

    logger.info(
        "Datos de carga listos: %d estudiantes, %d pares (estudiante, sección) disponibles "
        "para inscripción, staff=%s",
        len(_state["estudiantes"]),
        len(pares),
        list(_state["staff"].keys()),
    )
    if not _state["estudiantes"]:
        raise RuntimeError(
            "No hay estudiantes en la base de datos apuntada por DATABASE_URL. "
            "Ejecuta scripts_db/populate.py contra esa base antes de correr el load test."
        )


def _next_insc_pair():
    """Extrae el siguiente par (estudiante, sección) sin repetir entre tasks/usuarios."""
    with _state["insc_lock"]:
        idx = _state["insc_index"]
        if idx >= len(_state["insc_pairs"]):
            return None
        _state["insc_index"] += 1
        return _state["insc_pairs"][idx]


class EstudianteUser(HttpUser):
    """
    ~800 estudiantes concurrentes revisando su portal al abrirse la matrícula:
    dashboard, horario, notas, estado de cuenta e inscripciones vigentes.
    Es intencionalmente 100% lectura: en InfoCampus ERP el alumno NO se
    auto-inscribe (lo hace secretaría vía `AdministrativoUser`), así que el
    patrón real de carga estudiantil en este pico es de consulta repetida,
    no de escritura.
    """

    wait_time = between(1, 3)

    def on_start(self):
        est = random.choice(_state["estudiantes"])
        self.user_id = est["id"]
        self.headers = _auth_headers(est["id"], est["cedula"], "estudiante")

    @task(4)
    def ver_dashboard(self):
        self.client.get(
            f"/api/estudiante/{self.user_id}/dashboard-summary",
            headers=self.headers,
            name="/api/estudiante/[id]/dashboard-summary",
        )

    @task(3)
    def ver_horario(self):
        self.client.get(
            f"/api/estudiante/{self.user_id}/horario",
            headers=self.headers,
            name="/api/estudiante/[id]/horario",
        )

    @task(3)
    def ver_pagos(self):
        self.client.get(
            f"/api/estudiante/{self.user_id}/pagos",
            headers=self.headers,
            name="/api/estudiante/[id]/pagos",
        )

    @task(2)
    def ver_notas(self):
        self.client.get(
            f"/api/estudiante/{self.user_id}/notas",
            headers=self.headers,
            name="/api/estudiante/[id]/notas",
        )

    @task(2)
    def ver_mis_inscripciones(self):
        self.client.get(
            "/api/inscripciones/estudiante/mis-inscripciones",
            headers=self.headers,
        )


class AdministrativoUser(HttpUser):
    """
    Personal de secretaría procesando matrículas durante el mismo pico.
    `fixed_count` mantiene esta concurrencia baja y constante (realista:
    unos pocos funcionarios, no cientos) sin importar cuántos `--users` se
    pidan en total para `EstudianteUser`.
    """

    fixed_count = 4
    wait_time = between(2, 5)

    def on_start(self):
        staff = _state["staff"].get("administrativo") or _state["staff"].get("director")
        if staff is None:
            raise RuntimeError("No hay usuario 'administrativo' sembrado en la base de datos.")
        self.headers = _auth_headers(staff["id"], staff["cedula"], "administrativo")

    @task(3)
    def listar_secciones(self):
        self.client.get("/api/academico/secciones", headers=self.headers)

    @task(1)
    def inscribir_estudiante(self):
        par = _next_insc_pair()
        if par is None:
            return  # pool de pares agotado: evita medir 400 "ya inscrito" como fallo real
        estudiante_id, seccion_id = par
        with self.client.post(
            "/api/administrativo/inscribir-estudiante",
            json={"estudiante_id": estudiante_id, "seccion_id": seccion_id, "generar_pago": True},
            headers=self.headers,
            name="/api/administrativo/inscribir-estudiante",
            catch_response=True,
        ) as resp:
            # 400 (cupo lleno / ya inscrito) es una respuesta de negocio válida bajo
            # concurrencia alta, no un fallo de infraestructura: no cuenta como error.
            if resp.status_code in (200, 400):
                resp.success()


class TesoreroUser(HttpUser):
    """Tesorería registrando pagos / consultando KPIs durante el cierre de pagos."""

    fixed_count = 3
    wait_time = between(2, 5)

    def on_start(self):
        staff = _state["staff"].get("tesorero") or _state["staff"].get("director")
        if staff is None:
            raise RuntimeError("No hay usuario 'tesorero' sembrado en la base de datos.")
        self.headers = _auth_headers(staff["id"], staff["cedula"], "tesorero")

    @task(2)
    def resumen_kpis(self):
        self.client.get("/api/tesorero/resumen-kpis", headers=self.headers)

    @task(2)
    def listar_pagos(self):
        self.client.get("/api/tesorero/pagos", headers=self.headers)

    @task(1)
    def registrar_pago(self):
        est = random.choice(_state["estudiantes"])
        self.client.post(
            f"/api/estudiantes/{est['id']}/registrar-pago",
            json={"metodo_pago": "transferencia", "comprobante": f"LOADTEST-{uuid.uuid4().hex[:8]}"},
            headers=self.headers,
            name="/api/estudiantes/[id]/registrar-pago",
        )


class LoginUser(HttpUser):
    """
    Ejercita el endpoint HTTP real de login (con verificación bcrypt +
    query a Postgres), a concurrencia baja y deliberada: en producción cada
    estudiante llega de una IP distinta, así que el límite de 5/minuto de
    SlowAPI (ver backend/routers/auth.py) es por-estudiante, no un techo
    global. Lanzar aquí cientos de "logins" desde el único host de prueba
    solo mediría ese rate limiter, no la capacidad real del sistema.
    """

    fixed_count = 2
    wait_time = between(10, 20)

    @task
    def login(self):
        est = random.choice(_state["estudiantes"])
        # username acepta email o cédula; se usa cédula porque no se guardó el email aquí.
        self.client.post(
            "/api/auth/login",
            json={"username": est["cedula"], "password": UNIVERSAL_PASSWORD},
            name="/api/auth/login",
        )
