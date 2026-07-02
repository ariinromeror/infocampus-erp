-- Migración 000: esquema base de InfoCampus ERP.
--
-- Representa el esquema tal como lo creaba históricamente
-- scripts_db/populate.py (DDL embebido). A partir de esta migración,
-- populate.py deja de definir su propio DDL y ejecuta estos archivos de
-- backend/migrations/ para construir el esquema; así se elimina el riesgo
-- de que el script de seed y el esquema real de producción diverjan.
--
-- Idempotente: seguro de ejecutar múltiples veces (CREATE ... IF NOT EXISTS).
-- No usa DROP TABLE: eso es responsabilidad exclusiva de scripts_db/populate.py
-- para entornos de demo/desarrollo, nunca de las migraciones de producción.

CREATE TABLE IF NOT EXISTS public.carreras (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    codigo              VARCHAR(20)  UNIQUE NOT NULL,
    duracion_semestres  INTEGER      NOT NULL,
    creditos_totales    INTEGER      NOT NULL,
    precio_credito      DECIMAL(10,2) NOT NULL,
    dias_gracia_pago    INTEGER      DEFAULT 10,
    descripcion         TEXT,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id                    SERIAL PRIMARY KEY,
    username              VARCHAR(50)  UNIQUE NOT NULL,
    password_hash         VARCHAR(255) NOT NULL,
    email                 VARCHAR(100) UNIQUE NOT NULL,
    first_name            VARCHAR(50)  NOT NULL,
    last_name             VARCHAR(50)  NOT NULL,
    cedula                VARCHAR(15)  UNIQUE,
    telefono              VARCHAR(20),
    direccion             TEXT,
    fecha_nacimiento      DATE,
    genero                VARCHAR(20),
    rol                   VARCHAR(20)  NOT NULL
        CHECK (rol IN ('admin','profesor','estudiante','director','coordinador','tesorero','administrativo')),
    activo                BOOLEAN      DEFAULT true,
    carrera_id            INTEGER      REFERENCES public.carreras(id) ON DELETE SET NULL,
    semestre_actual       INTEGER,
    promedio_acumulado    DECIMAL(5,2) DEFAULT 0.00,
    creditos_aprobados    INTEGER      DEFAULT 0,
    titulo_academico      VARCHAR(150),
    especialidad          VARCHAR(100),
    años_experiencia      INTEGER,
    es_becado             BOOLEAN      DEFAULT false,
    porcentaje_beca       INTEGER      DEFAULT 0,
    tipo_beca             VARCHAR(100),
    convenio_activo       BOOLEAN      DEFAULT false,
    fecha_limite_convenio DATE,
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.periodos_lectivos (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(50)  NOT NULL,
    codigo       VARCHAR(20)  UNIQUE NOT NULL,
    fecha_inicio DATE         NOT NULL,
    fecha_fin    DATE         NOT NULL,
    activo       BOOLEAN      DEFAULT false,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.materias (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    codigo      VARCHAR(20)  UNIQUE NOT NULL,
    creditos    INTEGER      NOT NULL,
    semestre    INTEGER      NOT NULL,
    carrera_id  INTEGER      REFERENCES public.carreras(id) ON DELETE CASCADE,
    descripcion TEXT,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.prerequisitos (
    id              SERIAL PRIMARY KEY,
    materia_id      INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
    prerequisito_id INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
    UNIQUE(materia_id, prerequisito_id)
);

CREATE TABLE IF NOT EXISTS public.secciones (
    id          SERIAL PRIMARY KEY,
    materia_id  INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
    periodo_id  INTEGER REFERENCES public.periodos_lectivos(id) ON DELETE CASCADE,
    docente_id  INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
    codigo      VARCHAR(20)  NOT NULL,
    cupo_maximo INTEGER      NOT NULL,
    cupo_actual INTEGER      DEFAULT 0,
    aula        VARCHAR(20),
    horario     JSONB,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.pagos (
    id            SERIAL PRIMARY KEY,
    estudiante_id INTEGER REFERENCES public.usuarios(id) ON DELETE CASCADE,
    monto         DECIMAL(10,2) NOT NULL,
    fecha_pago    DATE          NOT NULL,
    metodo_pago   VARCHAR(50),
    estado        VARCHAR(20)   DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','completado','cancelado')),
    referencia    VARCHAR(100),
    concepto      TEXT,
    periodo_id    INTEGER REFERENCES public.periodos_lectivos(id) ON DELETE SET NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.inscripciones (
    id                SERIAL PRIMARY KEY,
    estudiante_id     INTEGER REFERENCES public.usuarios(id)  ON DELETE CASCADE,
    seccion_id        INTEGER REFERENCES public.secciones(id) ON DELETE CASCADE,
    pago_id           INTEGER REFERENCES public.pagos(id)     ON DELETE SET NULL,
    fecha_inscripcion DATE    DEFAULT CURRENT_DATE,
    estado            VARCHAR(20) DEFAULT 'activo'
        CHECK (estado IN ('activo','retirado','aprobado','reprobado')),
    nota_final        DECIMAL(5,2),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estudiante_id, seccion_id)
);

CREATE TABLE IF NOT EXISTS public.historial_notas (
    id                 SERIAL PRIMARY KEY,
    inscripcion_id     INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
    estudiante_nombre  VARCHAR(200),
    nota_anterior      DECIMAL(5,2),
    nota_nueva         DECIMAL(5,2),
    modificado_por     VARCHAR(100),
    motivo             TEXT,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.evaluaciones_parciales (
    id               SERIAL PRIMARY KEY,
    inscripcion_id   INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
    tipo_evaluacion  VARCHAR(50)   NOT NULL,
    nota             DECIMAL(5,2),
    fecha_evaluacion DATE,
    peso_porcentual  DECIMAL(5,2),
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(inscripcion_id, tipo_evaluacion)
);

CREATE TABLE IF NOT EXISTS public.asistencias (
    id             SERIAL PRIMARY KEY,
    inscripcion_id INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
    fecha          DATE         NOT NULL,
    estado         VARCHAR(20)  NOT NULL
        CHECK (estado IN ('presente','ausente','tardanza','justificado')),
    observaciones  TEXT,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(inscripcion_id, fecha)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
    accion         VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50),
    detalles       JSONB,
    ip_address     VARCHAR(45),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.configuracion_ia (
    id             SERIAL PRIMARY KEY,
    clave          VARCHAR(100) UNIQUE NOT NULL,
    valor          TEXT,
    descripcion    TEXT,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices base (relaciones FK más consultadas)
CREATE INDEX IF NOT EXISTS idx_materias_carrera_id            ON public.materias(carrera_id);
CREATE INDEX IF NOT EXISTS idx_secciones_materia_id           ON public.secciones(materia_id);
CREATE INDEX IF NOT EXISTS idx_secciones_periodo_id           ON public.secciones(periodo_id);
CREATE INDEX IF NOT EXISTS idx_secciones_docente_id           ON public.secciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante_id    ON public.inscripciones(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_seccion_id       ON public.inscripciones(seccion_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_pago_id          ON public.inscripciones(pago_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_inscripcion_id    ON public.evaluaciones_parciales(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_inscripcion_id     ON public.asistencias(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estudiante_id            ON public.pagos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_pagos_periodo_id               ON public.pagos(periodo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado                   ON public.pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_pago                ON public.pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario_id          ON public.audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_notas_inscripcion_id ON public.historial_notas(inscripcion_id);

-- Índices de performance críticos para dashboards y cálculo de mora
CREATE INDEX IF NOT EXISTS idx_usuarios_rol                       ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_carrera_id                ON public.usuarios(carrera_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_becado                ON public.usuarios(rol, es_becado);
CREATE INDEX IF NOT EXISTS idx_inscripciones_sin_pago             ON public.inscripciones(estudiante_id) WHERE pago_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_inscripciones_pago_estudiante      ON public.inscripciones(pago_id, estudiante_id);
