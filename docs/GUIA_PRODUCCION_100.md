# Guía para dejar InfoCampus ERP al 100% operativo

Esta guía detalla los pasos necesarios para llevar el proyecto de ~62% a producción funcional.

---

## Fase 1: Seguridad (Crítico)

### 1.1 Eliminar credenciales del repositorio

```bash
# Verificar si existen archivos con credenciales
ls scripts_db/credenciales*.txt 2>/dev/null

# Si existen, eliminarlos del control de versiones (mantener local si lo necesitas)
git rm --cached scripts_db/credenciales_*.txt
git commit -m "chore: remove credentials from repo"

# Rotar contraseñas en Supabase/PostgreSQL y cualquier servicio afectado
```

### 1.2 Configurar variables de entorno para producción

**Backend** — Crear `backend/.env` en el servidor (nunca subir a git):

```
DATABASE_URL=postgresql://...
SECRET_KEY_AUTH=<generar_clave_aleatoria_larga>
ALGORITHM=HS256
ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
GROQ_API_KEY=<opcional_para_chatbot>
```

**Frontend** — En Vercel/Netlify configurar:

```
VITE_API_URL=https://api.tu-dominio.com
```

### 1.3 CORS en producción

- No usar `*` en producción
- Definir solo los dominios permitidos en `ALLOWED_ORIGINS`
- Verificar en `backend/config.py` que se lee correctamente

---

## Fase 2: Base de datos

### 2.1 Verificar migraciones

```bash
# Ejecutar migración de revoked_tokens si no se ha hecho
psql $DATABASE_URL -f backend/migrations/001_revoked_tokens.sql
```

### 2.2 Documentar schema (opcional pero recomendado)

- Exportar DDL de las tablas principales
- Crear `docs/SCHEMA.md` o `backend/migrations/README.md` con la estructura
- Facilita futuros cambios y onboarding

---

## Fase 3: Dependencias y build

### 3.1 Backend

```bash
cd backend
pip install -r requirements.txt
# Verificar que no hay errores de import (slowapi, groq, etc.)
python -c "from main import app; print('OK')"
```

### 3.2 Frontend

```bash
cd frontend
npm install
npm run build
# Verificar que el build termina sin errores
```

---

## Fase 4: Consolidar componentes duplicados

### 4.1 ModalForm

- Crear `frontend/src/components/shared/ModalForm.jsx` unificado
- Migrar lógica de `director/components/ModalForm.jsx` y `coordinador/components/ModalForm.jsx`
- Actualizar imports en Director y Coordinador
- Eliminar archivos duplicados

### 4.2 ConfirmModal

- Crear `frontend/src/components/shared/ConfirmModal.jsx` unificado
- Migrar de director, tesorero y secretaria
- Actualizar imports
- Eliminar duplicados

### 4.3 SelectModal

- Crear `frontend/src/components/shared/SelectModal.jsx` unificado
- Migrar de secretaria, tesorero y coordinador
- Actualizar imports
- Eliminar duplicados

---

## Fase 5: Tests básicos (recomendado)

### 5.1 Backend — pytest

```bash
pip install pytest pytest-asyncio httpx
```

Crear `backend/tests/test_health.py`:

```python
def test_health():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
```

### 5.2 Backend — test de login

Crear `backend/tests/test_auth.py` con test de login (usuario válido, inválido, rate limit).

### 5.3 Frontend — opcional

- Configurar Vitest o Jest
- Test de componentes críticos (Login, ProtectedRoute)
- Test E2E con Playwright (fase posterior)

---

## Fase 6: Deploy

### 6.1 Backend (Render / Railway / Fly.io)

1. Conectar repositorio
2. Build: `pip install -r backend/requirements.txt`
3. Start: `cd backend && gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
4. Configurar variables de entorno
5. Verificar que `/api/health` responde 200

### 6.2 Frontend (Vercel / Netlify)

1. Conectar repositorio
2. Root: `frontend`
3. Build: `npm run build`
4. Output: `dist`
5. Variable: `VITE_API_URL` = URL del backend
6. Verificar que la app carga y el login funciona

### 6.3 Base de datos

- Supabase: ya configurado
- Verificar que la URL de conexión usa pooler si aplica
- Revisar que `revoked_tokens` existe

---

## Fase 7: Validación post-deploy

### Checklist final

- [ ] Login funciona con cada rol (director, coordinador, profesor, estudiante, tesorero, secretaria)
- [ ] Dashboard carga sin errores por rol
- [ ] API docs accesible (`/docs`)
- [ ] Chat Eva responde (si GROQ_API_KEY está configurada)
- [ ] Reportes PDF se generan
- [ ] CORS no bloquea requests desde el frontend
- [ ] No hay errores 500 en consola del navegador
- [ ] Responsive funciona en móvil

---

## Resumen de prioridades

| # | Tarea | Tiempo est. | Prioridad |
|---|-------|-------------|-----------|
| 1 | Eliminar credenciales del repo | 15 min | Crítica |
| 2 | Configurar .env en producción | 30 min | Crítica |
| 3 | Deploy backend + frontend | 1–2 h | Crítica |
| 4 | Validar login y dashboards | 30 min | Crítica |
| 5 | Consolidar componentes duplicados | 2–3 h | Alta |
| 6 | Tests básicos backend | 1–2 h | Media |
| 7 | Documentar schema BD | 1 h | Baja |

---

## Orden sugerido de ejecución

1. **Día 1:** Fase 1 (seguridad) + Fase 3 (verificar build)
2. **Día 2:** Fase 6 (deploy) + Fase 7 (validación)
3. **Día 3+:** Fase 4 (componentes) + Fase 5 (tests) según necesidad

Con las fases 1, 3, 6 y 7 completadas, el sistema queda **operativo en producción**. Las fases 4 y 5 mejoran mantenibilidad y confiabilidad a medio plazo.
