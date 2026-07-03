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
| `ALGORITHM` | `HS256` |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` (add after Vercel deploy) |
| `GROQ_API_KEY` | (Optional) For chatbot Eva |
| `SENTRY_DSN` | (Optional) Backend error tracking — see [Observability](#observability-sentry) |
| `ENVIRONMENT` | (Optional) `production` — tags Sentry events by environment |

4. **Verify:** `https://your-api.onrender.com/api/health` → `{"status":"ok"}`

---

## Database migrations (Alembic)

RQ-03 (`docs/PRD.md`): the schema is versioned with Alembic under `backend/alembic/versions/`. `backend/main.py` runs `alembic upgrade head` automatically on every startup (see `backend/db_migrations.py`), coordinated across Gunicorn workers with a PostgreSQL advisory lock — **no manual step is required for a normal deploy.**

Manual commands (useful for local debugging or a one-off manual migration):

```bash
cd backend
export DATABASE_URL="<your Supabase/production connection string>"

alembic current       # shows the revision currently applied to this database
alembic history       # full migration history
alembic upgrade head  # apply any pending migrations manually
alembic downgrade -1  # revert the most recent migration
```

### Adopting Alembic on an already-running database

The existing Render/Supabase database was originally created by `scripts_db/populate.py` (before RQ-03), not by Alembic — it already has the tables, just no `alembic_version` row. Both initial migrations (`0001_initial_schema`, `0002_revoked_tokens`) use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` specifically so this is safe: the **first** deploy after this change can simply run `alembic upgrade head` as usual (via the app's own startup hook) — it will find the tables already there, skip creating them, and just record `0002` as the current revision. No `alembic stamp` step or manual intervention is needed.

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

3. **Environment variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-api.onrender.com/api` |
| `VITE_SENTRY_DSN` | (Optional) Frontend error tracking — see [Observability](#observability-sentry) |

4. **Deploy** → Copy app URL
5. **Update Render:** Set `ALLOWED_ORIGINS` to your Vercel URL

---

## Observability (Sentry)

RQ-10 (`docs/PRD.md`): error tracking is **entirely optional**. Without a DSN configured, both the backend and the frontend run exactly as before — no crashes, no degraded behavior, just no error reporting.

### Backend

1. Create a project in [Sentry](https://sentry.io) (platform: **Python → FastAPI**).
2. Copy its DSN.
3. In Render → your service → **Environment**, add:
   - `SENTRY_DSN` = `https://xxxxx@oyyyyy.ingest.sentry.io/zzzzz`
   - `ENVIRONMENT` = `production`
4. Redeploy. Unhandled exceptions caught by the global exception handler (`backend/main.py`) are now sent to Sentry tagged with `request_id`, `endpoint`, `method`, and the authenticated user's `id`/role (when available).

### Frontend

1. Create a second Sentry project (platform: **React**), or reuse the same organization.
2. In Vercel → your project → **Environment Variables**, add:
   - `VITE_SENTRY_DSN` = `https://xxxxx@oyyyyy.ingest.sentry.io/wwwww`
3. Redeploy. Unhandled React errors caught by `ErrorBoundary` (`frontend/src/components/ErrorBoundary.jsx`) are now reported to Sentry.

### Structured logs (no Sentry account needed)

Independently of Sentry, the backend always logs as JSON (one object per line: `timestamp`, `level`, `logger`, `message`, `request_id`, plus contextual fields like `endpoint`/`user_rol` where relevant). Render's log viewer displays these lines as-is; pipe them into any log aggregator that understands JSON (Better Stack, Datadog, etc.) if you outgrow Render's built-in viewer.

Every response also carries an `X-Request-ID` header — ask a user to report it and grep it directly in the logs (or in a Sentry event's tags) to find the exact request that failed.

---

## Checklist

- [ ] Render: `/api/health` returns 200
- [ ] Vercel: App loads
- [ ] Login works for all roles
- [ ] Dashboards load without 500 errors

**Note:** Render free tier sleeps after ~15 min idle. First request may take 30–60s to wake.
