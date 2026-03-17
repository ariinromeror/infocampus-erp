#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
InfoCampus ERP — populate_v7.py  (Aligned 100% with Backend)
=============================================================
CAMBIOS vs V6:

SCHEMA FIXES (bugs críticos):
  🚨1  Tabla historial_notas CREADA (usada por PUT /academico/inscripciones/{id}/corregir-nota
       y GET /director/historial-notas).
  🚨2  Columna asistencias.observaciones AÑADIDA (usada por POST /profesor/asistencia).
  🚨3  configuracion_ia.actualizado_en en vez de updated_at; se eliminan tipo y created_at
       (director_router.py usa exactamente esa columna).

ÍNDICES DE PERFORMANCE (nuevos):
  - usuarios(rol)                               — dashboards filtran por rol
  - usuarios(carrera_id)                        — JOIN frecuente
  - usuarios(rol, es_becado)                    — KPI estudiantes_becados
  - inscripciones(estudiante_id) WHERE pago_id IS NULL  — mora parcial
  - inscripciones(pago_id, estudiante_id)       — JOIN mora completo
  - historial_notas(inscripcion_id)             — FK lookup

VOLÚMENES AJUSTADOS para portafolio:
  - Profesores           50 → 30
  - Estudiantes         500 → 200
  - Períodos históricos  10 → 6 (2023-2025)
  - Asistencias hist.   ≤25 → ≤15 por inscripción
  - Asistencias activas ≤20 → ≤10 fechas
  - Audit logs          500 → 200

SEEDERS NUEVOS/AJUSTADOS:
  - seed_historial_notas(): 20 correcciones de notas de ejemplo
  - seed_asistencias(): añade observaciones (~15 % de tardanza/justificado)
