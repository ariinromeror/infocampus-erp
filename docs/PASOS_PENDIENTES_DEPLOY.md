# Pasos que te faltan para que todo funcione

Guía paso a paso, muy simple.

---

## PARTE 1: Arreglar el backend en Render

### Paso 1 — Arreglar el comando de inicio

1. Entra a **Render** → https://dashboard.render.com
2. Haz clic en tu servicio **infocampus-backend**
3. En el menú de la izquierda, haz clic en **Settings**
4. Baja hasta la sección **Build & Deploy**
5. Busca el cuadro que dice **Start Command**
6. Haz clic en **Edit** (o el lápiz)
7. **Borra** todo lo que hay
8. **Escribe** exactamente esto (copia y pega):

   ```
   cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
   ```

9. Haz clic en **Save Changes**
10. Render va a reiniciar tu backend solo. Espera 1–2 minutos.

---

### Paso 2 — Añadir la variable ALLOWED_ORIGINS

1. Sigue en Render, en tu servicio **infocampus-backend**
2. En el menú de la izquierda, haz clic en **Environment**
3. Haz clic en el botón **Add Environment Variable** (arriba a la derecha)
4. En **Key** escribe: `ALLOWED_ORIGINS`
5. En **Value** escribe: `https://ariinromeror-infocampus-erp.vercel.app`
6. Haz clic en **Save Changes**
7. Render va a reiniciar de nuevo. Espera 1–2 minutos.

---

## PARTE 2: Revisar el frontend en Vercel

### Paso 3 — Verificar la variable VITE_API_URL

1. Entra a **Vercel** → https://vercel.com/dashboard
2. Haz clic en tu proyecto **ariinromeror-infocampus-erp**
3. Arriba, haz clic en **Settings**
4. En el menú de la izquierda, haz clic en **Environment Variables**
5. Busca si existe una variable llamada **VITE_API_URL**

**Si NO existe:**
- Haz clic en **Add New**
- En **Key** escribe: `VITE_API_URL`
- En **Value** escribe la URL de tu backend en Render. Ejemplo:
  ```
  https://infocampus-backend.onrender.com
  ```
  *(Cambia "infocampus-backend" por el nombre real de tu servicio en Render si es diferente)*
- Marca **Production**
- Haz clic en **Save**

**Si SÍ existe:**
- Verifica que el valor sea la URL de tu backend (empieza con `https://` y termina en `.onrender.com`)
- Si la cambiaste, necesitas hacer un redeploy (Paso 4)

---

### Paso 4 — Hacer redeploy (solo si cambiaste VITE_API_URL)

1. Sigue en Vercel, en tu proyecto
2. Haz clic en **Deployments** (en el menú de la izquierda)
3. En el último deployment (el de arriba), haz clic en los **tres puntitos** ⋮
4. Haz clic en **Redeploy**
5. Marca **Use existing Build Cache** (opcional, más rápido)
6. Haz clic en **Redeploy**
7. Espera 1–2 minutos hasta que diga **Ready**

---

## PARTE 3: Probar que todo funciona

### Paso 5 — Probar el backend

1. Abre una pestaña nueva en el navegador
2. Ve a: `https://TU-URL-DE-RENDER.onrender.com/api/health`
   *(Sustituye TU-URL-DE-RENDER por la URL real, ej: infocampus-backend.onrender.com)*
3. Deberías ver algo como: `{"status":"ok"}` o similar
4. Si ves eso → el backend está bien ✅

---

### Paso 6 — Probar el login

1. Ve a: https://ariinromeror-infocampus-erp.vercel.app
2. Escribe tu usuario y contraseña
3. Haz clic en **INGRESAR A LA CUENTA**
4. Si entras al dashboard → todo está bien ✅
5. Si sale error de red o "CORS" → vuelve al Paso 2 y Paso 3 y revisa las URLs

---

## Resumen de lo que cambiaste

| Dónde | Qué hiciste |
|-------|-------------|
| Render → Settings | Arreglaste el Start Command (añadiste `--bind 0.0.0.0:$PORT`) |
| Render → Environment | Añadiste `ALLOWED_ORIGINS` con la URL de Vercel |
| Vercel → Environment | Verificaste o añadiste `VITE_API_URL` con la URL de Render |
| Vercel → Deployments | Redeploy si cambiaste variables |

---

## Si algo falla

- **El backend no arranca:** Revisa los **Logs** en Render (menú izquierda) y busca el error en rojo.
- **El login no funciona:** Revisa que `VITE_API_URL` en Vercel sea exactamente la URL de Render (con `https://`).
- **Error de CORS:** Revisa que `ALLOWED_ORIGINS` en Render sea exactamente `https://ariinromeror-infocampus-erp.vercel.app` (sin barra al final).
