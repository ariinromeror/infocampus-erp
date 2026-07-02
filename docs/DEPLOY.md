# Deployment Guide — Render + Vercel

## Prerequisites

- [Render](https://render.com) account
- [Vercel](https://vercel.com) account
- GitHub repo with code
- Supabase database configured

---

## Backend (Render)

1. **New** → **Web Service** → Connect GitHub repo
2. **Settings:**

| Field | Value |
|-------|-------|
| Root Directory | `infocampus-erp` |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT` |

3. **Environment variables:**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase connection string |
| `SECRET_KEY_AUTH` | Random 32+ char string |
| `ENVIRONMENT` | `production` (obligatorio: sin esto, o sin `ALLOWED_ORIGINS`, la API rechaza todo origen cross-origin en vez de abrir un wildcard) |
| `ALGORITHM` | `HS256` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (**obligatorio en producción**, no hay fallback a wildcard) |
| `GROQ_API_KEY` | (Optional) For chatbot Eva |
| `REDIS_URL` | (Optional) Habilita cache y cola de background jobs — ver sección "Escalabilidad" |
| `DB_POOL_MIN_SIZE` / `DB_POOL_MAX_SIZE` | (Optional) Por defecto `1`/`20` — ver sección "Escalabilidad" |
| `WEB_CONCURRENCY` | (Optional) Workers de Gunicorn, por defecto `2` — ver sección "Escalabilidad" |

4. **Verify:** `https://your-api.onrender.com/api/health` → `{"status":"ok"}`

### Despliegue alternativo con Docker

`backend/Dockerfile` permite desplegar el backend como contenedor (Render Settings → Build → Docker) en vez del buildpack nativo de Python, útil para paridad exacta entre CI, staging y producción. El `CMD` por defecto usa 2 workers Gunicorn; ajustar `-w` según CPU disponible en el plan contratado (regla general: `2 × núcleos + 1`), recordando que el total de conexiones a Postgres es `workers × DB_POOL_MAX_SIZE`.

---

## Escalabilidad (Redis, background jobs, dimensionamiento)

### Pool de conexiones y workers de Gunicorn

- `DB_POOL_MIN_SIZE` / `DB_POOL_MAX_SIZE` (backend/database.py, por defecto 1/20)
  controlan el pool `asyncpg` de cada proceso worker.
- `WEB_CONCURRENCY` (Procfile/render.yaml/Dockerfile, por defecto 2) controla
  los workers de Gunicorn.
- **Regla crítica**: el total de conexiones a Postgres es
  `WEB_CONCURRENCY × DB_POOL_MAX_SIZE`. Con pgbouncer en modo *transaction
  pooling* (el que usa Supabase), esto no debe exceder el límite de
  conexiones del plan contratado. Ejemplo: plan con límite de 60 conexiones →
  con `WEB_CONCURRENCY=3`, `DB_POOL_MAX_SIZE` no debería superar ~15-18 para
  dejar margen a migraciones/scripts puntuales.
- Regla general para `WEB_CONCURRENCY`: `2 × núcleos_CPU + 1`, ajustar según
  el plan de Render contratado.

### Cache (Redis)

`REDIS_URL` es **opcional**: si no está configurado, todo el sistema
funciona igual, solo sin estas optimizaciones (se lee siempre de Postgres).
Ver `backend/cache.py` (cliente) — degrada de forma segura ante cualquier
error de Redis, nunca rompe un request.

Qué se cachea hoy:

| Qué | Dónde | TTL | Invalidación |
|---|---|---|---|
| Revocación de tokens | `backend/auth/jwt_handler.py` | corto (30s) para "no revocado", vida del access token para "revocado" | `revoke_token()` escribe el cache de inmediato al hacer logout |
| Configuración institucional (`configuracion_ia`) | `backend/services/configuracion_cache.py`, usado en `routers/ia_context.py` | 300s | `routers/director_router.py::actualizar_configuracion` invalida al escribir |
| Dashboard institucional (`/api/dashboards/institucional`) | `backend/routers/dashboards.py` | 60s | ninguna (TTL corto, dato agregado que cambia constantemente) |

El caso de la revocación de tokens es el de mayor impacto: mitiga el costo
del fail-closed de Fase 0 (antes, cada request autenticado hacía una query a
Postgres solo para comprobar revocación; ahora resuelve desde Redis en la
gran mayoría de los casos, liberando conexiones del pool para el resto de
queries de negocio).

### Background jobs (arq sobre Redis)

`backend/services/task_queue.py` implementa una cola ligera con
[arq](https://arq-docs.helpmanual.io/) para trabajos que no deben bloquear
el ciclo request/response: hoy, la **generación masiva de boletines de
notas** al cierre de un período (potencialmente cientos de PDFs para ~800
estudiantes a la vez).

- `POST /api/reportes/boletines/lote?periodo_id=<id>` (director/admin/coordinador)
  encola el trabajo y devuelve `{"job_id": "..."}` de inmediato.
- `GET /api/reportes/boletines/lote/{job_id}` consulta el estado
  (`deferred`/`queued`/`in_progress`/`complete`/`not_found`).
- `GET /api/reportes/boletines/lote/{job_id}/descargar` descarga el `.zip`
  una vez que el estado es `complete`.
- Los reportes individuales (certificado, estado de cuenta, boletín
  individual, tesorería) **siguen siendo síncronos a propósito**: ahí el
  usuario espera una descarga inmediata, así que no tiene sentido encolarlos.

**Requiere un proceso worker separado** del proceso web, corriendo:

```bash
cd backend && arq services.task_queue.WorkerSettings
```

En Render, esto es el servicio `infocampus-backend-worker` (`type: worker`)
definido en `render.yaml` — requiere un plan de pago (los *background
workers* no están disponibles en el plan free) y el mismo `REDIS_URL` que el
servicio web. Sin el worker corriendo, los trabajos quedan en estado
`queued` indefinidamente (no fallan, simplemente nadie los procesa).

Los `.zip` generados se guardan en `backend/generated_reports/` (filesystem
local del proceso worker). En Render el filesystem es efímero entre
deploys/reinicios: esto es intencional para un job de vida corta que se
descarga poco después de generarse, no para archivado a largo plazo. Si se
necesita persistencia duradera, cambiar el almacenamiento en
`services/task_queue.py` a un bucket (S3/Supabase Storage) sin tocar los
endpoints que lo consumen.

---

## Migraciones de base de datos

El esquema real vive en `backend/migrations/*.sql` (archivos versionados, numerados
`NNN_descripcion.sql`), **no** en `scripts_db/populate.py`. `populate.py` solo hace
*seed* de datos demo sobre el esquema que crean estas migraciones.

### Cómo se aplican

- **Automáticamente al arrancar el backend**: el `lifespan` de `backend/main.py`
  llama a `apply_pending_migrations_async` (`backend/migrations_runner.py`) antes de
  aceptar tráfico. Usa un `pg_advisory_lock` para que, si arrancan varios workers de
  Gunicorn/Render a la vez, solo uno aplique las migraciones pendientes (evita
  condiciones de carrera/deadlocks).
- **Manualmente (recomendado antes de un deploy a producción)**: desde `backend/`,

  ```bash
  # Ver qué migraciones están pendientes sin aplicar nada
  python -m scripts.apply_migrations --dry-run

  # Aplicar las pendientes
  python -m scripts.apply_migrations
  ```

  Apuntando `DATABASE_URL` al entorno que corresponda (staging primero, luego
  producción). Útil para separar el paso de migración de esquema del deploy de
  código en un pipeline de CI/CD, o para depurar qué migraciones faltan.
- Las migraciones aplicadas quedan registradas en `public.schema_migrations`
  (`version`, `applied_at`); el runner solo ejecuta las que no estén ahí.

### Cómo añadir una migración nueva

1. Crear `backend/migrations/<NNN>_<descripcion>.sql` con el siguiente número
   correlativo (3+ dígitos, cero-rellenado), p.ej. `002_add_columna_x.sql`.
2. Escribir el SQL de forma **idempotente**: `CREATE TABLE IF NOT EXISTS`,
   `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`,
   `ON CONFLICT DO NOTHING`, etc. Así es seguro re-ejecutar el archivo si algo
   falla a mitad de camino.
3. Probar localmente contra una base de datos de staging/desarrollo con
   `python -m scripts.apply_migrations --dry-run` y luego sin `--dry-run`.
4. **Nunca editar** un archivo de migración que ya se aplicó en staging o
   producción: si el esquema necesita cambiar más, se crea una migración nueva.
   Editar un archivo ya aplicado hace que `schema_migrations` (que solo guarda
   el nombre de archivo) y el contenido real del `.sql` diverjan entre entornos
   sin que nada lo detecte.

### Rollback

No hay "down migrations" automáticas (incluso herramientas como `dbmate` o
`golang-migrate` recomiendan evitarlas en producción porque un rollback
automático de un `DROP COLUMN`/`DROP TABLE` implica pérdida de datos). El
procedimiento recomendado:

1. **Antes de aplicar en producción**: aplicar siempre primero contra el
   Supabase de staging con datos representativos, y correr la suite de tests
   (`pytest`) contra ese esquema si es posible.
2. **Si una migración ya aplicada resulta problemática**: escribir una nueva
   migración correctiva (`00N+1_revertir_x.sql`) que deshaga el cambio de forma
   explícita (p.ej. `ALTER TABLE ... DROP COLUMN IF EXISTS`, recrear un índice
   con otra definición). Esto mantiene el historial auditable en
   `schema_migrations` y evita ejecutar SQL "a mano" fuera del sistema de
   versionado.
3. **Si el problema es de datos, no de esquema** (p.ej. una migración con `UPDATE`
   incorrecto): restaurar desde backup/PITR (ver siguiente sección) en vez de
   intentar revertir con otra migración, para evitar corrupción adicional.

### Backups y Point-in-Time Recovery (Supabase)

Con un plan de pago de Supabase (Pro o superior):

1. **Habilitar PITR**: Panel de Supabase → *Database* → *Backups* → activar
   *Point in Time Recovery*. Esto permite restaurar la base de datos a
   cualquier segundo dentro de la ventana de retención contratada (varía según
   plan), no solo al snapshot diario.
2. **Backups automáticos diarios**: incluidos en los planes de pago; verificar
   la ventana de retención (por defecto 7 días en Pro, ampliable) en el mismo
   panel.
3. **Antes de aplicar una migración en producción**: aunque PITR cubre el
   rollback ante errores, sigue siendo buena práctica tomar nota de la hora
   exacta antes de aplicar cambios de esquema en producción, para acotar la
   ventana de restauración si algo sale mal.
4. **Restaurar**: Panel de Supabase → *Database* → *Backups* → seleccionar
   punto en el tiempo → *Restore*. Esto crea un nuevo proyecto/branch con los
   datos restaurados (revisar la documentación de Supabase vigente para el
   flujo exacto, ya que puede variar entre "restaurar en el mismo proyecto" y
   "restaurar como proyecto nuevo" según el plan).
5. Estos backups son complementarios, no sustituyen probar migraciones en
   staging antes de producción.

---

## Frontend (Vercel)

1. **Add New** → **Project** → Connect GitHub repo
2. **Settings:**

| Field | Value |
|-------|-------|
| Root Directory | `infocampus-erp/frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

3. **Environment variable:** `VITE_API_URL` = `https://your-api.onrender.com/api`
4. **Deploy** → Copy app URL
5. **Update Render:** Set `ALLOWED_ORIGINS` to your Vercel URL

---

## Checklist

- [ ] Render: `/api/health` returns 200
- [ ] Vercel: App loads
- [ ] Login works for all roles
- [ ] Dashboards load without 500 errors

**Note:** Render free tier sleeps after ~15 min idle. First request may take 30–60s to wake.

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` corre en cada PR/push a `main`:

- **backend**: `ruff check .` + `pytest` (bloqueante).
- **frontend**: `npm run build` (bloqueante) y `npm run lint` (no bloqueante por ahora).

### Deuda de lint conocida (no bloqueante)

El lint del frontend fue saneado de 95 a 0 errores (ver `eslint.config.js`), pero quedan
~25 *warnings* de `eslint-plugin-react-hooks` v7 que requieren revisión manual caso por
caso antes de convertirlos en errores bloqueantes:

- `react-hooks/set-state-in-effect`: varios componentes llaman a un setter de estado de
  forma síncrona dentro de un `useEffect` (patrón pre-existente, funciona en producción,
  pero no sigue la guía actual de React). Revisar y migrar a inicialización directa de
  estado o a un patrón de sincronización explícito.
- `react-hooks/exhaustive-deps`: varios `useEffect` omiten dependencias intencionalmente
  (para evitar loops de refetch). Revisar caso por caso si el `useCallback`/`useMemo`
  correspondiente ya estabiliza la dependencia antes de agregarla al arreglo.
- `react-refresh/only-export-components` en `AuthContext.jsx`: exporta el componente
  `AuthProvider` y el hook `useAuth` desde el mismo archivo. Separarlos requiere
  actualizar todos los imports de `useAuth` en la app (~40+ archivos).

Ninguno de estos afecta el comportamiento actual en producción; se documentan aquí para
que un cambio futuro los aborde con el tiempo de revisión adecuado.