"""

# ─── STDLIB ────────────────────────────────────────────────────────────────────
import json
import logging
import os
import random
import sys
import unicodedata
import warnings
from datetime import date, datetime, timedelta
from decimal import Decimal

warnings.filterwarnings("ignore", message=".*bcrypt.*")

# ─── THIRD-PARTY ───────────────────────────────────────────────────────────────
try:
    import psycopg2
    import psycopg2.extras
    from passlib.context import CryptContext
    from faker import Faker
    from tqdm import tqdm
    from dotenv import load_dotenv
except ImportError as exc:
    print(f"[ERROR] Dependencia faltante: {exc}")
    print("Instala con: pip install psycopg2-binary passlib[bcrypt] faker tqdm python-dotenv")
    sys.exit(1)

# ─── CONFIGURACIÓN ─────────────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("seeder")

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

fake = Faker("es_ES")
Faker.seed(42)
random.seed(42)

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    log.error("Variable DATABASE_URL no encontrada. Revisa tu .env")
    sys.exit(1)

UNIVERSAL_PASSWORD = "campus2026"

# ─── CONSTANTES DE NEGOCIO ─────────────────────────────────────────────────────
NOTA_APROBACION = 7.0
ASISTENCIA_MIN  = 75

TIPOS_EVALUACION = [
    ("parcial_1",    25.0),
    ("parcial_2",    25.0),
    ("talleres",     20.0),
    ("examen_final", 30.0),
]

METODOS_PAGO = ["efectivo", "transferencia", "tarjeta_debito", "tarjeta_credito", "bizum"]

BECAS = [
    ("Excelencia Académica", 50),
    ("Deportiva",            30),
    ("Necesidad Económica",  40),
    ("Familia Numerosa",     20),
    ("Beca Completa",       100),
]

MOTIVOS_CORRECCION = [
    "Error de cálculo en la nota final",
    "Revisión de examen aprobada por tribunal",
    "Corrección administrativa por error de ingreso",
    "Apelación aceptada tras revisión",
    "Error tipográfico en acta",
    "Recalificación por entrega tardía justificada",
    "Corrección por ausencia justificada médica",
]

OBSERVACIONES_ASISTENCIA = [
    "Llegó 15 minutos tarde sin justificación previa",
    "Justificó la falta con certificado médico",
    "Aviso previo por compromisos laborales",
    "Tardanza por problema de transporte",
    "Justificación presentada al día siguiente",
    "Permiso autorizado por coordinación",
]

# ─── DATOS MAESTROS ─────────────────────────────────────────────────────────────
CARRERAS = [
    {"nombre": "Ingeniería Informática",      "creditos": 240, "precio_credito": 45.00, "dias_gracia": 15},
    {"nombre": "Administración de Empresas",  "creditos": 200, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Derecho",                      "creditos": 220, "precio_credito": 42.00, "dias_gracia": 12},
    {"nombre": "Psicología",                   "creditos": 200, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Arquitectura",                 "creditos": 250, "precio_credito": 50.00, "dias_gracia": 15},
    {"nombre": "Medicina",                     "creditos": 300, "precio_credito": 60.00, "dias_gracia": 20},
    {"nombre": "Enfermería",                   "creditos": 180, "precio_credito": 38.00, "dias_gracia": 10},
    {"nombre": "Diseño Gráfico",               "creditos": 180, "precio_credito": 38.00, "dias_gracia": 10},
    {"nombre": "Marketing Digital",            "creditos": 180, "precio_credito": 40.00, "dias_gracia": 10},
    {"nombre": "Gastronomía",                  "creditos": 160, "precio_credito": 35.00, "dias_gracia":  8},
    {"nombre": "Turismo y Hostelería",         "creditos": 180, "precio_credito": 37.00, "dias_gracia": 10},
    {"nombre": "Contabilidad y Finanzas",      "creditos": 200, "precio_credito": 40.00, "dias_gracia": 10},
]

MALLA: dict[str, list[dict]] = {
    "Ingeniería Informática": [
        {"s": 1, "n": "Introducción a la Programación",   "c": 4, "pre": None},
        {"s": 1, "n": "Matemáticas para Informática",     "c": 4, "pre": None},
        {"s": 1, "n": "Fundamentos de Hardware",           "c": 3, "pre": None},
        {"s": 1, "n": "Álgebra Lineal",                    "c": 3, "pre": None},
        {"s": 2, "n": "Programación Orientada a Objetos",  "c": 4, "pre": "Introducción a la Programación"},
        {"s": 2, "n": "Cálculo Integral",                  "c": 4, "pre": "Matemáticas para Informática"},
        {"s": 2, "n": "Estructuras de Datos",              "c": 4, "pre": "Introducción a la Programación"},
        {"s": 2, "n": "Sistemas Operativos",               "c": 3, "pre": "Fundamentos de Hardware"},
        {"s": 3, "n": "Bases de Datos I",                  "c": 4, "pre": "Estructuras de Datos"},
        {"s": 3, "n": "Algoritmos Avanzados",              "c": 4, "pre": "Estructuras de Datos"},
        {"s": 3, "n": "Redes de Computadores",             "c": 3, "pre": "Sistemas Operativos"},
        {"s": 3, "n": "Estadística Aplicada",              "c": 3, "pre": "Cálculo Integral"},
        {"s": 4, "n": "Ingeniería de Software",            "c": 4, "pre": "Programación Orientada a Objetos"},
        {"s": 4, "n": "Bases de Datos II",                 "c": 4, "pre": "Bases de Datos I"},
        {"s": 4, "n": "Seguridad Informática",             "c": 4, "pre": "Redes de Computadores"},
        {"s": 5, "n": "Desarrollo Web",                    "c": 4, "pre": "Bases de Datos II"},
        {"s": 5, "n": "Inteligencia Artificial",           "c": 4, "pre": "Algoritmos Avanzados"},
        {"s": 5, "n": "Proyecto de Grado I",               "c": 3, "pre": "Ingeniería de Software"},
    ],
    "Administración de Empresas": [
        {"s": 1, "n": "Introducción a la Administración", "c": 4, "pre": None},
        {"s": 1, "n": "Matemáticas Empresariales",        "c": 4, "pre": None},
        {"s": 1, "n": "Economía General",                  "c": 3, "pre": None},
        {"s": 1, "n": "Comunicación Empresarial",          "c": 3, "pre": None},
        {"s": 2, "n": "Contabilidad Básica",               "c": 4, "pre": "Matemáticas Empresariales"},
        {"s": 2, "n": "Microeconomía",                     "c": 4, "pre": "Economía General"},
        {"s": 2, "n": "Gestión de Recursos Humanos",       "c": 4, "pre": "Introducción a la Administración"},
        {"s": 3, "n": "Marketing Fundamentos",             "c": 4, "pre": "Microeconomía"},
        {"s": 3, "n": "Finanzas Corporativas",             "c": 4, "pre": "Contabilidad Básica"},
        {"s": 4, "n": "Estrategia Empresarial",            "c": 4, "pre": "Marketing Fundamentos"},
        {"s": 4, "n": "Análisis Financiero",               "c": 4, "pre": "Finanzas Corporativas"},
        {"s": 5, "n": "Trabajo Fin de Grado I",            "c": 3, "pre": "Estrategia Empresarial"},
    ],
    "Derecho": [
        {"s": 1, "n": "Introducción al Derecho",  "c": 4, "pre": None},
        {"s": 1, "n": "Historia del Derecho",     "c": 3, "pre": None},
        {"s": 1, "n": "Teoría del Estado",         "c": 3, "pre": None},
        {"s": 2, "n": "Derecho Civil I",           "c": 4, "pre": "Introducción al Derecho"},
        {"s": 2, "n": "Derecho Constitucional",    "c": 4, "pre": "Teoría del Estado"},
        {"s": 2, "n": "Derecho Penal General",     "c": 4, "pre": "Introducción al Derecho"},
        {"s": 3, "n": "Derecho Civil II",          "c": 4, "pre": "Derecho Civil I"},
        {"s": 3, "n": "Derecho Administrativo",    "c": 4, "pre": "Derecho Constitucional"},
        {"s": 4, "n": "Derecho Procesal Civil",    "c": 4, "pre": "Derecho Civil II"},
        {"s": 5, "n": "Práctica Jurídica",         "c": 4, "pre": "Derecho Procesal Civil"},
        {"s": 5, "n": "Trabajo Fin de Grado I",    "c": 3, "pre": "Derecho Procesal Civil"},
    ],
    "Psicología": [
        {"s": 1, "n": "Introducción a la Psicología",         "c": 4, "pre": None},
        {"s": 1, "n": "Neurociencias Básicas",                "c": 4, "pre": None},
        {"s": 1, "n": "Estadística Aplicada a la Psicología", "c": 3, "pre": None},
        {"s": 2, "n": "Psicología del Desarrollo",            "c": 4, "pre": "Introducción a la Psicología"},
        {"s": 2, "n": "Psicología Social",                    "c": 4, "pre": "Introducción a la Psicología"},
        {"s": 3, "n": "Psicopatología",                       "c": 4, "pre": "Psicología del Desarrollo"},
        {"s": 3, "n": "Evaluación Psicológica",               "c": 4, "pre": "Estadística Aplicada a la Psicología"},
        {"s": 4, "n": "Técnicas de Intervención",             "c": 4, "pre": "Psicopatología"},
        {"s": 5, "n": "Practicum Clínico",                    "c": 4, "pre": "Técnicas de Intervención"},
        {"s": 5, "n": "Trabajo Fin de Grado I",               "c": 3, "pre": "Técnicas de Intervención"},
    ],
    "Arquitectura": [
        {"s": 1, "n": "Fundamentos de Arquitectura",         "c": 4, "pre": None},
        {"s": 1, "n": "Dibujo Técnico Arquitectónico",       "c": 4, "pre": None},
        {"s": 2, "n": "Diseño Arquitectónico I",             "c": 5, "pre": "Fundamentos de Arquitectura"},
        {"s": 2, "n": "Estructuras I",                       "c": 4, "pre": None},
        {"s": 3, "n": "Diseño Arquitectónico II",            "c": 5, "pre": "Diseño Arquitectónico I"},
        {"s": 3, "n": "Urbanismo",                           "c": 4, "pre": "Diseño Arquitectónico I"},
        {"s": 4, "n": "Diseño Arquitectónico III",           "c": 5, "pre": "Diseño Arquitectónico II"},
        {"s": 4, "n": "BIM y Tecnología Digital",            "c": 4, "pre": "Dibujo Técnico Arquitectónico"},
        {"s": 5, "n": "Proyecto Final de Arquitectura",      "c": 5, "pre": "Diseño Arquitectónico III"},
        {"s": 5, "n": "Trabajo Fin de Grado I",              "c": 3, "pre": "Diseño Arquitectónico III"},
    ],
    "Medicina": [
        {"s": 1, "n": "Anatomía Humana I",     "c": 5, "pre": None},
        {"s": 1, "n": "Biología Celular",       "c": 4, "pre": None},
        {"s": 2, "n": "Anatomía Humana II",     "c": 5, "pre": "Anatomía Humana I"},
        {"s": 2, "n": "Fisiología I",           "c": 4, "pre": "Biología Celular"},
        {"s": 3, "n": "Fisiología II",          "c": 4, "pre": "Fisiología I"},
        {"s": 3, "n": "Patología General",      "c": 4, "pre": "Anatomía Humana II"},
        {"s": 4, "n": "Semiología Médica",      "c": 4, "pre": "Patología General"},
        {"s": 4, "n": "Medicina Interna I",     "c": 4, "pre": "Semiología Médica"},
        {"s": 5, "n": "Cirugía General I",      "c": 4, "pre": "Medicina Interna I"},
        {"s": 5, "n": "Pediatría",              "c": 4, "pre": "Medicina Interna I"},
    ],
    "Enfermería": [
        {"s": 1, "n": "Fundamentos de Enfermería",  "c": 4, "pre": None},
        {"s": 1, "n": "Anatomía y Fisiología",      "c": 4, "pre": None},
        {"s": 2, "n": "Enfermería Clínica I",        "c": 4, "pre": "Fundamentos de Enfermería"},
        {"s": 2, "n": "Farmacología Básica",         "c": 4, "pre": "Anatomía y Fisiología"},
        {"s": 3, "n": "Enfermería Clínica II",       "c": 4, "pre": "Enfermería Clínica I"},
        {"s": 3, "n": "Cuidados Intensivos",         "c": 4, "pre": "Farmacología Básica"},
        {"s": 4, "n": "Enfermería Quirúrgica",       "c": 4, "pre": "Cuidados Intensivos"},
        {"s": 5, "n": "Prácticum Hospitalario",      "c": 5, "pre": "Enfermería Quirúrgica"},
        {"s": 5, "n": "Trabajo Fin de Grado",        "c": 3, "pre": "Prácticum Hospitalario"},
    ],
    "Diseño Gráfico": [
        {"s": 1, "n": "Fundamentos del Diseño",   "c": 4, "pre": None},
        {"s": 1, "n": "Teoría del Color",          "c": 3, "pre": None},
        {"s": 2, "n": "Diseño Digital I",          "c": 4, "pre": "Fundamentos del Diseño"},
        {"s": 2, "n": "Tipografía",                "c": 4, "pre": "Teoría del Color"},
        {"s": 3, "n": "Diseño Editorial",          "c": 4, "pre": "Tipografía"},
        {"s": 3, "n": "Diseño Web",                "c": 4, "pre": "Diseño Digital I"},
        {"s": 4, "n": "Diseño UX/UI",              "c": 4, "pre": "Diseño Web"},
        {"s": 5, "n": "Proyecto de Diseño",        "c": 4, "pre": "Diseño UX/UI"},
        {"s": 5, "n": "Trabajo Fin de Grado",      "c": 3, "pre": "Proyecto de Diseño"},
    ],
    "Marketing Digital": [
        {"s": 1, "n": "Fundamentos de Marketing",     "c": 4, "pre": None},
        {"s": 1, "n": "Estadística para Marketing",   "c": 4, "pre": None},
        {"s": 2, "n": "Marketing Digital I",          "c": 4, "pre": "Fundamentos de Marketing"},
        {"s": 2, "n": "SEO y SEM",                    "c": 4, "pre": "Marketing Digital I"},
        {"s": 3, "n": "Analítica Web",                "c": 4, "pre": "SEO y SEM"},
        {"s": 3, "n": "Publicidad Digital",           "c": 4, "pre": "Marketing Digital I"},
        {"s": 4, "n": "Estrategia de Contenidos",     "c": 4, "pre": "Publicidad Digital"},
        {"s": 5, "n": "Plan de Marketing Digital",    "c": 4, "pre": "Estrategia de Contenidos"},
        {"s": 5, "n": "Trabajo Fin de Grado",         "c": 3, "pre": "Plan de Marketing Digital"},
    ],
    "Gastronomía": [
        {"s": 1, "n": "Técnicas Culinarias Básicas",    "c": 4, "pre": None},
        {"s": 1, "n": "Higiene y Seguridad Alimentaria","c": 3, "pre": None},
        {"s": 2, "n": "Cocina Española",                "c": 4, "pre": "Técnicas Culinarias Básicas"},
        {"s": 2, "n": "Pastelería y Repostería",        "c": 4, "pre": "Técnicas Culinarias Básicas"},
        {"s": 3, "n": "Cocina Internacional",           "c": 4, "pre": "Cocina Española"},
        {"s": 3, "n": "Alta Cocina y Vanguardia",       "c": 4, "pre": "Cocina Española"},
        {"s": 4, "n": "Menú Degustación",               "c": 4, "pre": "Alta Cocina y Vanguardia"},
        {"s": 5, "n": "Prácticas en Restaurante",       "c": 5, "pre": "Menú Degustación"},
        {"s": 5, "n": "Trabajo Fin de Grado",           "c": 3, "pre": "Prácticas en Restaurante"},
    ],
    "Turismo y Hostelería": [
        {"s": 1, "n": "Introducción al Turismo",     "c": 4, "pre": None},
        {"s": 1, "n": "Inglés para Turismo I",       "c": 4, "pre": None},
        {"s": 2, "n": "Gestión Hotelera",            "c": 4, "pre": "Introducción al Turismo"},
        {"s": 2, "n": "Inglés para Turismo II",      "c": 4, "pre": "Inglés para Turismo I"},
        {"s": 3, "n": "Revenue Management",          "c": 3, "pre": "Gestión Hotelera"},
        {"s": 3, "n": "Turismo Sostenible",          "c": 4, "pre": "Introducción al Turismo"},
        {"s": 4, "n": "Dirección de Hoteles",        "c": 4, "pre": "Revenue Management"},
        {"s": 5, "n": "Prácticas Hoteleras",         "c": 5, "pre": "Dirección de Hoteles"},
        {"s": 5, "n": "Trabajo Fin de Grado",        "c": 3, "pre": "Dirección de Hoteles"},
    ],
    "Contabilidad y Finanzas": [
        {"s": 1, "n": "Contabilidad Financiera I",    "c": 4, "pre": None},
        {"s": 1, "n": "Matemáticas Financieras",      "c": 4, "pre": None},
        {"s": 2, "n": "Contabilidad Financiera II",   "c": 4, "pre": "Contabilidad Financiera I"},
        {"s": 2, "n": "Estadística Financiera",       "c": 4, "pre": "Matemáticas Financieras"},
        {"s": 3, "n": "Contabilidad de Costes",       "c": 4, "pre": "Contabilidad Financiera II"},
        {"s": 3, "n": "Finanzas Corporativas",        "c": 4, "pre": "Estadística Financiera"},
        {"s": 4, "n": "Análisis de Estados Financieros","c": 4, "pre": "Contabilidad de Costes"},
        {"s": 4, "n": "Gestión de Inversiones",       "c": 4, "pre": "Finanzas Corporativas"},
        {"s": 5, "n": "Contabilidad Internacional (IFRS)","c": 4, "pre": "Análisis de Estados Financieros"},
        {"s": 5, "n": "Trabajo Fin de Grado",         "c": 3, "pre": "Análisis de Estados Financieros"},
    ],
}

TITULOS: dict[str, list[str]] = {
    "Ingeniería Informática":      ["Dr. en CC. de la Computación", "Máster en Ing. del Software", "Máster en Ciberseguridad"],
    "Administración de Empresas":  ["Dr. en Administración", "MBA", "Máster en Gestión Empresarial"],
    "Derecho":                      ["Dr. en Derecho", "Máster en Derecho Mercantil", "Abogado"],
    "Psicología":                   ["Dr. en Psicología Clínica", "Máster en Psicología", "Psicólogo Sanitario"],
    "Arquitectura":                 ["Dr. Arquitecto", "Máster en Urbanismo", "Arquitecto Superior"],
    "Medicina":                     ["Dr. en Medicina", "Especialista en Medicina Interna", "Dr. en Cirugía"],
    "Enfermería":                   ["Máster en Enfermería Clínica", "Enfermero Especialista"],
    "Diseño Gráfico":               ["Máster en Diseño Digital", "Licenciado en Bellas Artes"],
    "Marketing Digital":            ["Máster en Marketing Digital", "MBA Marketing"],
    "Gastronomía":                  ["Chef Ejecutivo", "Máster en Gastronomía"],
    "Turismo y Hostelería":         ["Máster en Dirección Hotelera", "Licenciado en Turismo"],
    "Contabilidad y Finanzas":      ["Dr. en Finanzas", "Máster en Contabilidad", "Auditor Certificado"],
}

DIAS_SEMANA = [
    ["Lunes", "Miércoles"],
    ["Martes", "Jueves"],
    ["Lunes", "Miércoles", "Viernes"],
    ["Viernes"],
]


# ─── UTILIDADES ────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", str(text))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text.lower().replace(" ", ".").replace("-", ".")


def hash_pwd(plain: str) -> str:
    return pwd_ctx.hash(plain)


def dni_es() -> str:
    n = random.randint(10_000_000, 99_999_999)
    return f"{n}{'TRWAGMYFPDXBNJZSQVHLCKE'[n % 23]}"


def nota_aprobada() -> float:
    return round(random.uniform(7.0, 10.0), 2)


def nota_reprobada() -> float:
    return round(random.uniform(1.0, 6.9), 2)


def estado_asistencia() -> str:
    r = random.random()
    if r < 0.82:  return "presente"
    if r < 0.88:  return "tardanza"
    if r < 0.94:  return "ausente"
    return "justificado"


# ─── SEEDER ────────────────────────────────────────────────────────────────────

class DatabaseSeeder:

    def __init__(self, dsn: str):
        self.conn = psycopg2.connect(dsn)
        self.conn.autocommit = False
        self.cur  = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        self._pwd_hash = hash_pwd(UNIVERSAL_PASSWORD)

        self.carreras_map:   dict[str, dict] = {}
        self.periodos:       list[dict]      = []
        self.periodo_activo: dict            = {}
        self.profesores:     list[dict]      = []
        self.estudiantes:    list[dict]      = []
        self.materias_map:   dict[str, int]  = {}
        self.secciones:      list[dict]      = []
        self.seccion_activa_por_materia: dict[int, dict] = {}

        self.inscripciones_historicas: list[dict] = []
        self.inscripciones_activas:    list[dict] = []

        self.creds_admins:  list[dict] = []
        self.creds_profs:   list[dict] = []
        self.creds_estus:   list[dict] = []

    def _commit(self):
        self.conn.commit()

    def _exec(self, sql: str, params=None):
        self.cur.execute(sql, params)

    def _fetchone(self, sql: str, params=None) -> dict | None:
        self.cur.execute(sql, params)
        row = self.cur.fetchone()
        return dict(row) if row else None

    def _fetchall(self, sql: str, params=None) -> list[dict]:
        self.cur.execute(sql, params)
        return [dict(r) for r in self.cur.fetchall()]

    def _batch(self, sql: str, rows: list[tuple]):
        psycopg2.extras.execute_values(self.cur, sql, rows, page_size=500)

    # ─── PASO 1 ───────────────────────────────────────────────────────────────

    def drop_and_create_schema(self):
        log.info("━━━ [1/18] Recreando schema...")
        tablas = [
            "audit_logs", "historial_notas", "asistencias", "evaluaciones_parciales",
            "inscripciones", "pagos", "secciones", "prerequisitos",
            "materias", "periodos_lectivos", "usuarios", "carreras",
            "configuracion_ia", "revoked_tokens",
        ]
        for t in tablas:
            self._exec(f"DROP TABLE IF EXISTS public.{t} CASCADE")
        log.info("   Tablas eliminadas")

        self._exec("""
        CREATE TABLE public.carreras (
            id               SERIAL PRIMARY KEY,
            nombre           VARCHAR(100) NOT NULL,
            codigo           VARCHAR(20)  UNIQUE NOT NULL,
            duracion_semestres INTEGER    NOT NULL,
            creditos_totales INTEGER      NOT NULL,
            precio_credito   DECIMAL(10,2) NOT NULL,
            dias_gracia_pago INTEGER      DEFAULT 10,
            descripcion      TEXT,
            created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )""")

        self._exec("""
        CREATE TABLE public.usuarios (
            id                   SERIAL PRIMARY KEY,
            username             VARCHAR(50)  UNIQUE NOT NULL,
            password_hash        VARCHAR(255) NOT NULL,
            email                VARCHAR(100) UNIQUE NOT NULL,
            first_name           VARCHAR(50)  NOT NULL,
            last_name            VARCHAR(50)  NOT NULL,
            cedula               VARCHAR(15)  UNIQUE,
            telefono             VARCHAR(20),
            direccion            TEXT,
            fecha_nacimiento     DATE,
            genero               VARCHAR(20),
            rol                  VARCHAR(20)  NOT NULL
                CHECK (rol IN ('admin','profesor','estudiante','director','coordinador','tesorero','administrativo')),
            activo               BOOLEAN      DEFAULT true,
            carrera_id           INTEGER      REFERENCES public.carreras(id) ON DELETE SET NULL,
            semestre_actual      INTEGER,
            promedio_acumulado   DECIMAL(5,2) DEFAULT 0.00,
            creditos_aprobados   INTEGER      DEFAULT 0,
            titulo_academico     VARCHAR(150),
            especialidad         VARCHAR(100),
            años_experiencia     INTEGER,
            es_becado            BOOLEAN      DEFAULT false,
            porcentaje_beca      INTEGER      DEFAULT 0,
            tipo_beca            VARCHAR(100),
            convenio_activo      BOOLEAN      DEFAULT false,
            fecha_limite_convenio DATE,
            created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )""")

        self._exec("""
        CREATE TABLE public.periodos_lectivos (
            id           SERIAL PRIMARY KEY,
            nombre       VARCHAR(50)  NOT NULL,
            codigo       VARCHAR(20)  UNIQUE NOT NULL,
            fecha_inicio DATE         NOT NULL,
            fecha_fin    DATE         NOT NULL,
            activo       BOOLEAN      DEFAULT false,
            created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )""")

        self._exec("""
        CREATE TABLE public.materias (
            id         SERIAL PRIMARY KEY,
            nombre     VARCHAR(150) NOT NULL,
            codigo     VARCHAR(20)  UNIQUE NOT NULL,
            creditos   INTEGER      NOT NULL,
            semestre   INTEGER      NOT NULL,
            carrera_id INTEGER      REFERENCES public.carreras(id) ON DELETE CASCADE,
            descripcion TEXT,
            created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        )""")

        self._exec("""
        CREATE TABLE public.prerequisitos (
            id             SERIAL PRIMARY KEY,
            materia_id     INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
            prerequisito_id INTEGER REFERENCES public.materias(id) ON DELETE CASCADE,
            UNIQUE(materia_id, prerequisito_id)
        )""")

        self._exec("""
        CREATE TABLE public.secciones (
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
        )""")

        self._exec("""
        CREATE TABLE public.pagos (
            id           SERIAL PRIMARY KEY,
            estudiante_id INTEGER REFERENCES public.usuarios(id) ON DELETE CASCADE,
            monto        DECIMAL(10,2) NOT NULL,
            fecha_pago   DATE          NOT NULL,
            metodo_pago  VARCHAR(50),
            estado       VARCHAR(20)   DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','completado','cancelado')),
            referencia   VARCHAR(100),
            concepto     TEXT,
            periodo_id   INTEGER REFERENCES public.periodos_lectivos(id) ON DELETE SET NULL,
            created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
        )""")

        self._exec("""
        CREATE TABLE public.inscripciones (
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
        )""")

        # FIX 🚨1: tabla historial_notas (requerida por academico.py y director_router.py)
        self._exec("""
        CREATE TABLE public.historial_notas (
            id                  SERIAL PRIMARY KEY,
            inscripcion_id      INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
            estudiante_nombre   VARCHAR(200),
            nota_anterior       DECIMAL(5,2),
            nota_nueva          DECIMAL(5,2),
            modificado_por      VARCHAR(100),
            motivo              TEXT,
            fecha_modificacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")

        self._exec("""
        CREATE TABLE public.evaluaciones_parciales (
            id              SERIAL PRIMARY KEY,
            inscripcion_id  INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
            tipo_evaluacion VARCHAR(50)   NOT NULL,
            nota            DECIMAL(5,2),
            fecha_evaluacion DATE,
            peso_porcentual DECIMAL(5,2),
            created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(inscripcion_id, tipo_evaluacion)
        )""")

        # FIX 🚨2: columna observaciones añadida
        self._exec("""
        CREATE TABLE public.asistencias (
            id             SERIAL PRIMARY KEY,
            inscripcion_id INTEGER REFERENCES public.inscripciones(id) ON DELETE CASCADE,
            fecha          DATE         NOT NULL,
            estado         VARCHAR(20)  NOT NULL
                CHECK (estado IN ('presente','ausente','tardanza','justificado')),
            observaciones  TEXT,
            created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(inscripcion_id, fecha)
        )""")

        self._exec("""
        CREATE TABLE public.audit_logs (
            id              SERIAL PRIMARY KEY,
            usuario_id      INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
            accion          VARCHAR(100) NOT NULL,
            tabla_afectada  VARCHAR(50),
            detalles        JSONB,
            ip_address      VARCHAR(45),
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")

        # FIX 🚨3: configuracion_ia usa actualizado_en (no updated_at), sin tipo ni created_at
        self._exec("""
        CREATE TABLE public.configuracion_ia (
            id             SERIAL PRIMARY KEY,
            clave          VARCHAR(100) UNIQUE NOT NULL,
            valor          TEXT,
            descripcion    TEXT,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")

        # Token revocation table (required by jwt_handler middleware)
        self._exec("""
        CREATE TABLE public.revoked_tokens (
            jti        VARCHAR(255) PRIMARY KEY,
            revoked_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
        )""")

        # Índices base (relaciones FK)
        indices_base = [
            "CREATE INDEX ON public.materias(carrera_id)",
            "CREATE INDEX ON public.secciones(materia_id)",
            "CREATE INDEX ON public.secciones(periodo_id)",
            "CREATE INDEX ON public.secciones(docente_id)",
            "CREATE INDEX ON public.inscripciones(estudiante_id)",
            "CREATE INDEX ON public.inscripciones(seccion_id)",
            "CREATE INDEX ON public.inscripciones(pago_id)",
            "CREATE INDEX ON public.evaluaciones_parciales(inscripcion_id)",
            "CREATE INDEX ON public.asistencias(inscripcion_id)",
            "CREATE INDEX ON public.pagos(estudiante_id)",
            "CREATE INDEX ON public.pagos(periodo_id)",
            "CREATE INDEX ON public.pagos(estado)",
            "CREATE INDEX ON public.pagos(fecha_pago)",
            "CREATE INDEX ON public.audit_logs(usuario_id)",
            "CREATE INDEX ON public.historial_notas(inscripcion_id)",
        ]
        # Índices de performance críticos para dashboards y mora
        indices_perf = [
            "CREATE INDEX ON public.usuarios(rol)",
            "CREATE INDEX ON public.usuarios(carrera_id)",
            "CREATE INDEX ON public.usuarios(rol, es_becado)",
            "CREATE INDEX ON public.inscripciones(estudiante_id) WHERE pago_id IS NULL",
            "CREATE INDEX ON public.inscripciones(pago_id, estudiante_id)",
        ]
        for idx in indices_base + indices_perf:
            self._exec(idx)

        self._commit()
        log.info("   Schema creado (13 tablas + indices de performance)")

    # ─── PASO 2 ───────────────────────────────────────────────────────────────

    def seed_configuracion_ia(self):
        log.info("━━━ [2/18] Configuración IA...")
        rows = [
            ("institucion_nombre",      "InfoCampus Centro Universitario",     "Nombre institucional"),
            ("institucion_rector",       "Dr. Alejandro Martínez Ruiz",         "Rector actual"),
            ("institucion_mision",
             "Formar profesionales íntegros, competentes e innovadores comprometidos con el desarrollo sostenible.",
             "Misión institucional"),
            ("reglas_nota_minima",       "7.0",   "Nota mínima de aprobación"),
            ("reglas_asistencia_minima", "75",    "% mínimo de asistencia"),
            ("financiero_interes_mora",  "2.5",   "Interés mensual por mora (%)"),
            ("info_fundacion",           "2005-09-01", "Fecha de fundación"),
            ("info_telefono",            "+34 91 234 56 78", "Teléfono"),
            ("info_email_contacto",      "info@infocampus.edu.es", "Email de contacto"),
            ("info_direccion",
             "Calle Universidad 45, 28040 Madrid, España", "Dirección"),
        ]
        # Insertar sin tipo ni created_at (columnas eliminadas del schema)
        self._batch(
            """INSERT INTO public.configuracion_ia (clave, valor, descripcion) VALUES %s
               ON CONFLICT (clave) DO UPDATE SET valor=EXCLUDED.valor""",
            rows,
        )
        self._commit()
        log.info(f"   {len(rows)} configuraciones (schema actualizado: actualizado_en)")

    # ─── PASO 3 ───────────────────────────────────────────────────────────────

    def seed_carreras(self):
        log.info("━━━ [3/18] Carreras...")
        for i, c in enumerate(CARRERAS, 1):
            self._exec("""
                INSERT INTO public.carreras
                (nombre,codigo,duracion_semestres,creditos_totales,precio_credito,dias_gracia_pago,descripcion)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (
                c["nombre"], f"CAR{i:03d}",
                max(c["creditos"] // 30, 4),
                c["creditos"], c["precio_credito"], c["dias_gracia"],
                f"Grado en {c['nombre']}",
            ))
            cid = self.cur.fetchone()["id"]
            self.carreras_map[c["nombre"]] = {
                "id": cid,
                "precio_credito": c["precio_credito"],
                "dias_gracia": c["dias_gracia"],
            }
        self._commit()
        log.info(f"   {len(self.carreras_map)} carreras")

    # ─── PASO 4 ───────────────────────────────────────────────────────────────

    def seed_periodos(self):
        """6 períodos históricos (2023-2025) + 1 activo 2026-1."""
        log.info("━━━ [4/18] Períodos lectivos (6 históricos + 1 activo)...")
        # Reducido: 2023-2025 en vez de 2021-2025 → 6 períodos históricos
        for año in range(2023, 2026):
            for sem, (mi, di, mf, df) in enumerate([(2,0,6,30), (9,1,1,28)], 1):
                fi = date(año, mi, 1)
                ff = date(año + di, mf, df)
                cod = f"{año}-{sem}"
                self._exec("""
                    INSERT INTO public.periodos_lectivos (nombre,codigo,fecha_inicio,fecha_fin,activo)
                    VALUES (%s,%s,%s,%s,false) RETURNING id
                """, (f"Período {cod}", cod, fi, ff))
                pid = self.cur.fetchone()["id"]
                self.periodos.append({"id": pid, "codigo": cod, "activo": False,
                                      "fecha_inicio": fi, "fecha_fin": ff})

        fi_act = date(2026, 2, 1)
        ff_act = date(2026, 6, 30)
        self._exec("""
            INSERT INTO public.periodos_lectivos (nombre,codigo,fecha_inicio,fecha_fin,activo)
            VALUES ('Período 2026-1','2026-1',%s,%s,true) RETURNING id
        """, (fi_act, ff_act))
        pid_act = self.cur.fetchone()["id"]
        self.periodo_activo = {"id": pid_act, "codigo": "2026-1", "activo": True,
                               "fecha_inicio": fi_act, "fecha_fin": ff_act}
        self.periodos.append(self.periodo_activo)
        self._commit()
        historicos = len([p for p in self.periodos if not p["activo"]])
        log.info(f"   {historicos} históricos + 1 activo 2026-1")

    # ─── PASO 5 ───────────────────────────────────────────────────────────────

    def seed_admins(self):
        log.info("━━━ [5/18] Usuarios demo (director, coordinador, tesorero, profesor, estudiante)...")

        admins = [
            ("director",       "director@infocampus.edu.es",       "Alejandro", "Martínez Ruiz",   "director",
             "Dr. en Administración Educativa", None),
            ("coordinador",    "coordinador@infocampus.edu.es",    "Carmen",    "López Fernández", "coordinador",
             "Máster en Gestión Académica", None),
            ("tesorero",       "tesorero@infocampus.edu.es",       "Miguel",    "García Sánchez",  "tesorero",
             "Economista Colegiado", None),
            ("secretaria",     "secretaria@infocampus.edu.es",     "Lucía",     "Ramírez Mora",    "administrativo",
             "Licenciada en Administración", None),
        ]

        admins.append((
            "profesor",
            "profesor@infocampus.edu.es",
            "Elena", "Vázquez Torres",
            "profesor",
            "Dra. en Ingeniería Informática",
            None,
        ))

        carrera_demo = list(self.carreras_map.keys())[0]
        admins.append((
            "estudiante",
            "estudiante@infocampus.edu.es",
            "Diego", "Herrera Molina",
            "estudiante",
            None,
            carrera_demo,
        ))

        for username, email, fn, ln, rol, titulo, carrera_nom in admins:
            carrera_id = self.carreras_map[carrera_nom]["id"] if carrera_nom else None
            semestre   = 3 if rol == "estudiante" else None

            self._exec("""
                INSERT INTO public.usuarios
                (username,password_hash,email,first_name,last_name,cedula,rol,activo,
                 titulo_academico,carrera_id,semestre_actual)
                VALUES (%s,%s,%s,%s,%s,%s,%s,true,%s,%s,%s) RETURNING id
            """, (username, self._pwd_hash, email, fn, ln, dni_es(),
                  rol, titulo, carrera_id, semestre))
            uid = self.cur.fetchone()["id"]

            self.creds_admins.append({
                "rol": rol.upper(), "username": username, "email": email,
                "nombre": f"{fn} {ln}",
            })

            if rol == "profesor":
                self.profesores.append({
                    "id": uid, "username": username,
                    "email": email, "nombre": f"{fn} {ln}",
                    "titulo": titulo,
                })

            if rol == "estudiante":
                self.estudiantes.append({
                    "id": uid, "carrera_nom": carrera_nom,
                    "carrera_id": carrera_id, "semestre": 3,
                    "username": username, "nombre": f"{fn} {ln}",
                    "email": email, "es_becado": False,
                    "beca_tipo": None, "beca_pct": 0, "convenio": False,
                })
                self.creds_estus.append({
                    "carrera": carrera_nom, "nombre": f"{fn} {ln}",
                    "username": username, "email": email, "beca": "Sin beca",
                })

        self._commit()
        log.info(f"   {len(admins)} usuarios demo")
        for _, email, _, _, rol, *_ in admins:
            log.info(f"      {rol:<14} {email}")

    # ─── PASO 6 ───────────────────────────────────────────────────────────────

    def seed_profesores(self):
        """30 profesores (reducido de 50 para portafolio)."""
        log.info("━━━ [6/18] Profesores (30)...")
        usados: set[str] = {p["username"] for p in self.profesores}
        carreras_lista = list(self.carreras_map.keys())

        for i in range(30):
            carrera_nom = carreras_lista[i % len(carreras_lista)]
            fn  = fake.first_name()
            ln  = fake.last_name()
            base = slugify(f"{fn}.{ln.split()[0]}")
            uname = base
            cnt = 1
            while uname in usados:
                uname = f"{base}{cnt}"; cnt += 1
            usados.add(uname)

            titulo = random.choice(TITULOS.get(carrera_nom, ["Máster Universitario"]))
            self._exec("""
                INSERT INTO public.usuarios
                (username,password_hash,email,first_name,last_name,cedula,telefono,
                 rol,activo,titulo_academico,especialidad,años_experiencia)
                VALUES (%s,%s,%s,%s,%s,%s,%s,'profesor',true,%s,%s,%s) RETURNING id
            """, (
                uname, self._pwd_hash, f"{uname}@infocampus.edu.es",
                fn, ln, dni_es(), fake.phone_number(),
                titulo, carrera_nom, random.randint(3, 25),
            ))
            pid = self.cur.fetchone()["id"]
            self.profesores.append({"id": pid, "username": uname,
                                    "email": f"{uname}@infocampus.edu.es",
                                    "nombre": f"{fn} {ln}", "titulo": titulo})
            self.creds_profs.append({"username": uname, "nombre": f"{fn} {ln}",
                                     "email": f"{uname}@infocampus.edu.es"})
        self._commit()
        log.info(f"   {len(self.profesores)} profesores (incluye demo)")

    # ─── PASO 7 ───────────────────────────────────────────────────────────────

    def seed_materias(self):
        log.info("━━━ [7/18] Materias...")
        cnt = 1
        for carrera_nom, mats in MALLA.items():
            cid = self.carreras_map[carrera_nom]["id"]
            for m in mats:
                codigo = f"MAT{cnt:04d}"
                self._exec("""
                    INSERT INTO public.materias (nombre,codigo,creditos,semestre,carrera_id,descripcion)
                    VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                """, (m["n"], codigo, m["c"], m["s"], cid,
                      f"{m['n']} — {carrera_nom}, sem. {m['s']}"))
                mid = self.cur.fetchone()["id"]
                self.materias_map[f"{carrera_nom}|{m['n']}"] = mid
                cnt += 1
        self._commit()
        log.info(f"   {cnt-1} materias")

    # ─── PASO 8 ───────────────────────────────────────────────────────────────

    def seed_prerequisitos(self):
        log.info("━━━ [8/18] Prerequisitos...")
        rows = []
        for carrera_nom, mats in MALLA.items():
            for m in mats:
                if m["pre"]:
                    k_mat = f"{carrera_nom}|{m['n']}"
                    k_pre = f"{carrera_nom}|{m['pre']}"
                    if k_mat in self.materias_map and k_pre in self.materias_map:
                        rows.append((self.materias_map[k_mat], self.materias_map[k_pre]))
        if rows:
            self._batch(
                "INSERT INTO public.prerequisitos (materia_id,prerequisito_id) VALUES %s ON CONFLICT DO NOTHING",
                rows,
            )
        self._commit()
        log.info(f"   {len(rows)} prerequisitos")

    # ─── PASO 9 ───────────────────────────────────────────────────────────────

    def seed_estudiantes(self):
        """200 estudiantes (reducido de 500 para portafolio)."""
        log.info("━━━ [9/18] Estudiantes (~200)...")
        usados: set[str] = {e["username"] for e in self.estudiantes}
        cnt = 1
        por_carrera = 200 // len(self.carreras_map)

        for carrera_nom, cdata in self.carreras_map.items():
            cid   = cdata["id"]
            n_est = por_carrera + random.randint(-2, 2)

            for _ in range(n_est):
                fn  = fake.first_name()
                ln  = fake.last_name()
                sem = random.randint(1, 8)
                promedio = round(random.uniform(6.0, 9.5), 2) if sem > 1 else 0.0
                creditos_aprob = (sem - 1) * 15 if sem > 1 else 0

                base = slugify(f"{fn}.{ln.split()[0]}")
                uname = f"{base}{cnt}"
                while uname in usados:
                    cnt += 1; uname = f"{base}{cnt}"
                usados.add(uname)

                tiene_beca = random.random() < 0.28
                beca = random.choice(BECAS) if tiene_beca else None

                tiene_conv = random.random() < 0.05
                f_conv = date.today() + timedelta(days=random.randint(30, 365)) if tiene_conv else None

                self._exec("""
                    INSERT INTO public.usuarios
                    (username,password_hash,email,first_name,last_name,cedula,telefono,
                     direccion,fecha_nacimiento,genero,rol,activo,carrera_id,
                     semestre_actual,promedio_acumulado,creditos_aprobados,
                     es_becado,porcentaje_beca,tipo_beca,convenio_activo,fecha_limite_convenio)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'estudiante',true,%s,
                            %s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """, (
                    uname, self._pwd_hash,
                    f"{uname}@alumnos.infocampus.edu.es",
                    fn, ln, dni_es(), fake.phone_number(),
                    fake.address(),
                    fake.date_of_birth(minimum_age=18, maximum_age=32),
                    random.choice(["M", "F"]),
                    cid, sem, promedio, creditos_aprob,
                    tiene_beca,
                    beca[1] if beca else 0,
                    beca[0] if beca else None,
                    tiene_conv, f_conv,
                ))
                eid = self.cur.fetchone()["id"]
                self.estudiantes.append({
                    "id": eid, "carrera_nom": carrera_nom, "carrera_id": cid,
                    "semestre": sem, "username": uname,
                    "nombre": f"{fn} {ln}",
                    "email": f"{uname}@alumnos.infocampus.edu.es",
                    "es_becado": tiene_beca,
                    "beca_tipo": beca[0] if beca else None,
                    "beca_pct":  beca[1] if beca else 0,
                    "convenio":  tiene_conv,
                })
                self.creds_estus.append({
                    "carrera": carrera_nom, "nombre": f"{fn} {ln}",
                    "username": uname, "email": f"{uname}@alumnos.infocampus.edu.es",
                    "beca": f"{beca[0]} {beca[1]}%" if beca else "Sin beca",
                })
                cnt += 1

        self._commit()
        log.info(f"   {len(self.estudiantes)} estudiantes")

    # ─── PASO 10 ──────────────────────────────────────────────────────────────

    def seed_secciones(self):
        log.info("━━━ [10/18] Secciones...")
        historicos_recientes = [p for p in self.periodos if not p["activo"]][-6:]

        def _horario():
            return json.dumps({
                "dias": random.choice(DIAS_SEMANA),
                "hora_inicio": f"{random.randint(8,16):02d}:00",
                "hora_fin":    f"{random.randint(9,18):02d}:00",
            })

        for periodo in historicos_recientes:
            for key, mid in self.materias_map.items():
                if random.random() < 0.60:
                    docente = random.choice(self.profesores)["id"]
                    cupo    = random.randint(25, 40)
                    self._exec("""
                        INSERT INTO public.secciones
                        (materia_id,periodo_id,docente_id,codigo,cupo_maximo,cupo_actual,aula,horario)
                        VALUES (%s,%s,%s,'SEC-A',%s,0,%s,%s) RETURNING id
                    """, (mid, periodo["id"], docente, cupo,
                          f"Aula {random.randint(101,420)}", _horario()))
                    sid = self.cur.fetchone()["id"]
                    self.secciones.append({
                        "id": sid, "materia_id": mid,
                        "periodo_id": periodo["id"], "activo": False,
                        "cupo_max": cupo, "cupo_actual": 0,
                        "fecha_inicio": periodo["fecha_inicio"],
                        "fecha_fin":    periodo["fecha_fin"],
                    })

        for key, mid in self.materias_map.items():
            docente = random.choice(self.profesores)["id"]
            cupo    = random.randint(25, 35)
            self._exec("""
                INSERT INTO public.secciones
                (materia_id,periodo_id,docente_id,codigo,cupo_maximo,cupo_actual,aula,horario)
                VALUES (%s,%s,%s,'SEC-A',%s,0,%s,%s) RETURNING id
            """, (mid, self.periodo_activo["id"], docente, cupo,
                  f"Aula {random.randint(101,420)}", _horario()))
            sid = self.cur.fetchone()["id"]
            sec = {
                "id": sid, "materia_id": mid,
                "periodo_id": self.periodo_activo["id"], "activo": True,
                "cupo_max": cupo, "cupo_actual": 0,
                "fecha_inicio": self.periodo_activo["fecha_inicio"],
                "fecha_fin":    self.periodo_activo["fecha_fin"],
            }
            self.secciones.append(sec)
            self.seccion_activa_por_materia[mid] = sec

        self._commit()
        activas = len(self.seccion_activa_por_materia)
        log.info(f"   {len(self.secciones)} secciones ({activas} activas)")

    def _build_prereq_map(self, carrera: str) -> dict[str, str | None]:
        return {m["n"]: m["pre"] for m in MALLA.get(carrera, [])}

    # ─── PASO 11 ──────────────────────────────────────────────────────────────

    def seed_inscripciones_historicas(self):
        log.info("━━━ [11/18] Inscripciones & pagos históricos...")
        hist_sec_por_periodo_materia: dict[tuple[int, int], dict] = {}
        for s in self.secciones:
            if not s["activo"]:
                key = (s["periodo_id"], s["materia_id"])
                hist_sec_por_periodo_materia[key] = s

        periodos_hist = sorted(
            [p for p in self.periodos if not p["activo"]],
            key=lambda p: p["fecha_inicio"],
        )

        pagos_count = 0
        insc_count  = 0
        pares_usados: set[tuple] = set()

        for est in tqdm(self.estudiantes, desc="   Inscripciones históricas", unit="est"):
            eid        = est["id"]
            carrera    = est["carrera_nom"]
            precio_cr  = self.carreras_map[carrera]["precio_credito"]
            sem_actual = est["semestre"]
            malla_car  = MALLA.get(carrera, [])
            prereq_map = self._build_prereq_map(carrera)

            resultados: dict[str, bool] = {}
            n_periodos = min(sem_actual - 1, len(periodos_hist))
            if n_periodos <= 0:
                continue
            periodos_sel = periodos_hist[-n_periodos:]

            for periodo in periodos_sel:
                pid = periodo["id"]
                fecha_inicio_p = periodo["fecha_inicio"]
                fecha_fin_p    = periodo["fecha_fin"]

                candidatas = []
                for mat in malla_car:
                    nombre = mat["n"]
                    prereq = mat["pre"]
                    mid    = self.materias_map.get(f"{carrera}|{nombre}")
                    if not mid:
                        continue
                    if prereq is not None:
                        if not resultados.get(prereq, False):
                            continue
                    if resultados.get(nombre) is True:
                        continue
                    sec = hist_sec_por_periodo_materia.get((pid, mid))
                    if not sec:
                        continue
                    candidatas.append((nombre, mid, sec))

                random.shuffle(candidatas)
                for nombre, mid, sec in candidatas[:random.randint(2, 5)]:
                    if sec["cupo_actual"] >= sec["cupo_max"]:
                        continue
                    par = (eid, sec["id"])
                    if par in pares_usados:
                        continue
                    pares_usados.add(par)

                    self._exec("SELECT creditos FROM public.materias WHERE id=%s", (mid,))
                    row = self.cur.fetchone()
                    if not row:
                        continue
                    creditos = row["creditos"]
                    monto    = precio_cr * creditos
                    fecha_pago = fecha_inicio_p + timedelta(days=random.randint(0, 20))
                    est_pago   = "completado" if random.random() < 0.85 else "pendiente"

                    self._exec("""
                        INSERT INTO public.pagos
                        (estudiante_id,monto,fecha_pago,metodo_pago,estado,referencia,concepto,periodo_id)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                    """, (eid, monto, fecha_pago, random.choice(METODOS_PAGO),
                          est_pago, f"PAY-{random.randint(100000,999999)}",
                          f"Matrícula {creditos} créditos", pid))
                    pago_id = self.cur.fetchone()["id"]
                    pagos_count += 1

                    aprobado    = random.random() < 0.72
                    estado_insc = "aprobado" if aprobado else "reprobado"
                    nota_final  = nota_aprobada() if aprobado else nota_reprobada()

                    if aprobado or nombre not in resultados:
                        resultados[nombre] = aprobado

                    self._exec("""
                        INSERT INTO public.inscripciones
                        (estudiante_id,seccion_id,pago_id,fecha_inscripcion,estado,nota_final)
                        VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                    """, (eid, sec["id"], pago_id, fecha_pago, estado_insc, nota_final))
                    iid = self.cur.fetchone()["id"]

                    self.inscripciones_historicas.append({
                        "id": iid, "estudiante_id": eid, "seccion_id": sec["id"],
                        "periodo_id": pid, "materia_nombre": nombre,
                        "estado": estado_insc, "fecha_inicio": fecha_inicio_p,
                        "fecha_fin": fecha_fin_p,
                        "estudiante_nombre": est["nombre"],
                        "nota_final": nota_final,
                    })
                    insc_count += 1
                    sec["cupo_actual"] += 1
                    self._exec("UPDATE public.secciones SET cupo_actual=cupo_actual+1 WHERE id=%s", (sec["id"],))

        self._commit()
        log.info(f"   {pagos_count} pagos históricos | {insc_count} inscripciones")

    # ─── PASO 12 ──────────────────────────────────────────────────────────────

    def seed_inscripciones_activas(self):
        log.info("━━━ [12/18] Inscripciones período activo 2026-1 (mora ~18 %)...")
        pares_usados: set[tuple] = set()
        mora_count  = 0
        insc_count  = 0

        secs_por_carrera: dict[str, list[dict]] = {}
        for carrera_nom in self.carreras_map:
            secs_por_carrera[carrera_nom] = []
            for m in MALLA.get(carrera_nom, []):
                mid = self.materias_map.get(f"{carrera_nom}|{m['n']}")
                if mid and mid in self.seccion_activa_por_materia:
                    secs_por_carrera[carrera_nom].append(self.seccion_activa_por_materia[mid])

        for est in tqdm(self.estudiantes, desc="   Inscripciones activas", unit="est"):
            eid       = est["id"]
            carrera   = est["carrera_nom"]
            precio_cr = self.carreras_map[carrera]["precio_credito"]
            es_moroso = random.random() < 0.18

            secs = list(secs_por_carrera.get(carrera, []))
            random.shuffle(secs)

            for sec in secs[:random.randint(3, 5)]:
                if sec["cupo_actual"] >= sec["cupo_max"]:
                    continue
                par = (eid, sec["id"])
                if par in pares_usados:
                    continue
                pares_usados.add(par)

                self._exec("SELECT creditos FROM public.materias WHERE id=%s", (sec["materia_id"],))
                row = self.cur.fetchone()
                if not row:
                    continue
                creditos = row["creditos"]
                monto    = precio_cr * creditos
                fi = self.periodo_activo["fecha_inicio"]
                fecha_insc = fi + timedelta(days=random.randint(0, 15))

                if es_moroso:
                    pago_id = None
                    mora_count += 1
                else:
                    estado_pago = "completado" if random.random() < 0.80 else "pendiente"
                    self._exec("""
                        INSERT INTO public.pagos
                        (estudiante_id,monto,fecha_pago,metodo_pago,estado,referencia,concepto,periodo_id)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                    """, (eid, monto, fecha_insc, random.choice(METODOS_PAGO),
                          estado_pago, f"PAY-{random.randint(100000,999999)}",
                          f"Matrícula 2026-1 — {creditos} créditos",
                          self.periodo_activo["id"]))
                    pago_id = self.cur.fetchone()["id"]

                self._exec("""
                    INSERT INTO public.inscripciones
                    (estudiante_id,seccion_id,pago_id,fecha_inscripcion,estado,nota_final)
                    VALUES (%s,%s,%s,%s,'activo',NULL) RETURNING id
                """, (eid, sec["id"], pago_id, fecha_insc))
                iid = self.cur.fetchone()["id"]
                self.inscripciones_activas.append({
                    "id": iid, "estudiante_id": eid, "seccion_id": sec["id"],
                    "periodo_id": self.periodo_activo["id"],
                    "fecha_inicio": self.periodo_activo["fecha_inicio"],
                    "fecha_fin":    self.periodo_activo["fecha_fin"],
                })
                insc_count += 1
                sec["cupo_actual"] += 1
                self._exec("UPDATE public.secciones SET cupo_actual=cupo_actual+1 WHERE id=%s", (sec["id"],))

        self._commit()
        log.info(f"   {insc_count} inscripciones activas | {mora_count} en mora (sin pago)")
        self._seed_mora_scenarios()

    def _seed_mora_scenarios(self):
        log.info("   ── Sembrando escenarios QA de mora...")
        hoy = date.today()

        # CASO A: convenio vigente → NO mora
        uname_a = "qa.convenio.vigente"
        self._exec("""
            INSERT INTO public.usuarios
            (username,password_hash,email,first_name,last_name,cedula,rol,activo,
             carrera_id,semestre_actual,promedio_acumulado,creditos_aprobados,
             es_becado,porcentaje_beca,convenio_activo,fecha_limite_convenio)
            VALUES (%s,%s,%s,'QA','Convenio Vigente',%s,'estudiante',true,
                    %s,2,7.50,15, false,0, true,%s) RETURNING id
        """, (
            uname_a, self._pwd_hash, f"{uname_a}@alumnos.infocampus.edu.es",
            dni_es(),
            list(self.carreras_map.values())[0]["id"],
            hoy + timedelta(days=180),
        ))
        eid_a = self.cur.fetchone()["id"]
        secs_activas = list(self.seccion_activa_por_materia.values())
        if secs_activas:
            sec_a = secs_activas[0]
            self._exec("""
                INSERT INTO public.inscripciones
                (estudiante_id,seccion_id,pago_id,fecha_inscripcion,estado,nota_final)
                VALUES (%s,%s,NULL,%s,'activo',NULL)
            """, (eid_a, sec_a["id"], hoy - timedelta(days=5)))
        self.estudiantes.append({
            "id": eid_a, "carrera_nom": list(self.carreras_map.keys())[0],
            "carrera_id": list(self.carreras_map.values())[0]["id"],
            "semestre": 2, "username": uname_a, "nombre": "QA Convenio Vigente",
            "email": f"{uname_a}@alumnos.infocampus.edu.es",
            "es_becado": False, "beca_tipo": None, "beca_pct": 0, "convenio": True,
        })

        # CASO B: pago pendiente dentro de gracia → NO mora
        carrera_b = list(self.carreras_map.keys())[1]
        cdata_b   = self.carreras_map[carrera_b]
        uname_b   = "qa.gracia.activa"
        self._exec("""
            INSERT INTO public.usuarios
            (username,password_hash,email,first_name,last_name,cedula,rol,activo,
             carrera_id,semestre_actual,promedio_acumulado,creditos_aprobados,
             es_becado,porcentaje_beca,convenio_activo,fecha_limite_convenio)
            VALUES (%s,%s,%s,'QA','Gracia Activa',%s,'estudiante',true,
                    %s,1,0.00,0, false,0, false,NULL) RETURNING id
        """, (uname_b, self._pwd_hash, f"{uname_b}@alumnos.infocampus.edu.es",
              dni_es(), cdata_b["id"]))
        eid_b = self.cur.fetchone()["id"]
        secs_b = list(self.seccion_activa_por_materia.values())
        if secs_b:
            sec_b  = secs_b[min(1, len(secs_b)-1)]
            self._exec("SELECT creditos FROM public.materias WHERE id=%s", (sec_b["materia_id"],))
            row_b  = self.cur.fetchone()
            monto_b = cdata_b["precio_credito"] * (row_b["creditos"] if row_b else 3)
            self._exec("""
                INSERT INTO public.pagos
                (estudiante_id,monto,fecha_pago,metodo_pago,estado,referencia,concepto,periodo_id)
                VALUES (%s,%s,%s,'transferencia','pendiente',%s,'QA pago pendiente gracia',%s) RETURNING id
            """, (eid_b, monto_b, hoy, f"QA-B-{random.randint(10000,99999)}",
                  self.periodo_activo["id"]))
            pago_b_id = self.cur.fetchone()["id"]
            self._exec("""
                INSERT INTO public.inscripciones
                (estudiante_id,seccion_id,pago_id,fecha_inscripcion,estado,nota_final)
                VALUES (%s,%s,%s,%s,'activo',NULL)
            """, (eid_b, sec_b["id"], pago_b_id, hoy))
        self.estudiantes.append({
            "id": eid_b, "carrera_nom": carrera_b, "carrera_id": cdata_b["id"],
            "semestre": 1, "username": uname_b, "nombre": "QA Gracia Activa",
            "email": f"{uname_b}@alumnos.infocampus.edu.es",
            "es_becado": False, "beca_tipo": None, "beca_pct": 0, "convenio": False,
        })

        # CASO C: período anterior sin pago → SÍ mora
        carrera_c = list(self.carreras_map.keys())[2]
        cdata_c   = self.carreras_map[carrera_c]
        uname_c   = "qa.mora.real"
        self._exec("""
            INSERT INTO public.usuarios
            (username,password_hash,email,first_name,last_name,cedula,rol,activo,
             carrera_id,semestre_actual,promedio_acumulado,creditos_aprobados,
             es_becado,porcentaje_beca,convenio_activo,fecha_limite_convenio)
            VALUES (%s,%s,%s,'QA','Mora Real',%s,'estudiante',true,
                    %s,3,6.50,30, false,0, false,NULL) RETURNING id
        """, (uname_c, self._pwd_hash, f"{uname_c}@alumnos.infocampus.edu.es",
              dni_es(), cdata_c["id"]))
        eid_c = self.cur.fetchone()["id"]
        periodo_cerrado = sorted(
            [p for p in self.periodos if not p["activo"]],
            key=lambda p: p["fecha_fin"]
        )[-1]
        secs_cerradas = [s for s in self.secciones
                         if s["periodo_id"] == periodo_cerrado["id"] and not s["activo"]]
        if secs_cerradas:
            sec_c = random.choice(secs_cerradas)
            self._exec("""
                INSERT INTO public.inscripciones
                (estudiante_id,seccion_id,pago_id,fecha_inscripcion,estado,nota_final)
                VALUES (%s,%s,NULL,%s,'reprobado',4.5)
            """, (eid_c, sec_c["id"],
                  periodo_cerrado["fecha_inicio"] + timedelta(days=5)))
        self.estudiantes.append({
            "id": eid_c, "carrera_nom": carrera_c, "carrera_id": cdata_c["id"],
            "semestre": 3, "username": uname_c, "nombre": "QA Mora Real",
            "email": f"{uname_c}@alumnos.infocampus.edu.es",
            "es_becado": False, "beca_tipo": None, "beca_pct": 0, "convenio": False,
        })

        self._commit()
        log.info("   Casos QA: A(convenio→no mora) | B(gracia→no mora) | C(período cerrado→SÍ mora)")

    # ─── PASO 13 ──────────────────────────────────────────────────────────────

    def seed_evaluaciones_parciales(self):
        log.info("━━━ [13/18] Evaluaciones parciales (batch)...")
        rows: list[tuple] = []
        for insc in tqdm(self.inscripciones_historicas, desc="   Evaluaciones", unit="insc"):
            if insc["estado"] not in ("aprobado", "reprobado"):
                continue
            aprobado = insc["estado"] == "aprobado"
            dur = max((insc["fecha_fin"] - insc["fecha_inicio"]).days, 30)
            for tipo, peso in TIPOS_EVALUACION:
                nota   = nota_aprobada() if aprobado else nota_reprobada()
                offset = random.randint(20, dur - 10)
                fecha  = insc["fecha_inicio"] + timedelta(days=offset)
                rows.append((insc["id"], tipo, nota, fecha, peso))
        self._batch(
            """INSERT INTO public.evaluaciones_parciales
               (inscripcion_id,tipo_evaluacion,nota,fecha_evaluacion,peso_porcentual)
               VALUES %s""",
            rows,
        )
        self._commit()
        log.info(f"   {len(rows)} evaluaciones parciales")

    # ─── PASO 14 ──────────────────────────────────────────────────────────────

    def seed_asistencias(self):
        """Asistencias con observaciones (~15% de tardanza/justificado).
        Volumen reducido: ≤15 por inscripción histórica (antes ≤25),
        ≤10 fechas activas (antes ≤20).
        """
        log.info("━━━ [14/18] Asistencias (con observaciones)...")
        rows: list[tuple] = []

        muestra = random.sample(
            self.inscripciones_historicas,
            min(1500, len(self.inscripciones_historicas)),
        )
        for insc in tqdm(muestra, desc="   Asist. históricas", unit="insc"):
            cur_date = insc["fecha_inicio"]
            registros = 0
            while cur_date <= insc["fecha_fin"] and registros < 15:  # reducido 25→15
                if cur_date.weekday() < 5:
                    estado = estado_asistencia()
                    obs = None
                    if estado in ("tardanza", "justificado") and random.random() < 0.15:
                        obs = random.choice(OBSERVACIONES_ASISTENCIA)
                    rows.append((insc["id"], cur_date, estado, obs))
                    registros += 1
                cur_date += timedelta(days=random.randint(1, 3))

        hoy = date.today()
        fechas_activo: list[date] = []
        d = self.periodo_activo["fecha_inicio"]
        while d <= hoy and len(fechas_activo) < 10:  # reducido 20→10
            if d.weekday() < 5:
                fechas_activo.append(d)
            d += timedelta(days=1)

        if not fechas_activo:
            for offset in range(1, 11):
                d = self.periodo_activo["fecha_inicio"] - timedelta(days=offset)
                if d.weekday() < 5:
                    fechas_activo.append(d)
                if len(fechas_activo) >= 8:
                    break

        if fechas_activo:
            for insc in tqdm(self.inscripciones_activas, desc="   Asist. activas", unit="insc"):
                for fecha in fechas_activo:
                    estado = estado_asistencia()
                    obs = None
                    if estado in ("tardanza", "justificado") and random.random() < 0.15:
                        obs = random.choice(OBSERVACIONES_ASISTENCIA)
                    rows.append((insc["id"], fecha, estado, obs))

        chunk = 2000
        total = 0
        for i in range(0, len(rows), chunk):
            try:
                self._batch(
                    """INSERT INTO public.asistencias (inscripcion_id,fecha,estado,observaciones) VALUES %s
                       ON CONFLICT (inscripcion_id,fecha) DO NOTHING""",
                    rows[i:i+chunk],
                )
                total += min(chunk, len(rows) - i)
            except Exception as e:
                self.conn.rollback()
                log.warning(f"   Chunk asistencias con error: {e}")

        self._commit()
        log.info(f"   {total} registros de asistencia ({len(fechas_activo)} fechas activas, observaciones ~15%)")

    # ─── PASO 15 ──────────────────────────────────────────────────────────────

    def seed_historial_notas(self):
        """20 correcciones de notas de ejemplo para el módulo del Director."""
        log.info("━━━ [15/18] Historial de notas (20 correcciones demo)...")
        candidatas = [
            i for i in self.inscripciones_historicas
            if i["estado"] in ("aprobado", "reprobado") and i.get("nota_final") is not None
        ]
        if not candidatas:
            log.warning("   Sin inscripciones históricas disponibles para historial_notas")
            return

        muestra = random.sample(candidatas, min(20, len(candidatas)))
        rows: list[tuple] = []
        for insc in muestra:
            nota_ant = float(insc["nota_final"])
            delta    = round(random.uniform(0.5, 2.0), 2)
            if nota_ant + delta <= 10.0:
                nota_nva = round(nota_ant + delta, 2)
            else:
                nota_nva = round(nota_ant - delta, 2)
            rows.append((
                insc["id"],
                insc.get("estudiante_nombre", "Estudiante Desconocido"),
                nota_ant,
                nota_nva,
                "director@infocampus.edu.es",
                random.choice(MOTIVOS_CORRECCION),
            ))

        self._batch(
            """INSERT INTO public.historial_notas
               (inscripcion_id, estudiante_nombre, nota_anterior, nota_nueva,
                modificado_por, motivo)
               VALUES %s""",
            rows,
        )
        self._commit()
        log.info(f"   {len(rows)} correcciones en historial_notas")

    # ─── PASO 16 ──────────────────────────────────────────────────────────────

    def seed_pagos_recientes(self):
        log.info("━━━ [16/18] Pagos recientes 2025-2026 para KPIs tesorero...")
        hoy = date.today()
        rows: list[tuple] = []
        muestra_est = random.sample(self.estudiantes, min(200, len(self.estudiantes)))

        for est in muestra_est:
            eid       = est["id"]
            precio_cr = self.carreras_map[est["carrera_nom"]]["precio_credito"]
            offset    = random.randint(0, 180)
            fpago     = hoy - timedelta(days=offset)
            monto     = precio_cr * random.randint(3, 6)
            estado    = "pendiente" if random.random() < 0.20 else "completado"
            rows.append((
                eid, round(monto, 2), fpago,
                random.choice(METODOS_PAGO), estado,
                f"PAY-R{random.randint(100000,999999)}",
                "Pago semestre 2025-2026",
                self.periodo_activo["id"],
            ))

        self._batch(
            """INSERT INTO public.pagos
               (estudiante_id,monto,fecha_pago,metodo_pago,estado,referencia,concepto,periodo_id)
               VALUES %s""",
            rows,
        )
        self._commit()
        log.info(f"   {len(rows)} pagos recientes")

    # ─── PASO 17 ──────────────────────────────────────────────────────────────

    def seed_audit_logs(self):
        """200 logs de auditoría (reducido de 500)."""
        log.info("━━━ [17/18] Audit logs (200)...")
        acciones = ["login", "logout", "crear_inscripcion", "modificar_nota",
                    "crear_pago", "consulta_reporte", "crear_usuario"]
        tablas   = ["usuarios", "inscripciones", "pagos", "evaluaciones_parciales"]
        ids_pool = [e["id"] for e in self.estudiantes[:100]] + [p["id"] for p in self.profesores]

        rows = [
            (random.choice(ids_pool), random.choice(acciones), random.choice(tablas),
             json.dumps({"cambio": "registro"}), fake.ipv4())
            for _ in range(200)
        ]
        self._batch(
            "INSERT INTO public.audit_logs (usuario_id,accion,tabla_afectada,detalles,ip_address) VALUES %s",
            rows,
        )
        self._commit()
        log.info("   200 logs de auditoría")

    # ─── PASO 18 ──────────────────────────────────────────────────────────────

    def export_credentials(self):
        log.info("━━━ [18/18] Exportando credenciales...")
        ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = f"credenciales_infocampus_{ts}.txt"

        lines = [
            "=" * 100,
            "INFOCAMPUS ERP — CREDENCIALES DE ACCESO",
            "=" * 100,
            f"Generado : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Contraseña universal: {UNIVERSAL_PASSWORD}",
            "=" * 100,
            "",
            "USUARIOS DEMO (Login.jsx Demo Access Panel)",
            "-" * 60,
            f"  {'ROL':<14} {'EMAIL':<42} {'USERNAME':<20} PASS",
            "-" * 60,
        ]
        for a in self.creds_admins:
            lines.append(f"  {a['rol']:<14} {a['email']:<42} {a['username']:<20} {UNIVERSAL_PASSWORD}")

        lines += ["", "PROFESORES (primeros 15)", "-" * 60]
        for p in self.creds_profs[:15]:
            lines.append(f"  {p['nombre']} | {p['username']} | {p['email']} | {UNIVERSAL_PASSWORD}")

        lines += ["", "ESTUDIANTES (muestra por carrera)", "-" * 60]
        por_carrera: dict[str, list] = {}
        for e in self.creds_estus:
            por_carrera.setdefault(e["carrera"], []).append(e)
        for carrera, lista in sorted(por_carrera.items()):
            lines.append(f"\n  {carrera} ({len(lista)} alumnos)")
            for e in lista[:5]:
                lines.append(f"    {e['nombre']} | {e['username']} | {e['email']} | {e['beca']}")

        lines += [
            "", "=" * 100, "RESUMEN", "=" * 100,
            f"Administrativos/Demo : {len(self.creds_admins)}",
            f"Profesores           : {len(self.creds_profs)}",
            f"Estudiantes          : {len(self.creds_estus)}",
        ]
        becados   = sum(1 for e in self.estudiantes if e.get("es_becado"))
        convenios = sum(1 for e in self.estudiantes if e.get("convenio"))
        lines += [
            f"Con beca             : {becados} ({becados/max(len(self.estudiantes),1)*100:.1f}%)",
            f"Con convenio         : {convenios}",
            "",
            "NOTAS IMPORTANTES",
            "  1. Contraseña universal: campus2026",
            "  2. Login: email O cedula + password",
            "  3. Período activo: 2026-1 (2026-02-01 -> 2026-06-30)",
            "  4. Aprobación: nota >= 7.0",
            "  5. Mora: inscripción con pago_id IS NULL en período anterior ya cerrado",
            "  6. Tabla historial_notas: 20 correcciones de notas de ejemplo",
            "  7. Asistencias: columna observaciones añadida (~15% tardanza/justificado)",
            "  8. configuracion_ia: columna actualizado_en (sin tipo ni created_at)",
        ]

        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        log.info(f"   Credenciales exportadas -> {path}")
        return path

    def print_stats(self):
        queries = [
            ("Carreras",              "SELECT COUNT(*) FROM public.carreras"),
            ("Materias",              "SELECT COUNT(*) FROM public.materias"),
            ("Prerequisitos",         "SELECT COUNT(*) FROM public.prerequisitos"),
            ("Períodos",              "SELECT COUNT(*) FROM public.periodos_lectivos"),
            ("Estudiantes",           "SELECT COUNT(*) FROM public.usuarios WHERE rol='estudiante'"),
            ("Profesores",            "SELECT COUNT(*) FROM public.usuarios WHERE rol='profesor'"),
            ("Secciones",             "SELECT COUNT(*) FROM public.secciones"),
            ("Inscripciones",         "SELECT COUNT(*) FROM public.inscripciones"),
            ("Evaluaciones",          "SELECT COUNT(*) FROM public.evaluaciones_parciales"),
            ("Asistencias",           "SELECT COUNT(*) FROM public.asistencias"),
            ("Asist. con obs.",       "SELECT COUNT(*) FROM public.asistencias WHERE observaciones IS NOT NULL"),
            ("Historial notas",       "SELECT COUNT(*) FROM public.historial_notas"),
            ("Pagos totales",         "SELECT COUNT(*) FROM public.pagos"),
            ("Pagos completados",     "SELECT COUNT(*) FROM public.pagos WHERE estado='completado'"),
            ("Pagos pendientes",      "SELECT COUNT(*) FROM public.pagos WHERE estado='pendiente'"),
            ("Insc. con mora",        "SELECT COUNT(*) FROM public.inscripciones WHERE pago_id IS NULL"),
            ("Becados",               "SELECT COUNT(*) FROM public.usuarios WHERE es_becado=true"),
            ("Convenio vigente",      "SELECT COUNT(*) FROM public.usuarios WHERE convenio_activo=true AND fecha_limite_convenio>=CURRENT_DATE"),
        ]
        print("\n" + "=" * 60)
        print("ESTADISTICAS FINALES")
        print("=" * 60)
        for label, sql in queries:
            self._exec(sql)
            val   = self.cur.fetchone()
            count = list(val.values())[0]
            print(f"  {label:<30} {count:>8,}")
        print("=" * 60)
        print("\nACCESO RAPIDO — DEMO PANEL")
        print("  director@infocampus.edu.es      / campus2026")
        print("  coordinador@infocampus.edu.es   / campus2026")
        print("  tesorero@infocampus.edu.es      / campus2026")
        print("  secretaria@infocampus.edu.es    / campus2026")
        print("  profesor@infocampus.edu.es      / campus2026")
        print("  estudiante@infocampus.edu.es    / campus2026")
        print("=" * 60)

    def run(self):
        print("\n" + "=" * 60)
        print("INFOCAMPUS ERP — DatabaseSeeder V7")
        print("    (100% aligned with backend endpoints)")
        print("=" * 60)

        self.drop_and_create_schema()
        self.seed_configuracion_ia()
        self.seed_carreras()
        self.seed_periodos()
        self.seed_admins()
        self.seed_profesores()
        self.seed_materias()
        self.seed_prerequisitos()
        self.seed_estudiantes()
        self.seed_secciones()
        self.seed_inscripciones_historicas()
        self.seed_inscripciones_activas()
        self.seed_evaluaciones_parciales()
        self.seed_asistencias()
        self.seed_historial_notas()      # NUEVO
        self.seed_pagos_recientes()
        self.seed_audit_logs()
        cred_path = self.export_credentials()

        self.print_stats()
        print(f"\nCredenciales detalladas -> {cred_path}")
        print("Poblacion completada.\n")

        self.cur.close()
        self.conn.close()


# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    seeder = DatabaseSeeder(DATABASE_URL)
    try:
        seeder.run()
    except KeyboardInterrupt:
        log.warning("Ejecucion cancelada por el usuario.")
        sys.exit(0)
    except Exception as exc:
        log.exception(f"Error fatal: {exc}")
        sys.exit(1)
