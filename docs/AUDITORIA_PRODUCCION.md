# Auditoría exhaustiva — InfoCampus ERP

**Fecha:** 17 de marzo de 2026  
**Objetivo:** Preparar el proyecto para producción

---

## 1. Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| **Porcentaje de avance** | ~62% |
| **Roles implementados** | 6 (Director, Coordinador, Profesor, Estudiante, Tesorero, Secretaria) |
| **Routers API** | 14 |
| **Tests** | 0 |
| **Componentes duplicados** | 3 tipos (ModalForm, ConfirmModal, SelectModal) |

---

## 2. Estructura del proyecto

```
infocampus-erp/
├── backend/           # FastAPI
├── frontend/          # React + Vite
├── scripts_db/        # Población y utilidades
├── docs/              # Documentación
└── README.md
```

---

## 3. Funcionalidad por rol

### Director
- Dashboard, estadísticas, períodos, carreras, materias, secciones, horarios
- Estudiantes, profesores, usuarios
- Finanzas (cobrar, mora, pagos, ingresos)
- Becas, convenios, tarifas
- Reportes, auditoría, configuración

### Coordinador
- Dashboard, carreras, materias, secciones, periodos, horarios
- Estudiantes, profesores, inscripciones
- Becas, reportes, usuarios

### Profesor
- Dashboard, secciones, libro de notas
- Evaluaciones, asistencia, analíticas

### Estudiante
- Dashboard, horario, notas, materias
- Evaluaciones, asistencia, pagos, documentos

### Tesorero
- Dashboard, buscar estudiante, cobrar
- Mora, pagos, convenios, becas, tarifas
- Ingresos, reportes, estados de cuenta, certificados

### Secretaria
- Dashboard, inscripciones, primera matrícula, reinscripción
- Estudiantes, secciones, mallas, usuarios

---

## 4. Archivos redundantes o sobrantes

### Componentes duplicados

| Componente | Ubicaciones | Acción |
|------------|-------------|--------|
| ModalForm | director/, coordinador/ | Unificar en shared/ |
| ConfirmModal | director/, tesorero/, secretaria/ | Unificar en shared/ |
| SelectModal | secretaria/, tesorero/, coordinador/ | Unificar en shared/ |

### Archivos sensibles

- `scripts_db/credenciales_*.txt` — **eliminar** y añadir a .gitignore (ya añadido)

### Documentación

- `legacy_archive/` — no existe (referencia obsoleta en README anterior)

---

## 5. Checklist de producción

### Completado ✅

- [x] slowapi en requirements.txt
- [x] backend/.env.example
- [x] credenciales*.txt en .gitignore
- [x] README actualizado
- [x] JWT + RBAC
- [x] Tabla revoked_tokens
- [x] CORS configurable
- [x] OpenAPI/Swagger

### Pendiente ❌

- [ ] Eliminar credenciales del repo (si existen)
- [ ] Unificar componentes duplicados
- [ ] Tests unitarios básicos
- [ ] Definir ALLOWED_ORIGINS en producción
- [ ] Documentar schema BD (DDL)
- [ ] Integración APM (Sentry)

---

## 6. Riesgos identificados

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Credenciales en repo | Alta | Eliminar, rotar, .gitignore |
| CORS wildcard en prod | Media | ALLOWED_ORIGINS explícito |
| Sin tests | Media | Tests básicos pre-deploy |
| Schema no versionado | Media | Migraciones o DDL |

---

## 7. Próximos pasos recomendados

1. **Inmediato:** Eliminar `credenciales_*.txt` si existe en el repo
2. **Corto plazo:** Unificar ModalForm, ConfirmModal, SelectModal
3. **Medio plazo:** Tests de login, health, endpoints críticos
4. **Antes de deploy:** Configurar ALLOWED_ORIGINS para producción
