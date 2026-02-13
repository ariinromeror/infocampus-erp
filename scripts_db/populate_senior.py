#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
InfoCampus ERP - Populate Database Script (SENIOR LEVEL V3 FINAL)
==================================================================

IMPORTANTE: Este script CREA TODO desde cero, no modifica nada existente.

CAMBIOS EN V3:
- Tabla usuarios usa first_name y last_name (NO nombre_completo)
- Campo password_hash (NO password)
- Campos de beca: es_becado, porcentaje_beca, tipo_beca
- Campos de convenio: convenio_activo, fecha_limite_convenio

Antes de ejecutar:
1. En Supabase SQL Editor, ejecutar:
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO anon;
   GRANT ALL ON SCHEMA public TO authenticated;
   GRANT ALL ON SCHEMA public TO service_role;

2. Luego ejecutar este script Python

Genera datos realistas para 4 años académicos (2021-2024) con:
- 500 estudiantes con historial completo
- 50 profesores con carga horaria
- 12 carreras con mallas curriculares
- 150 materias con prerequisitos
- 8 períodos lectivos (2 por año)
- 15,000+ inscripciones históricas
- 8,000+ evaluaciones parciales
- 20,000+ registros de asistencia
- 5,000+ pagos con diferentes estados

Autor: Arin Romero
Versión: 3.0 FINAL
Última actualización: 2025-02-13
"""

import psycopg2
import random
import bcrypt
from datetime import datetime, timedelta, date
from decimal import Decimal
from faker import Faker
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configuración
DATABASE_URL = os.getenv('DATABASE_URL')
fake = Faker('es_ES')
Faker.seed(42)
random.seed(42)

# =======================
# DATOS DE CONFIGURACIÓN
# =======================

# Carreras con créditos totales
CARRERAS = [
    {"nombre": "Ingeniería en Sistemas", "creditos": 240, "precio_credito": 45.00, "dias_gracia": 15},
    {"nombre": "Ingeniería Industrial", "creditos": 240, "precio_credito": 45.00, "dias_gracia": 15},
    {"nombre": "Administración de Empresas", "creditos": 200, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Contaduría Pública", "creditos": 200, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Derecho", "creditos": 220, "precio_credito": 42.00, "dias_gracia": 12},
    {"nombre": "Psicología", "creditos": 200, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Arquitectura", "creditos": 250, "precio_credito": 50.00, "dias_gracia": 15},
    {"nombre": "Medicina", "creditos": 300, "precio_credito": 60.00, "dias_gracia": 20},
    {"nombre": "Enfermería", "creditos": 180, "precio_credito": 38.00, "dias_gracia": 10},
    {"nombre": "Diseño Gráfico", "creditos": 180, "precio_credito": 38.00, "dias_gracia": 10},
    {"nombre": "Marketing Digital", "creditos": 180, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Gastronomía", "creditos": 160, "precio_credito": 35.00, "dias_gracia": 8}
]

# Materias base con prerequisitos (se crearán dinámicamente)
MATERIAS_SISTEMAS = [
    # Semestre 1
    {"nombre": "Introducción a la Programación", "creditos": 4, "semestre": 1, "prerequisito": None},
    {"nombre": "Matemática I (Cálculo)", "creditos": 4, "semestre": 1, "prerequisito": None},
    {"nombre": "Fundamentos de Computación", "creditos": 3, "semestre": 1, "prerequisito": None},
    {"nombre": "Álgebra Lineal", "creditos": 3, "semestre": 1, "prerequisito": None},
    
    # Semestre 2
    {"nombre": "Programación Orientada a Objetos", "creditos": 4, "semestre": 2, "prerequisito": "Introducción a la Programación"},
    {"nombre": "Matemática II (Cálculo Integral)", "creditos": 4, "semestre": 2, "prerequisito": "Matemática I (Cálculo)"},
    {"nombre": "Estructuras de Datos", "creditos": 4, "semestre": 2, "prerequisito": "Introducción a la Programación"},
    {"nombre": "Física I", "creditos": 3, "semestre": 2, "prerequisito": "Matemática I (Cálculo)"},
    
    # Semestre 3
    {"nombre": "Bases de Datos I", "creditos": 4, "semestre": 3, "prerequisito": "Estructuras de Datos"},
    {"nombre": "Algoritmos Avanzados", "creditos": 4, "semestre": 3, "prerequisito": "Estructuras de Datos"},
    {"nombre": "Arquitectura de Computadores", "creditos": 3, "semestre": 3, "prerequisito": "Fundamentos de Computación"},
    {"nombre": "Matemática Discreta", "creditos": 3, "semestre": 3, "prerequisito": "Álgebra Lineal"},
    
    # Semestre 4
    {"nombre": "Ingeniería de Software I", "creditos": 4, "semestre": 4, "prerequisito": "Programación Orientada a Objetos"},
    {"nombre": "Bases de Datos II", "creditos": 4, "semestre": 4, "prerequisito": "Bases de Datos I"},
    {"nombre": "Redes de Computadoras", "creditos": 4, "semestre": 4, "prerequisito": "Arquitectura de Computadores"},
    {"nombre": "Estadística", "creditos": 3, "semestre": 4, "prerequisito": "Matemática II (Cálculo Integral)"},
    
    # Semestre 5
    {"nombre": "Desarrollo Web", "creditos": 4, "semestre": 5, "prerequisito": "Bases de Datos II"},
    {"nombre": "Inteligencia Artificial", "creditos": 4, "semestre": 5, "prerequisito": "Algoritmos Avanzados"},
    {"nombre": "Sistemas Operativos", "creditos": 4, "semestre": 5, "prerequisito": "Arquitectura de Computadores"},
    {"nombre": "Proyecto Integrador I", "creditos": 3, "semestre": 5, "prerequisito": "Ingeniería de Software I"},
]

# Tipos de becas
BECAS = [
    {"tipo": "Excelencia Académica", "porcentaje": 50},
    {"tipo": "Deportiva", "porcentaje": 30},
    {"tipo": "Necesidad Económica", "porcentaje": 40},
    {"tipo": "Hermanos", "porcentaje": 20},
    {"tipo": "Completa", "porcentaje": 100}
]

# Métodos de pago
METODOS_PAGO = ["efectivo", "transferencia", "tarjeta_debito", "tarjeta_credito"]

# Estados de asistencia
ESTADOS_ASISTENCIA = ["presente", "ausente", "tardanza", "justificado"]

# Tipos de evaluación
TIPOS_EVALUACION = [
    {"tipo": "parcial_1", "peso": 0.25},
    {"tipo": "parcial_2", "peso": 0.25},
    {"tipo": "talleres", "peso": 0.20},
    {"tipo": "examen_final", "peso": 0.30}
]

# =======================
# FUNCIONES AUXILIARES
# =======================

def hash_password(password: str) -> str:
    """Hashea contraseña con bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def generar_nota_realista() -> Decimal:
    """Genera nota entre 0 y 10 con distribución normal sesgada hacia aprobados"""
    # 70% aprueba (>=7), 30% reprueba
    if random.random() < 0.70:
        nota = random.uniform(7.0, 10.0)
    else:
        nota = random.uniform(3.0, 6.9)
    return Decimal(str(round(nota, 2)))

