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

4. **Verify:** `https://your-api.onrender.com/api/health` → `{"status":"ok"}`

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
