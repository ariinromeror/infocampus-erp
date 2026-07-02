# Load testing — Fase 5 (validación de capacidad)

Script de carga con [Locust](https://locust.io) que simula el escenario más
exigente de InfoCampus ERP para ~800 estudiantes: **apertura de matrícula /
cierre de pagos**, con:

- ~790 estudiantes concurrentes consultando repetidamente su portal
  (dashboard, horario, notas, estado de cuenta, inscripciones) — el patrón
  real de tráfico estudiantil en este sistema, donde la matrícula la procesa
  secretaría, no el propio alumno.
- 4 usuarios `administrativo` concurrentes procesando inscripciones
  (`POST /api/administrativo/inscribir-estudiante`).
- 3 usuarios `tesorero` concurrentes registrando pagos y consultando KPIs.
- 2 usuarios ejercitando el endpoint real de login (`POST /api/auth/login`,
  con verificación bcrypt real) a concurrencia baja y deliberada — ver la
  nota sobre rate limiting más abajo.

Ver el docstring de [`locustfile.py`](./locustfile.py) para el detalle de
cada tarea y las decisiones de diseño.

## Por qué no se simulan 800 logins HTTP concurrentes

`POST /api/auth/login` está protegido con `5/minute` por IP (SlowAPI, ver
`backend/routers/auth.py`), a propósito, para frenar fuerza bruta. En
producción real, 800 estudiantes llegan desde ~800 IPs distintas: ese límite
es por-estudiante y no los afecta entre sí. Un load test lanzado desde un
único host de prueba sí comparte una sola IP — si cada "estudiante virtual"
intentara loguearse por HTTP, el 99 % recibiría `429` y el test terminaría
midiendo el rate limiter en vez de la capacidad real del backend.

Por eso el grueso de la carga (`EstudianteUser`) usa tokens JWT generados
localmente (mismo algoritmo/secreto que el backend bajo prueba) para
representar sesiones ya iniciadas — el estado normal de cientos de
estudiantes que ya abrieron sesión y ahora refrescan su portal al abrirse la
matrícula. El login real se mide aparte, con concurrencia baja (`LoginUser`,
`fixed_count = 2`), documentando el límite explícitamente.

## Cómo ejecutar

### 1. Base de datos con datos de prueba

Usa una base Postgres (local, contenedor, o Supabase de **staging**, nunca
producción) sembrada con `scripts_db/populate.py`:

```bash
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/infocampus_loadtest
cd scripts_db && pip install -r requirements.txt && python populate.py
```

### 2. Backend bajo prueba

Arranca el backend apuntando a esa misma base, con la configuración de
workers/pool que quieras validar (ver `docs/DEPLOY.md` para el significado
de cada variable):

```bash
cd backend
export DATABASE_URL=... SECRET_KEY_AUTH=... ENVIRONMENT=production ALLOWED_ORIGINS=http://localhost
export WEB_CONCURRENCY=2 DB_POOL_MIN_SIZE=2 DB_POOL_MAX_SIZE=20
gunicorn main:app -w $WEB_CONCURRENCY -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120
```

### 3. Locust

```bash
cd backend/loadtest
pip install -r requirements.txt

# MISMO DATABASE_URL/SECRET_KEY_AUTH/ALGORITHM que el backend del paso 2,
# para que los JWT generados aquí sean válidos contra ese proceso.
export DATABASE_URL=... SECRET_KEY_AUTH=... ALGORITHM=HS256

locust -f locustfile.py --headless -u 800 -r 40 -t 3m \
    --host http://127.0.0.1:8000 --csv=resultados/mi_corrida
```

- `-u 800`: usuarios concurrentes totales (≈790 van a `EstudianteUser`, el
  resto a `AdministrativoUser`/`TesoreroUser`/`LoginUser` vía `fixed_count`).
- `-r 40`: *spawn rate* (usuarios nuevos/segundo) — evita un arranque
  instantáneo de 800 conexiones que no reflejaría un pico real.
- `--csv=resultados/...`: exporta `_stats.csv`, `_failures.csv`, etc. Este
  directorio está en `.gitignore`: no se versionan resultados crudos porque
  son específicos de la máquina/entorno donde se corrieron.

También se puede correr con interfaz web (`locust -f locustfile.py --host
...`, sin `--headless`) para observar gráficas en tiempo real en
`http://localhost:8089`.

## Resultados de referencia (entorno local, ver caveat)

Corridas de 2–3 minutos, `-u 800 -r 40/80`, contra Postgres 16 local
(sin latencia de red) en una VM de 4 vCPU / 15 GB RAM, ~190 estudiantes /
587 secciones sembrados con `populate.py`:

| Configuración | Total requests | Throughput | p50 | p95 | p99 | Tasa de error |
|---|---|---|---|---|---|---|
| 2 workers, `DB_POOL_MAX_SIZE=20` (default) | 67 772 | 377 req/s | 6 ms | 20 ms | 88 ms | 0.02 % |
| 4 workers, `DB_POOL_MAX_SIZE=20` | 67 757 | 377 req/s | 6 ms | 14 ms | 71 ms | 0.02 % |
| 2 workers, `DB_POOL_MAX_SIZE=3` (adrede subdimensionado) | 45 967 | 383 req/s | 6 ms | 26 ms | 170 ms | 0.02 % |

Los pocos errores observados (~0.02 %, `ConnectionResetError` /
`RemoteDisconnected`) ocurren durante el *ramp-up* inicial (los primeros
~20 s mientras se abren las 800 conexiones) y no escalan con la duración de
la corrida; no son indicativos de un problema de capacidad sostenida.

Además, un microbenchmark aislado de la verificación bcrypt (`rounds=12`,
igual que `backend/routers/auth.py`) en la misma VM mostró que el
**throughput de logins reales escala linealmente con núcleos de CPU física,
no con el número de workers de Gunicorn**, y se satura en ese límite:

| Hilos concurrentes | Verificaciones bcrypt/s |
|---|---|
| 1 | 4.6 |
| 2 | 9.2 |
| 4 (= núcleos físicos de la VM) | 18.3 |
| 8 | 18.4 (sin mejora: saturado por CPU) |

### Caveat importante: esto NO reemplaza una corrida en staging

Estos números validan **corrección** (sin deadlocks, sin fugas de
conexión, manejo correcto de RBAC/JWT bajo concurrencia) y dan una
**cota de throughput de referencia para el hardware usado**, pero
**subestiman la presión real sobre el pool de conexiones**: Postgres local
responde en <1 ms, mientras que Supabase en producción añade latencia de
red real (típicamente 10–40 ms por *round trip*, según región — por eso
`render.yaml` fija la región `frankfurt`, cercana a Supabase `eu-west-1`).
Con latencia de red real, cada conexión del pool queda "ocupada" mucho más
tiempo por request, y el pool sí puede saturarse en escenarios donde aquí no
lo hizo. **Antes de un evento real de matrícula con 800 estudiantes, se debe
repetir esta misma corrida contra un entorno de staging con Render + Supabase
de pago reales**, observando `GET /api/health` (campo `db_pool`) y las
métricas de Sentry/Prometheus durante la prueba.

## Recomendaciones de dimensionamiento

1. **CPU, no solo workers, para el login**: la verificación bcrypt es
   *CPU-bound* y su throughput está limitado por núcleos físicos, no por
   `WEB_CONCURRENCY`. Si se esperan ráfagas de cientos de logins en una
   ventana corta (apertura de matrícula), contratar un plan de Render con
   ≥2, idealmente 4 vCPU dedicadas (no *burstable*/compartidas).
2. **Pool de DB**: mantener la regla de Fase 3 —
   `WEB_CONCURRENCY × DB_POOL_MAX_SIZE` no debe exceder el límite de
   conexiones del plan de Supabase contratado — y monitorear
   `GET /api/health` → `db_pool.in_use / db_pool.max_size` durante la
   corrida en staging; si se acerca sostenidamente al 90 %+, subir
   `DB_POOL_MAX_SIZE` (o reducir `WEB_CONCURRENCY` y compensar con más
   instancias si el plan de Render lo permite).
3. **Monitoreo específico de `/api/auth/login`** durante ventanas reales de
   matrícula: el rate limiter por IP (Fase 0) protege contra fuerza bruta,
   pero **no** protege contra el costo agregado de CPU de cientos de
   estudiantes *distintos* logueándose casi al mismo tiempo. Configurar una
   alerta (Sentry Performance o Prometheus, ver `docs/DEPLOY.md`) si el p95
   de latencia de login supera un umbral (p.ej. 2 s).
4. **Mitigación de UX, no solo de infraestructura**: si el volumen de
   estudiantes crece significativamente más allá de 800, considerar un
   patrón de "apertura escalonada" (franjas horarias por semestre/carrera)
   en vez de abrir la matrícula para todos a la vez — reduce el pico de
   logins concurrentes sin necesitar más CPU.
