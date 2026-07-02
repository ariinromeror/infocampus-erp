# PRD — Mejora de Arquitectura y Calidad de Ingeniería

**Proyecto:** InfoCampus ERP
**Tipo de documento:** PRD técnico (deuda técnica y madurez de ingeniería)
**Autor:** Auditoría de arquitectura asistida (Cursor Cloud Agent)
**Estado:** Propuesto

---

## 1. Contexto

InfoCampus ERP es un ERP académico-financiero full-stack (FastAPI + asyncpg + React) construido como proyecto personal/portafolio, actualmente en producción (Render + Vercel + Supabase) sirviendo a una sola institución de demostración.

Tras una auditoría de arquitectura se identificaron 10 áreas de mejora. Este documento las formaliza como requisitos, con criterios de aceptación, prioridad y justificación, para que puedan ejecutarse de forma incremental sin necesidad de una reescritura.

**Nota sobre alcance:** este PRD cubre exclusivamente **calidad de ingeniería y deuda técnica** del sistema actual (single-tenant). No incluye la migración a arquitectura multi-institucional (multi-tenancy) ni la contenerización con Docker, que se consideran una iniciativa separada y posterior, condicionada a que el proyecto pase de "portafolio" a "producto con múltiples clientes reales".

## 2. Objetivo

Elevar la base de código a un nivel de calidad, seguridad y mantenibilidad consistente con un sistema en producción real, sin detener el desarrollo de funcionalidades, priorizando primero los riesgos que afectan directamente la integridad de los datos financieros/académicos.

## 3. Principios guía

- **Priorizar por riesgo, no por esfuerzo**: lo que puede corromper datos de dinero o notas va primero.
- **Sin big-bang rewrites**: cada requisito debe poder implementarse y mergearse de forma incremental.
- **Evidencia antes que opinión**: cada requisito referencia el código real que motiva el cambio.
- **Proporcionalidad al contexto del proyecto**: al ser un proyecto portafolio con datos demo públicos por diseño, no se tratan como incidentes de seguridad situaciones que son intencionales (ver RQ-01).

## 4. Fuera de alcance (para este PRD)

- Contenerización con Docker.
- Arquitectura multi-tenant / multi-institución.
- Migración de infraestructura (Render/Vercel → K8s, colas async, caché Redis, réplicas de lectura).
- Rediseño de UI/UX del frontend.

Estos temas se documentarán en un PRD separado si el proyecto avanza hacia soportar múltiples instituciones reales.

## 5. Métricas de éxito

| Métrica | Estado actual | Objetivo |
|---|---|---|
| Cobertura de tests en módulo financiero (`calculos_financieros.py`) | 0% | ≥ 80% de las ramas de negocio (mora, becas, deuda) |
| Endpoints con `HTTPException(500, detail=str(e))` | ~120 | 0 |
| Migraciones de esquema versionadas | 1 de ~16 tablas | 100% del esquema en Alembic |
| Pipeline de CI ejecutando lint + tests en cada PR | No existe | Sí, obligatorio para mergear a `main` |
| Endpoints de listado sin paginación | 6+ identificados | 0 |
| Errores de producción visibles sin depender de reporte de usuario | No | Sí (vía Sentry) |

---

## 6. Requisitos

### RQ-01 — Higiene de artefactos de credenciales demo (revisado tras discusión)

**Prioridad:** Baja / housekeeping (no es incidente de seguridad)

**Contexto verificado:** El login (`frontend/src/pages/auth/Login.jsx`, funciones `handleDemoDirect` / `handleDemoFromList`) permite acceso con un clic a cada uno de los 6 roles, usando `DEMO_PASSWORD` definido en `frontend/src/constants/demoUsuarios.js` — **embebido en el bundle de JS público**. Esto es intencional: es una feature de portafolio para que cualquier visitante pruebe el sistema sin fricción. Por lo tanto, el archivo `scripts_db/credenciales_infocampus_20260317_101815.txt` no expone nada que no esté ya público en el frontend compilado.

