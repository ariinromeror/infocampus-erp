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

4. **Verify:** `https://your-api.onrender.com/api/health` → `{"status":"ok"}`

### Despliegue alternativo con Docker

`backend/Dockerfile` permite desplegar el backend como contenedor (Render Settings → Build → Docker) en vez del buildpack nativo de Python, útil para paridad exacta entre CI, staging y producción. El `CMD` por defecto usa 2 workers Gunicorn; ajustar `-w` según CPU disponible en el plan contratado (regla general: `2 × núcleos + 1`), recordando que el total de conexiones a Postgres es `workers × DB_POOL_MAX_SIZE`.

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