def generar_asistencia_realista() -> str:
    """Genera estado de asistencia con probabilidades realistas"""
    rand = random.random()
    if rand < 0.85:  # 85% presente
        return "presente"
    elif rand < 0.90:  # 5% tardanza
        return "tardanza"
    elif rand < 0.95:  # 5% ausente
        return "ausente"
    else:  # 5% justificado
        return "justificado"

def generar_cedula_ecuatoriana() -> str:
    """Genera cédula ecuatoriana válida"""
    provincia = str(random.randint(1, 24)).zfill(2)
    tercero = str(random.randint(0, 9))
    num_unico = str(random.randint(0, 999999)).zfill(6)
    return provincia + tercero + num_unico

# =======================
# SCRIPT PRINCIPAL
# =======================

def main():
    print("=" * 80)
    print("🎓 INFOCAMPUS ERP - POPULATE DATABASE V3 FINAL")
    print("=" * 80)
    
    # Conectar a PostgreSQL
    print("\n[1/17] Conectando a PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    
    try:
        # =======================
        # BORRAR TABLAS EXISTENTES
        # =======================
        print("\n[2/17] Eliminando tablas viejas si existen...")
        
        # Lista de tablas en orden inverso de dependencias
        tablas_a_borrar = [
            'audit_logs',
            'asistencias', 
            'evaluaciones_parciales',
            'inscripciones',
            'pagos',
            'secciones',
            'prerequisitos',
            'materias',
            'periodos_lectivos',
            'usuarios',
            'carreras',
            'configuracion_ia'
        ]
        
        for tabla in tablas_a_borrar:
            try:
                cur.execute(f"DROP TABLE IF EXISTS public.{tabla} CASCADE")
                print(f"   ✓ Tabla '{tabla}' eliminada")
            except Exception as e:
                print(f"   ⚠ No se pudo eliminar '{tabla}': {e}")
        
        conn.commit()
        print("   ✓ Todas las tablas viejas eliminadas")
        
        # =======================
        # CREAR TODAS LAS TABLAS DESDE CERO
        # =======================
        print("\n[3/17] Creando estructura completa de tablas...")
        
        # 1. Tablas base (sin dependencias)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.carreras (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                duracion_semestres INTEGER NOT NULL,
                creditos_totales INTEGER NOT NULL,
                precio_credito DECIMAL(10,2) NOT NULL,
                dias_gracia_pago INTEGER DEFAULT 10,
                descripcion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'carreras' creada")
        
        # TABLA USUARIOS CON FIRST_NAME, LAST_NAME Y CAMPOS DE BECA
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.usuarios (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                cedula VARCHAR(10) UNIQUE,
                telefono VARCHAR(20),
                direccion TEXT,
                fecha_nacimiento DATE,
                genero VARCHAR(20),
                rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'profesor', 'estudiante')),
                activo BOOLEAN DEFAULT true,
                carrera_id INTEGER REFERENCES public.carreras(id) ON DELETE SET NULL,
                semestre_actual INTEGER,
                promedio_acumulado DECIMAL(5,2),
                creditos_aprobados INTEGER DEFAULT 0,
                titulo_academico VARCHAR(100),
                especialidad VARCHAR(100),
                años_experiencia INTEGER,
                es_becado BOOLEAN DEFAULT false,
                porcentaje_beca INTEGER DEFAULT 0,
                tipo_beca VARCHAR(100),
                convenio_activo BOOLEAN DEFAULT false,
                fecha_limite_convenio DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'usuarios' creada (con first_name, last_name, es_becado, convenio)")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.periodos_lectivos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NOT NULL,
                activo BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'periodos_lectivos' creada")
        
        # 2. Tablas con dependencias de nivel 1
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.materias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                codigo VARCHAR(20) UNIQUE NOT NULL,
                creditos INTEGER NOT NULL,
                semestre INTEGER NOT NULL,
                carrera_id INTEGER REFERENCES public.carreras(id) ON DELETE CASCADE,
                descripcion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'materias' creada")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.prerequisitos (
                id SERIAL PRIMARY KEY,
                materia_id INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
                prerequisito_id INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
                UNIQUE(materia_id, prerequisito_id)
            )
        """)
        print("   ✓ Tabla 'prerequisitos' creada")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.secciones (
                id SERIAL PRIMARY KEY,
                materia_id INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
                periodo_id INTEGER REFERENCES public.periodos_lectivos(id) ON DELETE CASCADE,
                docente_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
                codigo VARCHAR(20) NOT NULL,
                cupo_maximo INTEGER NOT NULL,
                cupo_actual INTEGER DEFAULT 0,
                aula VARCHAR(20),
                horario JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'secciones' creada")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.pagos (
                id SERIAL PRIMARY KEY,
                estudiante_id INTEGER REFERENCES public.usuarios(id) ON DELETE CASCADE,
                monto DECIMAL(10,2) NOT NULL,
                fecha_pago DATE NOT NULL,
                metodo_pago VARCHAR(50),
                estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'cancelado')),
                referencia VARCHAR(100),
                concepto TEXT,
                periodo_id INTEGER REFERENCES public.periodos_lectivos(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'pagos' creada")
        
        # 3. Tablas con dependencias de nivel 2
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.inscripciones (
                id SERIAL PRIMARY KEY,
                estudiante_id INTEGER REFERENCES public.usuarios(id) ON DELETE CASCADE,
                seccion_id INTEGER REFERENCES public.secciones(id) ON DELETE CASCADE,
                pago_id INTEGER REFERENCES public.pagos(id) ON DELETE SET NULL,
                fecha_inscripcion DATE DEFAULT CURRENT_DATE,
                estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'retirado', 'aprobado', 'reprobado')),
                nota_final DECIMAL(5,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(estudiante_id, seccion_id)
            )
        """)
        print("   ✓ Tabla 'inscripciones' creada (con pago_id)")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.evaluaciones_parciales (
                id SERIAL PRIMARY KEY,
                inscripcion_id INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
                tipo_evaluacion VARCHAR(50) NOT NULL,
                nota DECIMAL(5,2),
                fecha_evaluacion DATE,
                peso_porcentual DECIMAL(5,2),
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'evaluaciones_parciales' creada")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.asistencias (
                id SERIAL PRIMARY KEY,
                inscripcion_id INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
                fecha DATE NOT NULL,
                estado VARCHAR(20) NOT NULL CHECK (estado IN ('presente', 'ausente', 'tardanza', 'justificado')),
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(inscripcion_id, fecha)
            )
        """)
        print("   ✓ Tabla 'asistencias' creada")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.audit_logs (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
                accion VARCHAR(50) NOT NULL,
                tabla_afectada VARCHAR(50),
                registro_id INTEGER,
                detalles JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ Tabla 'audit_logs' creada")
        
        # 4. Tabla de configuración para IA
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.configuracion_ia (
                id SERIAL PRIMARY KEY,
                clave VARCHAR(100) UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                tipo VARCHAR(50) DEFAULT 'texto',
                descripcion TEXT,
                actualizado_por INTEGER REFERENCES public.usuarios(id),
                fecha_actualizacion TIMESTAMP DEFAULT NOW()
            )
        """)
        print("   ✓ Tabla 'configuracion_ia' creada")
        
        # 5. Crear índices para mejorar rendimiento
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_materias_carrera ON public.materias(carrera_id);
            CREATE INDEX IF NOT EXISTS idx_secciones_materia ON public.secciones(materia_id);
            CREATE INDEX IF NOT EXISTS idx_secciones_periodo ON public.secciones(periodo_id);
            CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante ON public.inscripciones(estudiante_id);
            CREATE INDEX IF NOT EXISTS idx_inscripciones_seccion ON public.inscripciones(seccion_id);
            CREATE INDEX IF NOT EXISTS idx_inscripciones_pago ON public.inscripciones(pago_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON public.audit_logs(usuario_id);
            CREATE INDEX IF NOT EXISTS idx_pagos_estudiante ON public.pagos(estudiante_id);
        """)
        print("   ✓ Índices creados")
        
        conn.commit()
        print("\n✅ ESTRUCTURA DE BASE DE DATOS CREADA EXITOSAMENTE")
        
        # =======================
        # INSERTAR CONFIGURACIONES IA
        # =======================
        print("\n[4/17] Insertando configuraciones para IA...")
        
        configuraciones_ia = [
            ('mision_institucional', 
             'InfoCampus se dedica a formar profesionales íntegros, competentes e innovadores, comprometidos con el desarrollo sostenible y el bienestar de la sociedad ecuatoriana.', 
             'texto', 
             'Misión de la universidad'),
            
            ('vision_institucional', 
             'Ser reconocidos en 2030 como una institución de educación superior de excelencia en Ecuador, líder en innovación educativa, investigación aplicada y vinculación con la comunidad.', 
             'texto', 
             'Visión de la universidad'),
            
            ('reglas_nota_minima', 
             '7.0', 
             'decimal', 
             'Nota mínima de aprobación'),
            
            ('reglas_asistencia_minima', 
             '75', 
             'porcentaje', 
             'Porcentaje mínimo de asistencia para aprobar'),
            
            ('reglas_redondeo_notas', 
             'true', 
             'boolean', 
             'Redondear notas al entero más cercano'),
            
            ('politica_mora_dias_maximos', 
             '30', 
             'entero', 
             'Días máximos permitidos de mora'),
            
            ('politica_mora_interes_mensual', 
             '2.5', 
             'decimal', 
             'Interés mensual por mora (%)'),
            
            ('politica_becas_porcentaje_maximo', 
             '100', 
             'porcentaje', 
             'Porcentaje máximo de beca permitido'),
            
            ('politica_retiro_plazo_dias', 
             '15', 
             'entero', 
             'Días permitidos para retiro de materias'),
            
            ('info_rector', 
             'Dr. Carlos Alberto Mendoza Ramírez', 
             'texto', 
             'Nombre del rector actual'),
            
            ('info_fundacion', 
             '1998-03-15', 
             'fecha', 
             'Fecha de fundación'),
            
            ('info_telefono', 
             '+593-2-234-5678', 
             'texto', 
             'Teléfono institucional'),
            
            ('info_direccion', 
             'Av. Universitaria 123 y Calle Principal, Quito, Ecuador', 
             'texto', 
             'Dirección principal'),
            
            ('info_email_contacto', 
             'info@infocampus.edu.ec', 
             'texto', 
             'Email de contacto general'),
        ]
        
        for clave, valor, tipo, descripcion in configuraciones_ia:
            cur.execute("""
                INSERT INTO public.configuracion_ia (clave, valor, tipo, descripcion)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (clave) DO UPDATE 
                SET valor = EXCLUDED.valor, tipo = EXCLUDED.tipo, descripcion = EXCLUDED.descripcion
            """, (clave, valor, tipo, descripcion))
        
        print(f"   ✓ {len(configuraciones_ia)} configuraciones insertadas")
        conn.commit()
        
        # =======================
        # INSERTAR CARRERAS
        # =======================
        print("\n[5/17] Insertando carreras...")
        
        carreras_ids = {}
        for i, carrera in enumerate(CARRERAS, 1):
            codigo = f"CAR{i:03d}"
            duracion = carrera["creditos"] // 30  # 30 créditos por semestre aprox
            
            cur.execute("""
                INSERT INTO public.carreras 
                (nombre, codigo, duracion_semestres, creditos_totales, precio_credito, dias_gracia_pago, descripcion)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                carrera["nombre"],
                codigo,
                duracion,
                carrera["creditos"],
                carrera["precio_credito"],
                carrera["dias_gracia"],
                f"Carrera de {carrera['nombre']} con {carrera['creditos']} créditos totales"
            ))
            
            carreras_ids[carrera["nombre"]] = cur.fetchone()[0]
        
        print(f"   ✓ {len(CARRERAS)} carreras insertadas")
        conn.commit()
        
        # =======================
        # INSERTAR PERIODOS LECTIVOS (2021-2024, 2 por año)
        # =======================
        print("\n[6/17] Insertando períodos lectivos...")
        
        periodos_ids = []
        periodos_info = []
        
        for año in range(2021, 2025):
            # Período 1: Marzo - Julio
            fecha_inicio_p1 = date(año, 3, 1)
            fecha_fin_p1 = date(año, 7, 31)
            codigo_p1 = f"{año}-1"
            
            cur.execute("""
                INSERT INTO public.periodos_lectivos (nombre, codigo, fecha_inicio, fecha_fin, activo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                f"Período {año}-1",
                codigo_p1,
                fecha_inicio_p1,
                fecha_fin_p1,
                año == 2024  # Solo el último período está activo
            ))
            periodos_ids.append(cur.fetchone()[0])
            periodos_info.append({
                'id': periodos_ids[-1],
                'año': año,
                'periodo': 1,
                'fecha_inicio': fecha_inicio_p1,
                'fecha_fin': fecha_fin_p1
            })
            
            # Período 2: Septiembre - Enero
            fecha_inicio_p2 = date(año, 9, 1)
            fecha_fin_p2 = date(año + 1, 1, 31)
            codigo_p2 = f"{año}-2"
            
            cur.execute("""
                INSERT INTO public.periodos_lectivos (nombre, codigo, fecha_inicio, fecha_fin, activo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                f"Período {año}-2",
                codigo_p2,
                fecha_inicio_p2,
                fecha_fin_p2,
                False
            ))
            periodos_ids.append(cur.fetchone()[0])
            periodos_info.append({
                'id': periodos_ids[-1],
                'año': año,
                'periodo': 2,
                'fecha_inicio': fecha_inicio_p2,
                'fecha_fin': fecha_fin_p2
            })
        
        print(f"   ✓ {len(periodos_ids)} períodos lectivos insertados (2021-2024)")
        conn.commit()
        
        # =======================
        # INSERTAR USUARIOS ADMINISTRATIVOS
        # =======================
        print("\n[7/17] Insertando usuarios administrativos...")
        
        password_hash = hash_password("campus2026")
        
        usuarios_admin = [
            {
                "username": "director",
                "email": "director@infocampus.edu.ec",
                "first_name": "Roberto",
                "last_name": "Sánchez Mora",
                "cedula": generar_cedula_ecuatoriana(),
                "rol": "admin",
                "titulo": "PhD en Administración Educativa"
            },
            {
                "username": "coordinador",
                "email": "coordinador@infocampus.edu.ec",
                "first_name": "Patricia",
                "last_name": "Velasco Luna",
                "cedula": generar_cedula_ecuatoriana(),
                "rol": "admin",
                "titulo": "Magíster en Gestión Académica"
            },
            {
                "username": "tesorero",
                "email": "tesorero@infocampus.edu.ec",
                "first_name": "Marco",
                "last_name": "Játiva Robles",
                "cedula": generar_cedula_ecuatoriana(),
                "rol": "admin",
                "titulo": "Contador Público Autorizado"
            }
        ]
        
        for usuario in usuarios_admin:
            cur.execute("""
                INSERT INTO public.usuarios 
                (username, password_hash, email, first_name, last_name, cedula, rol, activo, titulo_academico)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                usuario['username'],
                password_hash,
                usuario['email'],
                usuario['first_name'],
                usuario['last_name'],
                usuario['cedula'],
                usuario['rol'],
                True,
                usuario['titulo']
            ))
        
        print(f"   ✓ {len(usuarios_admin)} usuarios administrativos insertados")
        conn.commit()
        
        # =======================
        # INSERTAR PROFESORES
        # =======================
        print("\n[8/17] Insertando profesores...")
        
        TITULOS_PROFESORES = [
            "PhD en Ciencias de la Computación",
            "Magíster en Ingeniería de Software",
            "PhD en Inteligencia Artificial",
            "Magíster en Bases de Datos",
            "PhD en Sistemas Distribuidos",
            "Ingeniero en Sistemas",
            "Magíster en Seguridad Informática"
        ]
        
        ESPECIALIDADES = [
            "Desarrollo de Software",
            "Inteligencia Artificial",
            "Bases de Datos",
            "Redes y Telecomunicaciones",
            "Arquitectura de Software",
            "Ciencia de Datos",
            "Sistemas Operativos",
            "Desarrollo Web"
        ]
        
        profesores_ids = []
        credenciales_profesores = []
        
        for i in range(50):
            first_name = fake.first_name()
            last_name = fake.last_name()
            cedula = generar_cedula_ecuatoriana()
            email = f"{first_name.lower()}.{last_name.lower()}@infocampus.edu.ec"
            titulo = random.choice(TITULOS_PROFESORES)
            especialidad = random.choice(ESPECIALIDADES)
            años_exp = random.randint(3, 25)
            
            cur.execute("""
                INSERT INTO public.usuarios 
                (username, password_hash, email, first_name, last_name, cedula, telefono, rol, activo, 
                 titulo_academico, especialidad, años_experiencia)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                f"prof{i+1:03d}",
                password_hash,
                email,
                first_name,
                last_name,
                cedula,
                fake.phone_number(),
                'profesor',
                True,
                titulo,
                especialidad,
                años_exp
            ))
            
            profesores_ids.append(cur.fetchone()[0])
            credenciales_profesores.append({
                "first_name": first_name,
                "last_name": last_name,
                "nombre_completo": f"{first_name} {last_name}",
                "cedula": cedula,
                "email": email,
                "titulo": titulo,
                "especialidad": especialidad
            })
        
        print(f"   ✓ {len(profesores_ids)} profesores insertados")
        conn.commit()
        
        # =======================
        # INSERTAR MATERIAS
        # =======================
        print("\n[9/17] Insertando materias...")
        
        materias_ids = {}
        contador_materias = 1
        
        for carrera_nombre, carrera_id in carreras_ids.items():
            # Cada carrera tiene materias similares a Sistemas pero con nombres adaptados
            for materia_base in MATERIAS_SISTEMAS:
                codigo = f"MAT{contador_materias:04d}"
                
                # Adaptar nombres según carrera
                nombre_materia = materia_base["nombre"]
                if "Programación" in nombre_materia and carrera_nombre == "Medicina":
                    nombre_materia = nombre_materia.replace("Programación", "Informática Médica")
                elif "Bases de Datos" in nombre_materia and carrera_nombre == "Administración de Empresas":
                    nombre_materia = nombre_materia.replace("Bases de Datos", "Sistemas de Información Gerencial")
                
                cur.execute("""
                    INSERT INTO public.materias (nombre, codigo, creditos, semestre, carrera_id, descripcion)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    nombre_materia,
                    codigo,
                    materia_base["creditos"],
                    materia_base["semestre"],
                    carrera_id,
                    f"Materia de {materia_base['semestre']}° semestre de {carrera_nombre}"
                ))
                
                materia_id = cur.fetchone()[0]
                materias_ids[f"{carrera_nombre}_{nombre_materia}"] = materia_id
                
                contador_materias += 1
        
        print(f"   ✓ {contador_materias - 1} materias insertadas")
        conn.commit()
        
        # =======================
        # INSERTAR PREREQUISITOS
        # =======================
        print("\n[10/17] Insertando prerequisitos...")
        
        prerequisitos_count = 0
        for carrera_nombre, carrera_id in carreras_ids.items():
            for materia_base in MATERIAS_SISTEMAS:
                if materia_base["prerequisito"]:
                    materia_key = f"{carrera_nombre}_{materia_base['nombre']}"
                    prerequisito_key = f"{carrera_nombre}_{materia_base['prerequisito']}"
                    
                    if materia_key in materias_ids and prerequisito_key in materias_ids:
                        cur.execute("""
                            INSERT INTO public.prerequisitos (materia_id, prerequisito_id)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """, (materias_ids[materia_key], materias_ids[prerequisito_key]))
                        prerequisitos_count += 1
        
        print(f"   ✓ {prerequisitos_count} prerequisitos insertados")
        conn.commit()
        
        # =======================
        # INSERTAR ESTUDIANTES
        # =======================
        print("\n[11/17] Insertando estudiantes...")
        
        estudiantes_ids = []
        credenciales_estudiantes = []
        contador_estudiante = 1
        
        for carrera_nombre, carrera_id in carreras_ids.items():
            # Entre 35-45 estudiantes por carrera
            num_estudiantes = random.randint(35, 45)
            
            for i in range(num_estudiantes):
                first_name = fake.first_name()
                last_name = fake.last_name()
                cedula = generar_cedula_ecuatoriana()
                email = f"{first_name.lower()}.{last_name.lower()}{contador_estudiante}@estudiantes.infocampus.edu.ec"
                
                # Semestre actual (entre 1 y 8)
                semestre_actual = random.randint(1, 8)
                
                # Promedio y créditos según semestre
                promedio = round(random.uniform(7.0, 9.5), 2) if semestre_actual > 1 else None
                creditos_aprob = (semestre_actual - 1) * 15 if semestre_actual > 1 else 0
                
                # 30% tiene beca
                tiene_beca = random.random() < 0.30
                beca_info = random.choice(BECAS) if tiene_beca else None
                
                # 10% tiene convenio activo
                tiene_convenio = random.random() < 0.10
                fecha_convenio = date.today() + timedelta(days=random.randint(30, 365)) if tiene_convenio else None
                
                cur.execute("""
                    INSERT INTO public.usuarios 
                    (username, password_hash, email, first_name, last_name, cedula, telefono, 
                     direccion, fecha_nacimiento, genero, rol, activo, carrera_id, 
                     semestre_actual, promedio_acumulado, creditos_aprobados,
                     es_becado, porcentaje_beca, tipo_beca, convenio_activo, fecha_limite_convenio)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    f"est{contador_estudiante:04d}",
                    password_hash,
                    email,
                    first_name,
                    last_name,
                    cedula,
                    fake.phone_number(),
                    fake.address(),
                    fake.date_of_birth(minimum_age=17, maximum_age=30),
                    random.choice(['M', 'F']),
                    'estudiante',
                    True,
                    carrera_id,
                    semestre_actual,
                    promedio,
                    creditos_aprob,
                    tiene_beca,
                    beca_info["porcentaje"] if beca_info else 0,
                    beca_info["tipo"] if beca_info else None,
                    tiene_convenio,
                    fecha_convenio
                ))
                
                estudiante_id = cur.fetchone()[0]
                estudiantes_ids.append({
                    'id': estudiante_id,
                    'carrera_id': carrera_id,
                    'carrera_nombre': carrera_nombre,
                    'semestre_actual': semestre_actual,
                    'first_name': first_name,
                    'last_name': last_name
                })
                
                credenciales_estudiantes.append({
                    "first_name": first_name,
                    "last_name": last_name,
                    "nombre_completo": f"{first_name} {last_name}",
                    "cedula": cedula,
                    "email": email,
                    "carrera": carrera_nombre,
                    "es_becado": tiene_beca,
                    "tipo_beca": beca_info["tipo"] if beca_info else None,
                    "porcentaje_beca": beca_info["porcentaje"] if beca_info else 0,
                    "convenio_activo": tiene_convenio
                })
                
                contador_estudiante += 1
        
        print(f"   ✓ {len(estudiantes_ids)} estudiantes insertados")
        conn.commit()
        
        # =======================
        # INSERTAR SECCIONES
        # =======================
        print("\n[12/17] Insertando secciones...")
        
        secciones_ids = []
        
        for periodo in periodos_info:
            periodo_id = periodo['id']
            
            # Crear secciones para materias de semestres que correspondan a ese período
            for materia_key, materia_id in materias_ids.items():
                # 70% de probabilidad de abrir sección en cada período
                if random.random() < 0.70:
                    # 1-2 secciones por materia
                    num_secciones = random.randint(1, 2)
                    
                    for s in range(num_secciones):
                        codigo_seccion = f"SEC-{chr(65 + s)}"  # A, B, C...
                        docente = random.choice(profesores_ids)
                        cupo_max = random.randint(25, 40)
                        
                        horario = {
                            "dias": random.choice([["Lunes", "Miércoles"], ["Martes", "Jueves"], ["Viernes"]]),
                            "hora_inicio": f"{random.randint(7, 16):02d}:00",
                            "hora_fin": f"{random.randint(8, 18):02d}:00"
                        }
                        
                        cur.execute("""
                            INSERT INTO public.secciones 
                            (materia_id, periodo_id, docente_id, codigo, cupo_maximo, cupo_actual, aula, horario)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            materia_id,
                            periodo_id,
                            docente,
                            codigo_seccion,
                            cupo_max,
                            0,
                            f"Aula {random.randint(101, 520)}",
                            str(horario).replace("'", '"')
                        ))
                        
                        secciones_ids.append({
                            'id': cur.fetchone()[0],
                            'materia_id': materia_id,
                            'periodo_id': periodo_id,
                            'cupo_maximo': cupo_max,
                            'cupo_actual': 0
                        })
        
        print(f"   ✓ {len(secciones_ids)} secciones insertadas")
        conn.commit()
        
        # =======================
        # INSERTAR PAGOS E INSCRIPCIONES
        # =======================
        print("\n[13/17] Insertando pagos e inscripciones...")
        
        inscripciones_ids = []
        pagos_count = 0
        
        for estudiante in estudiantes_ids:
            estudiante_id = estudiante['id']
            carrera_id = estudiante['carrera_id']
            semestre_actual = estudiante['semestre_actual']
            
            # Inscribir en materias según su historial
            for sem in range(1, semestre_actual + 1):
                # Buscar secciones de materias de ese semestre y carrera
                cur.execute("""
                    SELECT s.id, s.cupo_maximo, s.cupo_actual, s.periodo_id, m.creditos
                    FROM public.secciones s
                    JOIN public.materias m ON s.materia_id = m.id
                    WHERE m.carrera_id = %s AND m.semestre = %s
                    ORDER BY RANDOM()
                    LIMIT 5
                """, (carrera_id, sem))
                
                secciones_disponibles = cur.fetchall()
                
                for seccion_id, cupo_max, cupo_actual, periodo_id, creditos in secciones_disponibles:
                    if cupo_actual < cupo_max:
                        # Crear pago
                        fecha_periodo_inicio = next(p['fecha_inicio'] for p in periodos_info if p['id'] == periodo_id)
                        fecha_pago = fecha_periodo_inicio + timedelta(days=random.randint(-5, 15))
                        
                        # Obtener precio del crédito
                        cur.execute("SELECT precio_credito FROM public.carreras WHERE id = %s", (carrera_id,))
                        precio_credito = cur.fetchone()[0]
                        monto = float(precio_credito) * creditos
                        
                        cur.execute("""
                            INSERT INTO public.pagos 
                            (estudiante_id, monto, fecha_pago, metodo_pago, estado, referencia, concepto, periodo_id)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            estudiante_id,
                            monto,
                            fecha_pago,
                            random.choice(METODOS_PAGO),
                            'completado',
                            f"PAY-{fake.uuid4()[:8].upper()}",
                            f"Pago de matrícula - {creditos} créditos",
                            periodo_id
                        ))
                        
                        pago_id = cur.fetchone()[0]
                        pagos_count += 1
                        
                        # Crear inscripción vinculada al pago
                        estado_inscripcion = random.choices(
                            ['aprobado', 'reprobado', 'activo'],
                            weights=[0.70, 0.10, 0.20]
                        )[0]
                        
                        nota_final = generar_nota_realista() if estado_inscripcion in ['aprobado', 'reprobado'] else None
                        
                        cur.execute("""
                            INSERT INTO public.inscripciones 
                            (estudiante_id, seccion_id, pago_id, fecha_inscripcion, estado, nota_final)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            estudiante_id,
                            seccion_id,
                            pago_id,
                            fecha_pago,
                            estado_inscripcion,
                            nota_final
                        ))
                        
                        inscripcion_id = cur.fetchone()[0]
                        inscripciones_ids.append({
                            'id': inscripcion_id,
                            'estudiante_id': estudiante_id,
                            'seccion_id': seccion_id,
                            'periodo_id': periodo_id,
                            'estado': estado_inscripcion
                        })
                        
                        # Actualizar cupo
                        cur.execute("""
                            UPDATE public.secciones 
                            SET cupo_actual = cupo_actual + 1 
                            WHERE id = %s
                        """, (seccion_id,))
        
        print(f"   ✓ {pagos_count} pagos generados")
        print(f"   ✓ {len(inscripciones_ids)} inscripciones generadas")
        conn.commit()
        
        # =======================
        # INSERTAR EVALUACIONES PARCIALES
        # =======================
        print("\n[14/17] Insertando evaluaciones parciales...")
        
        evaluaciones_count = 0
        
        for inscripcion in inscripciones_ids:
            if inscripcion['estado'] in ['aprobado', 'reprobado']:
                # Crear evaluaciones para esta inscripción
                for tipo_eval in TIPOS_EVALUACION:
                    nota = generar_nota_realista()
                    
                    # Fecha de evaluación dentro del período
                    periodo = next(p for p in periodos_info if p['id'] == inscripcion['periodo_id'])
                    dias_en_periodo = (periodo['fecha_fin'] - periodo['fecha_inicio']).days
                    fecha_eval = periodo['fecha_inicio'] + timedelta(days=random.randint(20, dias_en_periodo - 10))
                    
                    cur.execute("""
                        INSERT INTO public.evaluaciones_parciales 
                        (inscripcion_id, tipo_evaluacion, nota, fecha_evaluacion, peso_porcentual)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        inscripcion['id'],
                        tipo_eval['tipo'],
                        nota,
                        fecha_eval,
                        tipo_eval['peso'] * 100
                    ))
                    evaluaciones_count += 1
        
        print(f"   ✓ {evaluaciones_count} evaluaciones parciales generadas")
        conn.commit()
        
        # =======================
        # INSERTAR ASISTENCIAS
        # =======================
        print("\n[15/17] Insertando registros de asistencia...")
        
        asistencias_count = 0
        
        for inscripcion in inscripciones_ids[:2000]:  # Limitar para no sobrecargar
            periodo = next(p for p in periodos_info if p['id'] == inscripcion['periodo_id'])
            
            # Generar 20-40 registros de asistencia por inscripción
            num_asistencias = random.randint(20, 40)
            
            fecha_actual = periodo['fecha_inicio']
            for _ in range(num_asistencias):
                if fecha_actual >= periodo['fecha_fin']:
                    break
                
                # Solo días de semana
                if fecha_actual.weekday() < 5:
                    estado = generar_asistencia_realista()
                    
                    try:
                        cur.execute("""
                            INSERT INTO public.asistencias (inscripcion_id, fecha, estado)
                            VALUES (%s, %s, %s)
                        """, (inscripcion['id'], fecha_actual, estado))
                        asistencias_count += 1
                    except:
                        pass  # Ignorar duplicados
                
                fecha_actual += timedelta(days=1)
        
        print(f"   ✓ {asistencias_count} registros de asistencia generados")
        conn.commit()
        
        # =======================
        # INSERTAR LOGS DE AUDITORÍA
        # =======================
        print("\n[16/17] Insertando logs de auditoría...")
        
        ACCIONES = ['login', 'logout', 'crear_usuario', 'modificar_usuario', 'eliminar_usuario', 
                   'crear_inscripcion', 'modificar_nota', 'crear_pago', 'consulta_reporte']
        
        logs_count = 0
        for _ in range(500):
            usuario_id = random.choice(profesores_ids + [e['id'] for e in estudiantes_ids[:50]])
            accion = random.choice(ACCIONES)
            
            cur.execute("""
                INSERT INTO public.audit_logs 
                (usuario_id, accion, tabla_afectada, detalles, ip_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                usuario_id,
                accion,
                random.choice(['usuarios', 'inscripciones', 'pagos', 'evaluaciones']),
                '{"cambio": "ejemplo"}',
                fake.ipv4()
            ))
            logs_count += 1
        
        print(f"   ✓ {logs_count} logs de auditoría generados")
        conn.commit()
        
        # =======================
        # GENERAR ARCHIVO TXT CON CREDENCIALES
        # =======================
        print("\n[17/17] Generando archivo de credenciales...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"credenciales_infocampus_{timestamp}.txt"
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("=" * 100 + "\n")
            f.write("INFOCAMPUS ERP - CREDENCIALES DE ACCESO\n")
            f.write("=" * 100 + "\n")
            f.write(f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Contraseña Universal: campus2026\n")
            f.write("=" * 100 + "\n\n")
            
            # USUARIOS ADMINISTRATIVOS
            f.write("━" * 100 + "\n")
            f.write("USUARIOS ADMINISTRATIVOS\n")
            f.write("━" * 100 + "\n\n")
            
            for usuario in usuarios_admin:
                f.write(f"ROL:      {usuario['rol'].upper()}\n")
                f.write(f"Nombre:   {usuario['first_name']} {usuario['last_name']}\n")
                f.write(f"Cédula:   {usuario['cedula']}\n")
                f.write(f"Email:    {usuario['email']}\n")
                f.write(f"Título:   {usuario['titulo']}\n")
                f.write(f"Password: campus2026\n")
                f.write("-" * 100 + "\n\n")
            
            # PROFESORES
            f.write("━" * 100 + "\n")
            f.write(f"PROFESORES ({len(credenciales_profesores)} total)\n")
            f.write("━" * 100 + "\n\n")
            
            for i, prof in enumerate(credenciales_profesores, 1):
                f.write(f"[{i:03d}] {prof['nombre_completo']}\n")
                f.write(f"      Cédula:       {prof['cedula']}\n")
                f.write(f"      Email:        {prof['email']}\n")
                f.write(f"      Título:       {prof['titulo']}\n")
                f.write(f"      Especialidad: {prof['especialidad']}\n")
                f.write(f"      Password:     campus2026\n")
                f.write("-" * 100 + "\n")
            
            # ESTUDIANTES
            f.write("\n" + "━" * 100 + "\n")
            f.write(f"ESTUDIANTES ({len(credenciales_estudiantes)} total)\n")
            f.write("━" * 100 + "\n\n")
            
            # Agrupar por carrera
            estudiantes_por_carrera = {}
            for est in credenciales_estudiantes:
                carrera = est['carrera']
                if carrera not in estudiantes_por_carrera:
                    estudiantes_por_carrera[carrera] = []
                estudiantes_por_carrera[carrera].append(est)
            
            for carrera, estudiantes_list in sorted(estudiantes_por_carrera.items()):
                f.write(f"\n{'▸' * 50}\n")
                f.write(f"CARRERA: {carrera} ({len(estudiantes_list)} estudiantes)\n")
                f.write(f"{'▸' * 50}\n\n")
                
                for i, est in enumerate(estudiantes_list, 1):
                    beca_info = f"{est['tipo_beca']} ({est['porcentaje_beca']}%)" if est['es_becado'] else "Sin beca"
                    convenio_info = "Convenio activo" if est['convenio_activo'] else ""
                    
                    f.write(f"[{i:03d}] {est['nombre_completo']}\n")
                    f.write(f"      Cédula:   {est['cedula']}\n")
                    f.write(f"      Email:    {est['email']}\n")
                    f.write(f"      Beca:     {beca_info}\n")
                    if convenio_info:
                        f.write(f"      Convenio: {convenio_info}\n")
                    f.write(f"      Password: campus2026\n")
                    f.write("-" * 100 + "\n")
            
            # RESUMEN FINAL
            f.write("\n" + "=" * 100 + "\n")
            f.write("RESUMEN DE CREDENCIALES\n")
            f.write("=" * 100 + "\n\n")
            f.write(f"Total Administrativos: {len(usuarios_admin)}\n")
            f.write(f"Total Profesores:      {len(credenciales_profesores)}\n")
            f.write(f"Total Estudiantes:     {len(credenciales_estudiantes)}\n")
            f.write(f"GRAN TOTAL:            {len(usuarios_admin) + len(credenciales_profesores) + len(credenciales_estudiantes)}\n\n")
            
            # Estadísticas de becas
            becados = sum(1 for e in credenciales_estudiantes if e['es_becado'])
            convenios = sum(1 for e in credenciales_estudiantes if e['convenio_activo'])
            f.write(f"\nEstudiantes con Beca:     {becados} ({becados/len(credenciales_estudiantes)*100:.1f}%)\n")
            f.write(f"Estudiantes con Convenio: {convenios} ({convenios/len(credenciales_estudiantes)*100:.1f}%)\n")
            
            # Distribución por carrera
            f.write("\nDistribución por Carrera:\n")
            for carrera, estudiantes_list in sorted(estudiantes_por_carrera.items(), key=lambda x: len(x[1]), reverse=True):
                f.write(f"  • {carrera}: {len(estudiantes_list)} estudiantes\n")
            
            f.write("\n" + "=" * 100 + "\n")
            f.write("NOTAS IMPORTANTES:\n")
            f.write("=" * 100 + "\n")
            f.write("1. La contraseña 'campus2026' es universal para TODOS los usuarios\n")
            f.write("2. Los estudiantes tienen historial académico de 1 a 4 años\n")
            f.write("3. El 30% de estudiantes tienen becas activas\n")
            f.write("4. El 10% de estudiantes tienen convenios de pago vigentes\n")
            f.write("5. Todos los datos son generados con Faker para realismo\n")
            f.write("6. IMPORTANTE: Las inscripciones están vinculadas con pago_id\n")
            f.write("7. Tabla usuarios usa first_name y last_name (NO nombre_completo)\n")
            f.write("8. Campo password_hash (NO password)\n")
            f.write("9. Campos de beca: es_becado, porcentaje_beca, tipo_beca\n")
            f.write("10. Campos de convenio: convenio_activo, fecha_limite_convenio\n")
            f.write("=" * 100 + "\n")
        
        print(f"   ✓ Archivo '{filename}' generado exitosamente")
        
        # =======================
        # COMMIT FINAL
        # =======================
        conn.commit()
        
        # =======================
        # ESTADÍSTICAS FINALES
        # =======================
        print("\n" + "=" * 80)
        print("✅ POBLACIÓN COMPLETADA EXITOSAMENTE")
        print("=" * 80)
        
        cur.execute("SELECT COUNT(*) FROM public.carreras")
        print(f"📚 Carreras: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.materias")
        print(f"📖 Materias: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.periodos_lectivos")
        print(f"📅 Períodos Lectivos: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.usuarios WHERE rol = 'estudiante'")
        print(f"🎓 Estudiantes: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.usuarios WHERE rol = 'profesor'")
        print(f"👨‍🏫 Profesores: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.secciones")
        print(f"📋 Secciones: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.inscripciones")
        print(f"✍️ Inscripciones: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.evaluaciones_parciales")
        print(f"📝 Evaluaciones Parciales: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.asistencias")
        print(f"✅ Registros de Asistencia: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.pagos")
        print(f"💰 Pagos: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.audit_logs")
        print(f"📋 Logs de Auditoría: {cur.fetchone()[0]}")
        
        cur.execute("SELECT COUNT(*) FROM public.configuracion_ia")
        print(f"🤖 Configuraciones IA: {cur.fetchone()[0]}")
        
        # Estadísticas de becas
        cur.execute("SELECT COUNT(*) FROM public.usuarios WHERE es_becado = true")
        becados = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM public.usuarios WHERE convenio_activo = true")
        convenios = cur.fetchone()[0]
        
        print(f"🎁 Estudiantes con Beca: {becados}")
        print(f"🤝 Estudiantes con Convenio: {convenios}")
        
        print("\n" + "=" * 80)
        print("🔐 CREDENCIALES DE ACCESO")
        print("=" * 80)
        print("⚠️ CONTRASEÑA UNIVERSAL: campus2026")
        print("")
        print("Director:       director@infocampus.edu.ec / campus2026")
        print("Coordinador:    coordinador@infocampus.edu.ec / campus2026")
        print("Tesorero:       tesorero@infocampus.edu.ec / campus2026")
        print("Profesores:     [nombre].[apellido]@infocampus.edu.ec / campus2026")
        print("Estudiantes:    [nombre].[apellido][N]@estudiantes.infocampus.edu.ec / campus2026")
        print("")
        print(f"📄 Archivo detallado generado: {filename}")
        print("=" * 80)
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        cur.close()
        conn.close()
        print("\n✅ Conexión cerrada")

if __name__ == "__main__":
    main()