**Problema real (no es la exposición, es la falta de un "apagador"):** si este código se reutiliza para una institución real con datos reales, no existe ningún mecanismo para desactivar el panel de demo y las cuentas con contraseña compartida.

**Requisitos:**
1. Eliminar del control de versiones el archivo `scripts_db/credenciales_infocampus_20260317_101815.txt` (y cualquier archivo similar generado por scripts) y agregar el patrón `credenciales_*.txt` a `.gitignore`.
2. Añadir una variable de entorno `ENABLE_DEMO_LOGIN` (default `true` en este entorno demo) que, en `false`, oculte el panel de acceso rápido en `Login.jsx` y rechace el login de las cuentas demo desde el backend.
3. Documentar explícitamente en el `README.md` que las credenciales demo son públicas por diseño (evita que un futuro colaborador las trate como incidente de seguridad sin contexto).

**Criterios de aceptación:**
- El archivo de credenciales ya no está en el repositorio ni en el historial reciente.
- Con `ENABLE_DEMO_LOGIN=false`, el panel de acceso rápido no se renderiza y un intento de login con las credenciales demo devuelve 401.
- El README menciona explícitamente el carácter público e intencional del acceso demo.

---

### RQ-02 — Unificar dependencias del backend

**Prioridad:** Alta (bajo esfuerzo, alto riesgo de bugs "funciona en mi máquina")

**Problema:** existen dos archivos de dependencias con versiones divergentes:

```text
requirements.txt (raíz)   uvicorn==0.30.6   gunicorn==22.0.0   bcrypt==4.0.1
backend/requirements.txt  uvicorn==0.32.0   gunicorn==23.0.0   bcrypt==4.2.0
```

Render usa `backend/requirements.txt`; no está claro qué usa (o si algo usa) el de la raíz.

**Requisitos:**
1. Determinar si el `requirements.txt` de la raíz tiene algún consumidor real (CI, script, documentación de otro colaborador).
2. Si no tiene uso, eliminarlo y dejar `backend/requirements.txt` como única fuente de verdad, referenciada desde el `README.md`.
3. Si tiene uso, sincronizar versiones exactas entre ambos archivos y documentar por qué existen dos.
4. Fijar (`pin`) todas las versiones sin pin (ej. `groq` en el archivo de raíz).

**Criterios de aceptación:**
- Un solo archivo de dependencias de backend, o dos archivos con versiones idénticas y propósito documentado.
- `pip install -r <archivo>` reproduce el mismo entorno en local y en Render.

---

### RQ-03 — Migraciones de esquema versionadas (Alembic)

**Prioridad:** Alta

**Problema:** el esquema completo (~15 tablas) existe únicamente como efecto colateral de `scripts_db/populate.py`, un script de generación de datos demo, no de gestión de esquema. Solo `revoked_tokens` tiene una migración real (`backend/migrations/001_revoked_tokens.sql`). No hay forma de saber qué versión de esquema corre en cada entorno, ni de revertir un cambio.

**Requisitos:**
1. Introducir Alembic (o herramienta equivalente compatible con SQL crudo/asyncpg, ej. `yoyo-migrations` si se prefiere algo más ligero que Alembic con SQLAlchemy).
2. Extraer todos los `CREATE TABLE` actuales de `populate.py` a una migración inicial (`0001_initial_schema`) versionada.
3. Migrar `001_revoked_tokens.sql` al nuevo sistema de migraciones.
4. Actualizar `populate.py` para que solo inserte datos, no cree tablas — la creación de esquema pasa a ser responsabilidad exclusiva de las migraciones.
5. Documentar en `docs/DEPLOY.md` el comando para aplicar migraciones en cada despliegue.

**Criterios de aceptación:**
- Un entorno nuevo se levanta ejecutando únicamente migraciones (sin depender de `populate.py` para crear tablas).
- Existe un historial de migraciones incremental y reversible.
- El mecanismo de advisory lock ya existente en `main.py` se reutiliza o adapta para coordinar la ejecución de migraciones Alembic entre workers de Gunicorn.

