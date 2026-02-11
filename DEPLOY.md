# 🚀 Guía de Despliegue - InfoCampus ERP

Guía completa para desplegar el sistema en producción.

---

## 📋 Pre-requisitos

- Cuenta en [Render](https://render.com) (Backend)
- Cuenta en [Vercel](https://vercel.com) (Frontend)
- Cuenta en [Supabase](https://supabase.com) (Base de datos)
- Repositorio en GitHub con el código

---

## 1️⃣ RENDER (Backend FastAPI)

### Configuración del Servicio Web

**En el Dashboard de Render, crea un nuevo "Web Service":**

#### Build Command:
```bash
cd backend && pip install -r requirements.txt
```

#### Start Command:
```bash
gunicorn backend.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

#### Variables de Entorno (Environment Variables):
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SECRET_KEY_AUTH=tu_clave_secreta_de_32_caracteres_minimo
ALLOWED_ORIGINS=https://tu-frontend.vercel.app,https://tu-frontend-git-main-tuusuario.vercel.app
```

#### Configuración Avanzada:
- **Root Directory:** (dejar en blanco o poner `./`)
- **Runtime:** Python 3
- **Plan:** Starter (o superior para producción)

### Explicación de Comandos:

```bash
gunicorn backend.main:app      # Módulo backend.main, aplicación app
-w 4                           # 4 workers (procesos paralelos)
-k uvicorn.workers.UvicornWorker  # Worker asíncrono para FastAPI
--bind 0.0.0.0:$PORT          # Puerto asignado por Render
```

**Nota importante:** Usamos `backend.main:app` en lugar de `cd backend && gunicorn main:app` para evitar errores de importación relativa. Esto permite que Python reconozca correctamente la estructura de paquetes.

### Troubleshooting Render:

**Error: "Module not found":**
- Verifica que `requirements.txt` esté en `backend/requirements.txt`
- Asegúrate de que el Build Command incluya `cd backend`

**Error: "Port already in use":**
- Usa `$PORT` (variable de entorno de Render), NO pongas un puerto fijo

**Error: "Database connection failed":**
- Verifica que `DATABASE_URL` esté correctamente configurado
- Asegúrate de que la IP de Render esté en la lista blanca de Supabase

---

## 2️⃣ SUPABASE (Base de Datos)

### Verificación de Esquema

**✅ BUENA NOTICIA:** El sistema FastAPI usa las tablas EXISTENTES de Django. NO necesitas migrar datos ni crear tablas nuevas.

#### Tablas Utilizadas:
El backend se conecta directamente a estas tablas de tu proyecto Django:

```sql
-- Tablas existentes que usa FastAPI:
public.usuarios          -- Usuarios y autenticación
public.carreras          -- Carreras universitarias
public.materias          -- Materias
public.periodos_lectivos -- Períodos académicos
public.secciones         -- Secciones de materias
public.inscripciones     -- Inscripciones de estudiantes
public.pagos             -- Registro de pagos
```

### Columnas Nuevas Opcionales (Auditoría)

**Si quieres habilitar la auditoría completa de notas**, ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Agregar columnas de auditoría a inscripciones (si no existen)
ALTER TABLE public.inscripciones 
ADD COLUMN IF NOT EXISTS nota_puesta_por_id INTEGER REFERENCES public.usuarios(id),
ADD COLUMN IF NOT EXISTS fecha_nota_puesta TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS nota_modificada_por_id INTEGER REFERENCES public.usuarios(id);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante ON public.inscripciones(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_seccion ON public.inscripciones(seccion_id);
CREATE INDEX IF NOT EXISTS idx_pagos_procesado_por ON public.pagos(procesado_por_id);
```

**Nota:** Si no agregas estas columnas, el sistema funcionará igual, pero no registrará quién puso cada nota.

### Configuración de Connection Pooling

En Supabase Dashboard:
1. Ve a "Database" → "Connection Pooling"
2. Activa "PgBouncer"
3. Usa el puerto **6543** en tu `DATABASE_URL` para pooling:

```bash
# Con connection pooling (recomendado para producción)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6542/postgres

# Sin pooling (solo desarrollo)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Configuración de Seguridad (RLS)

**IMPORTANTE:** Tu backend FastAPI se conecta con la SERVICE_ROLE_KEY (acceso total). Esto es correcto porque la lógica de permisos está en el backend, no en la base de datos.

Si quieres mantener RLS activado para otras aplicaciones, asegúrate de:
1. Usar `SERVICE_ROLE_KEY` en el backend
2. Mantener las políticas RLS para el cliente de Supabase del frontend (si lo usas)

---

## 3️⃣ VERCEL (Frontend React)

### Variables de Entorno

Crea el archivo `.env.production` en tu frontend:

```bash
# API URL (tu backend en Render)
VITE_API_URL=https://infocampus-api.onrender.com/api

# Otras variables si las necesitas
VITE_APP_NAME=InfoCampus ERP
VITE_APP_VERSION=2.0.0
```

### Configuración de Despliegue

**En Vercel Dashboard:**

1. **Import Project:** Conecta tu repositorio de GitHub
2. **Framework Preset:** Selecciona "Vite"
3. **Root Directory:** `frontend` (si tu frontend está en esa carpeta)
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`

### Variables en Vercel Dashboard:

```bash
VITE_API_URL=https://tu-backend.onrender.com/api
```

### Configuración de Dominio:

Una vez desplegado, Vercel te dará una URL como:
```
https://infocampus-erp.vercel.app
```

**Agrega esta URL a `ALLOWED_ORIGINS` en Render:**
```bash
ALLOWED_ORIGINS=https://infocampus-erp.vercel.app,https://infocampus-erp-git-main-tuusuario.vercel.app
```

---

## 4️⃣ EVA (Chatbot) - Actualización del System Prompt

Para que Eva consulte los nuevos endpoints de FastAPI en lugar de los antiguos de Django, actualiza el System Prompt en la Edge Function de Supabase:

### Archivo: `supabase/functions/chat/index.ts`

**System Prompt Actualizado:**

```typescript
const systemPrompt = `Eres Eva, asistente virtual de Info Campus.

CONTEXTO DEL SISTEMA:
- Backend: FastAPI en Render (https://tu-api.onrender.com)
- Base de datos: PostgreSQL en Supabase
- Autenticación: JWT tokens

CAPACIDADES:
1. Puedes consultar información académica del estudiante usando la API
2. Puedes verificar estado de cuenta y pagos
3. Puedes consultar inscripciones y calificaciones
4. Puedes informar sobre mora y deudas

REGLAS:
- Siempre responde en español
- Sé amable y profesional
- No compartas información sensible de otros estudiantes
- Si no tienes acceso a cierta información, indícalo claramente

API ENDPOINTS DISPONIBLES:
- GET /api/dashboards/resumen - Resumen del usuario
- GET /api/inscripciones/estudiante/mis-inscripciones - Mis materias
- GET /api/estudiantes/{id}/estado-cuenta - Estado financiero

Cuando el usuario pregunte por:
- Notas: Consulta /api/inscripciones/estudiante/mis-inscripciones
- Pagos/Deudas: Consulta /api/estudiantes/{id}/estado-cuenta
- Horarios: La información está en el dashboard`;
```

### Deployment de Edge Function:

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Deploy la función actualizada
supabase functions deploy chat

# Verificar logs
supabase functions logs chat --tail
```

---

## 5️⃣ VERIFICACIÓN POST-DEPLOY

### Checklist de Verificación:

#### Backend (Render):
- [ ] Health check: `https://tu-api.onrender.com/api/health` responde OK
- [ ] Docs: `https://tu-api.onrender.com/docs` carga Swagger UI
- [ ] Login funciona: POST `/api/auth/login` retorna token
- [ ] Dashboards cargan: GET `/api/dashboards/institucional` (con token)

#### Frontend (Vercel):
- [ ] Login funciona
- [ ] Redirección por rol funciona
- [ ] Dashboards muestran datos
- [ ] No hay errores de CORS en consola

#### Base de Datos (Supabase):
- [ ] Conexión estable
- [ ] Consultas rápidas (< 200ms)
- [ ] No hay errores de timeout

### Pruebas Manuales:

```bash
# 1. Test de login
curl -X POST https://tu-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Test de dashboard (reemplaza TOKEN)
curl https://tu-api.onrender.com/api/dashboards/institucional \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# 3. Test de PDF
curl https://tu-api.onrender.com/api/reportes/estado-cuenta/1 \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -o test.pdf
```

---

## 🔧 CONFIGURACIÓN DE ROLES HEREDADOS

**CONFIRMACIÓN:** El sistema implementa herencia de permisos correctamente:

```python
# En auth/dependencies.py

# Director puede acceder a TODO
require_director = require_roles(['director'])

# Coordinador puede acceder a endpoints de director (salvo críticos)
require_admin = require_roles(['director', 'coordinador', 'administrativo'])

# Tesorero tiene acceso financiero
require_tesorero = require_roles(['tesorero', 'director'])

# Profesor puede ver sus secciones
require_profesor = require_roles(['profesor', 'director', 'coordinador'])
```

**Verificación:** El Director y Coordinador tienen acceso a:
- ✅ Dashboard institucional
- ✅ Dashboard de finanzas
- ✅ Detalle de estudiantes
- ✅ Reportes PDF
- ✅ (EXCEPTO: Cerrar ciclo es SOLO Director)

---

## 📊 MONITOREO EN PRODUCCIÓN

### Logs en Render:
```bash
# Ver logs en tiempo real
render logs --tail
```

### Métricas importantes:
- **Response Time:** < 200ms para consultas simples
- **Error Rate:** < 1%
- **Uptime:** > 99.9%

### Alertas configurables:
- Error 500 recurrentes
- Tiempo de respuesta > 1s
- Base de datos desconectada

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Problema: "CORS error"
**Solución:** Verifica que `ALLOWED_ORIGINS` incluya el dominio de Vercel exacto (incluyendo https://)

### Problema: "Database connection timeout"
**Solución:** 
1. Usa puerto 6542 (connection pooling) en lugar de 5432
2. Aumenta `max_connections` en Supabase
3. Verifica que no haya fugas de conexiones

### Problema: "PDF no se descarga"
**Solución:** Verifica que el token JWT sea válido y no haya expirado

### Problema: "Module not found"
**Solución:** Asegúrate de que el Build Command sea `cd backend && pip install -r requirements.txt`

### Problema: "attempted relative import with no known parent package"
**Solución:** 
1. Usa el Start Command: `gunicorn backend.main:app ...` (NO uses `cd backend && uvicorn main:app`)
2. Verifica que todas las importaciones en `backend/` usen rutas absolutas (ej: `from config import settings` en lugar de `from .config import settings`)
3. Asegúrate de que el archivo `backend/__init__.py` exista (puede estar vacío)

---

## 📞 SOPORTE

Si encuentras problemas:

1. Revisa los logs en Render Dashboard
2. Verifica las variables de entorno
3. Prueba los endpoints individualmente con curl
4. Revisa la documentación de FastAPI en `/docs`

---

**¡Listo para producción!** 🚀
