# Paso a paso: Desplegar InfoCampus ERP en Render + Vercel

---

## Requisitos previos

- Cuenta en [Render](https://render.com)
- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub con el código actualizado
- Base de datos en Supabase (ya configurada)

---

## Parte 1: Backend en Render

### Paso 1.1 — Crear Web Service

1. Entra a [Render Dashboard](https://dashboard.render.com)
2. **New +** → **Web Service**
3. Conecta tu repositorio de GitHub (autoriza si es la primera vez)
4. Selecciona el repo **infocampus_erp** (o el nombre que tenga)

### Paso 1.2 — Configurar el servicio

| Campo | Valor |
|-------|-------|
| **Name** | `infocampus-api` (o el que prefieras) |
| **Region** | Oregon (US West) o el más cercano |
| **Branch** | `main` |
| **Root Directory** | `infocampus-erp` (si el backend está en esa carpeta) o dejar vacío si el backend está en la raíz |
| **Runtime** | `Python 3` |

### Paso 1.3 — Build & Start

| Campo | Valor |
|-------|-------|
| **Build Command** | `pip install -r backend/requirements.txt` |
| **Start Command** | Ver opciones abajo según tu Root Directory |

**Usar siempre** (el backend usa imports relativos como `from config import settings`):

```
cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

> No uses `gunicorn backend.main:app` — falla con `ModuleNotFoundError: No module named 'config'` porque Python no encuentra los módulos del backend.

> **Importante:** `--bind 0.0.0.0:$PORT` es obligatorio en Render. Sin esto, la app no escuchará en el puerto correcto y fallará el deploy.

### Paso 1.4 — Variables de entorno

En **Environment** → **Add Environment Variable** añade:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://...` (tu URL de Supabase) |
| `SECRET_KEY_AUTH` | Una clave larga y aleatoria (ej. 32+ caracteres) |
| `ALGORITHM` | `HS256` |
| `ALLOWED_ORIGINS` | `https://tu-app.vercel.app` (la URL de Vercel, la añadirás después) |
| `GROQ_API_KEY` | (Opcional) Tu clave de Groq para el chatbot Eva |

### Paso 1.5 — Deploy

1. **Create Web Service**
2. Espera a que termine el build (2–5 min)
3. Cuando termine, copia la URL del servicio (ej. `https://infocampus-api.onrender.com`)

### Paso 1.6 — Verificar

- Abre `https://tu-url.onrender.com/api/health` → debe responder `{"status":"ok"}`
- Abre `https://tu-url.onrender.com/docs` → debe cargar Swagger

---

## Parte 2: Frontend en Vercel

### Paso 2.1 — Importar proyecto

1. Entra a [Vercel Dashboard](https://vercel.com/dashboard)
2. **Add New** → **Project**
3. Importa tu repositorio de GitHub (autoriza si es la primera vez)
4. Selecciona el repo **infocampus_erp**

### Paso 2.2 — Configurar el proyecto

| Campo | Valor |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `infocampus-erp/frontend` (o `frontend` si está en la raíz) |
| **Build Command** | `npm run build` (por defecto) |
| **Output Directory** | `dist` (por defecto) |
| **Install Command** | `npm install` (por defecto) |

### Paso 2.3 — Variables de entorno

En **Environment Variables** añade:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://tu-url.onrender.com` (la URL de Render del paso 1.5) |

### Paso 2.4 — Deploy

1. **Deploy**
2. Espera a que termine el build (1–2 min)
3. Copia la URL de tu app (ej. `https://infocampus-erp.vercel.app`)

### Paso 2.5 — Actualizar CORS en Render

1. Vuelve a Render → tu backend
2. **Environment** → edita `ALLOWED_ORIGINS`
3. Pon: `https://tu-app.vercel.app` (la URL real de Vercel)
4. **Save Changes** → Render hará un redeploy automático

---

## Parte 3: Verificación final

### Checklist

- [ ] Render: `https://tu-api.onrender.com/api/health` → 200 OK
- [ ] Render: `https://tu-api.onrender.com/docs` → Swagger carga
- [ ] Vercel: La app carga sin errores
- [ ] Login: Probar con cada rol (director, coordinador, profesor, estudiante, tesorero, secretaria)
- [ ] Dashboards: Cargan sin errores 500
- [ ] Chat Eva: Responde (si configuraste GROQ_API_KEY)
- [ ] Reportes PDF: Se generan correctamente

### Si el login falla

- Revisa que `ALLOWED_ORIGINS` en Render incluya exactamente la URL de Vercel (con `https://`)
- Revisa que `VITE_API_URL` en Vercel apunte a la URL de Render (con `https://`)

### Si Render se "duerme"

- Render en plan gratuito pone la app en sleep tras ~15 min sin tráfico
- La primera petición puede tardar 30–60 s en "despertar"
- Para producción continua, considera plan de pago

---

## Resumen rápido

| Paso | Render | Vercel |
|------|--------|--------|
| 1 | New Web Service → Conectar repo | Add Project → Conectar repo |
| 2 | Build: `pip install -r backend/requirements.txt` | Root: `frontend` |
| 3 | Start: `gunicorn main:app ...` | Build: `npm run build` |
| 4 | Variables: DATABASE_URL, SECRET_KEY_AUTH, ALLOWED_ORIGINS | Variable: VITE_API_URL |
| 5 | Deploy → Copiar URL | Deploy → Copiar URL |
| 6 | Actualizar ALLOWED_ORIGINS con URL de Vercel | — |

---

## URLs de referencia

- **Render:** https://dashboard.render.com
- **Vercel:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard (para DATABASE_URL)