---

### RQ-04 — Suite de tests automatizados, empezando por los flujos críticos

**Prioridad:** Crítica

**Problema:** cero tests en todo el repositorio (backend y frontend). El módulo financiero (`services/calculos_financieros.py`) implementa reglas de negocio no triviales (tres niveles de lógica de mora) sin ninguna verificación automática.

**Requisitos (orden de implementación):**
1. Configurar `pytest` + `pytest-asyncio` en `backend/` con una base de datos de test (contenedor Postgres efímero o esquema de test dedicado en Supabase).
2. Tests unitarios de `services/calculos_financieros.py`: cubrir los 3 escenarios de mora documentados en el propio módulo (convenio activo → sin mora; períodos anteriores impagos → mora inmediata; período actual → evaluación de días de gracia), más cálculo de deuda total y aplicación de porcentaje de beca.
3. Tests de integración de autenticación y RBAC: login válido/inválido, rate limiting de 5 intentos/minuto, `require_roles()` rechazando roles no autorizados en al menos un endpoint por rol.
4. Tests de integración del flujo de pagos (`tesorero.py`): registrar pago, verificar actualización de saldo, verificar que un rol no autorizado recibe 403.
5. (Frontend, segunda fase) Configurar Vitest + Testing Library; tests de `AuthContext` y del interceptor de 401 en `services/api.js` (ya documentado como lógica no trivial en el propio README).

**Criterios de aceptación:**
- `pytest` corre en CI y falla el build si algún test falla.
- Cobertura ≥ 80% en `calculos_financieros.py` medida con `pytest-cov`.
- Al menos un test de RBAC por cada uno de los 6 roles.

---

### RQ-05 — CI mínimo con quality gates

**Prioridad:** Alta (depende de RQ-04 para tener algo que ejecutar)

**Problema:** no existe ningún workflow de CI (`.github/workflows/` no existe). `render.yaml` y Vercel solo hacen *deploy*, no validan calidad antes de mergear a `main`.

**Requisitos:**
1. Crear `.github/workflows/backend-ci.yml`: en cada PR, instalar dependencias, correr linter (ver RQ agregado de lint si se decide adoptar Ruff) y `pytest`.
2. Crear `.github/workflows/frontend-ci.yml`: en cada PR, `npm ci`, `npm run lint` (ESLint ya configurado), y `npm run build` para detectar errores de compilación.
3. Configurar la rama `main` en GitHub para requerir que ambos workflows pasen antes de permitir merge.

**Criterios de aceptación:**
- Un PR con un test roto o un error de lint muestra el check en rojo y no puede mergearse sin override explícito.
- Tiempo de ejecución del CI razonable (referencia: pocos minutos), sin bloquear el flujo de desarrollo.

---

### RQ-06 — Manejo de errores seguro y consistente

**Prioridad:** Alta

**Problema:** patrón repetido ~120 veces en los routers:

```python
except Exception as e:
    logger.error(f"Error: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

Esto expone al cliente detalles internos (nombres de tabla/columna, mensajes de asyncpg) que el handler global de `main.py` ya evita correctamente para excepciones no capturadas — pero estos `except` locales lo están sobrescribiendo.

**Requisitos:**
1. Reemplazar `detail=str(e)` por un mensaje genérico (`"Error interno al procesar la solicitud"`) en todos los `except Exception` de los routers; el detalle completo se sigue logueando server-side.
2. Donde exista una excepción de negocio esperable (ej. violación de constraint único, valor fuera de rango), capturarla específicamente y devolver un `HTTPException(400/409, ...)` con mensaje claro para el usuario, en vez de caer al genérico de 500.
3. Establecer como norma de código (documentada en `docs/` o `CONTRIBUTING.md`) que ningún endpoint debe hacer `detail=str(e)` directamente.

**Criterios de aceptación:**
- Grep de `detail=str(e)` en `backend/routers/` devuelve 0 resultados.
- Los logs del servidor siguen conteniendo el detalle completo del error para debugging.

---

### RQ-07 — Extraer lógica de negocio de los routers a una capa de servicios

**Prioridad:** Media-Alta (mayor esfuerzo, se ejecuta de forma incremental)

**Problema:** el 90% de las queries SQL y reglas de negocio viven directamente en los handlers de los 14 routers. Solo `services/calculos_financieros.py` y `services/pdf_generator.py` están extraídos. Esto impide testear lógica de negocio sin levantar el stack HTTP completo y favorece duplicación de queries entre routers.

**Requisitos (incremental, priorizado por riesgo financiero):**
1. Extraer la lógica de `tesorero.py` (pagos, mora, becas, convenios) a `services/tesoreria_service.py`, dejando en el router solo la validación de entrada, la llamada al servicio y la serialización de respuesta.
2. Repetir el mismo patrón para `academico.py` (secciones, materias, carreras) → `services/academico_service.py`.
3. Repetir para `profesor_routes.py` (notas, asistencia) → `services/profesor_service.py`.
4. Los servicios reciben la conexión (`conn: asyncpg.Connection`) como parámetro explícito — no gestionan su propio pool — para mantener el patrón actual de `get_db()` en el router.

**Criterios de aceptación:**
- Los routers de tesorería, académico y profesor no contienen sentencias `SELECT/INSERT/UPDATE/DELETE` directamente; delegan a funciones de `services/`.
- Los tests de RQ-04 para el flujo de pagos pueden ejecutarse contra el servicio directamente, sin pasar por HTTP.

---

### RQ-08 — Estandarizar validación de entrada y contratos de salida

**Prioridad:** Media-Alta

**Problema:** validación inconsistente. Ejemplos verificados:

```python
# backend/routers/tesorero.py:354-358 — query params sueltos en un endpoint financiero
@router.post("/becas/{estudiante_id}")
async def asignar_beca(
    estudiante_id: int,
    porcentaje_beca: int = 0,
    tipo_beca: Optional[str] = None,
    ...
```

```python
# backend/routers/estudiantes.py:323-326 — dict crudo sin schema
async def actualizar_convenio(
    estudiante_id: int,
    data: dict,
    ...
```

Además, casi ningún endpoint declara `response_model`, por lo que el contrato de salida no está tipado ni validado.

**Requisitos:**
1. Crear schemas Pydantic para `asignar_beca` (`AsignarBecaRequest`) y `actualizar_convenio` (`ActualizarConvenioRequest`), reemplazando query params sueltos y `dict` crudo.
2. Auditar los 14 routers y crear schemas equivalentes para cualquier otro endpoint que reciba `dict` sin tipar.
3. Añadir `response_model` a los endpoints de mayor tráfico esperado (dashboards, listados de estudiantes/pagos, login) como primera fase; extender gradualmente al resto.
4. Centralizar los schemas más reutilizados (ej. paginación, respuesta de error) en un módulo común (`backend/schemas/common.py`) en vez de duplicarlos por router.

**Criterios de aceptación:**
- `asignar_beca` y `actualizar_convenio` reciben un body Pydantic validado.
- Los endpoints de dashboards y login tienen `response_model` declarado y documentado en `/docs`.

---

### RQ-09 — Paginación consistente en todos los listados

**Prioridad:** Media

**Problema:** algunos endpoints paginan correctamente (`/tesorero/pagos`, `/academico/estudiantes`), pero otros devuelven todo el resultado sin límite: `/academico/materias`, `/academico/secciones`, `/academico/profesores`, `/academico/carreras`, `/inscripciones/estudiante/mis-inscripciones`. `/tesorero/estudiantes-mora` tiene un `LIMIT 200` fijo sin parámetro de página.

**Requisitos:**
1. Definir un estándar único de paginación (`page`, `limit`, con `limit` máximo permitido, ej. 100) y un schema de respuesta común (`{ data: [...], page, limit, total }`).
2. Aplicar el estándar a todos los endpoints de listado identificados como sin paginación.
3. Convertir los `LIMIT` fijos (como el de `estudiantes-mora`) al estándar de `page`/`limit`.
4. Añadir un límite máximo hard-coded en el propio schema Pydantic de query params (ej. `limit: int = Query(20, le=100)`) como red de seguridad contra abuso.

**Criterios de aceptación:**
- Ningún endpoint de listado en `backend/routers/` ejecuta una query sin `LIMIT`.
- Todos los endpoints paginados comparten la misma forma de respuesta.

---

### RQ-10 — Observability básica (error tracking + logging estructurado)

**Prioridad:** Alta (bajo esfuerzo, alto impacto)

**Problema:** la única observability existente es `logging.basicConfig(level=INFO)` con formato de texto libre, y el health check de `/api/health`. No hay forma de enterarse de un error en producción salvo que un usuario lo reporte o alguien revise logs manualmente en el dashboard de Render.

**Requisitos:**
1. Integrar Sentry (o alternativa equivalente) en el backend: capturar excepciones no manejadas del `global_exception_handler` de `main.py` y enviarlas con contexto (endpoint, rol del usuario si está disponible, request id).
2. Integrar Sentry en el frontend, conectado al `ErrorBoundary` ya existente (`App.jsx`, `MainLayout.jsx`) para capturar errores de React no manejados.
3. Migrar el logging de `main.py` y los routers de texto libre a formato estructurado (JSON), incluyendo al menos: timestamp, nivel, endpoint, `request_id`, y (cuando aplique) `user_id`/rol.
4. Documentar en `docs/DEPLOY.md` cómo configurar el DSN de Sentry como variable de entorno en Render/Vercel.

**Criterios de aceptación:**
- Un error no manejado en producción genera una alerta/entrada visible en Sentry sin depender de que un usuario lo reporte.
- Los logs del backend son parseables como JSON.

---

## 7. Orden de ejecución recomendado

No se define como calendario, sino como secuencia de dependencia e impacto:

1. **RQ-02** (unificar dependencias) — trivial, elimina una fuente de bugs ambientales antes de tocar cualquier otra cosa.
2. **RQ-06** (manejo de errores) — bajo esfuerzo, alto impacto en seguridad/calidad, no depende de nada más.
3. **RQ-10** (observability) — bajo esfuerzo, da visibilidad inmediata para detectar regresiones introducidas por los siguientes pasos.
4. **RQ-04** (tests de flujos críticos) — habilita ejecutar los siguientes refactors con red de seguridad.
5. **RQ-05** (CI) — una vez hay tests que correr, automatizar su ejecución en cada PR.
6. **RQ-03** (Alembic) — puede avanzar en paralelo a los anteriores; no depende de ellos.
7. **RQ-08** (validación de entrada / response_model) — apoyándose en los tests ya existentes para no romper contratos.
8. **RQ-09** (paginación) — cambio acotado, se beneficia de tests de regresión ya existentes.
9. **RQ-07** (extracción a servicios) — el refactor de mayor alcance; se hace al final, apoyado en toda la red de tests/CI ya construida.
10. **RQ-01** (housekeeping de credenciales demo) — puede hacerse en cualquier momento, es independiente del resto.

## 8. Riesgos de no ejecutar este plan

- Un bug no detectado en el cálculo de mora o becas puede generar cobros incorrectos a estudiantes reales sin ningún mecanismo de detección temprana (sin RQ-04/RQ-10).
- Cambios de esquema no versionados (sin RQ-03) dificultan progresivamente el onboarding de nuevos colaboradores y el diagnóstico de incidentes entre entornos.
- La deuda de lógica de negocio en routers (sin RQ-07) hace cada vez más costoso y riesgoso implementar nuevas funcionalidades, incluyendo una futura evolución multi-institucional.
