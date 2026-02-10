"""
POPULATE SUPABASE - Info Campus ERP
Población realista de base de datos académica

Requiere: pip install supabase faker
"""

import os
import random
from datetime import datetime, timedelta
from decimal import Decimal
from faker import Faker
from supabase import create_client, Client
import os
from dotenv import load_dotenv


load_dotenv()

# CONFIGURACIÓN SEGURA
# =====================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# Inicializar
fake = Faker('es_MX')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# =====================================================
# CONFIGURACIÓN DE POBLACIÓN
# =====================================================
CARRERAS_CONFIG = [
    {"nombre": "Ingeniería en Software", "codigo": "ISOFT", "precio": 65, "semestres": 10},
    {"nombre": "Medicina", "codigo": "MED", "precio": 80, "semestres": 12},
    {"nombre": "Derecho", "codigo": "DER", "precio": 55, "semestres": 10},
    {"nombre": "Administración de Empresas", "codigo": "ADM", "precio": 50, "semestres": 8},
    {"nombre": "Arquitectura", "codigo": "ARQ", "precio": 70, "semestres": 10},
]

TOTAL_ESTUDIANTES = 300
TOTAL_PROFESORES = 30
BECAS = {25: 0.10, 50: 0.05, 75: 0.03, 100: 0.02}  # porcentaje: probabilidad

# =====================================================
# PASO 1: CREAR CARRERAS
# =====================================================
def crear_carreras():
    print("📚 Creando carreras...")
    carreras = []
    for config in CARRERAS_CONFIG:
        data = {
            "nombre": config["nombre"],
            "codigo": config["codigo"],
            "precio_credito": config["precio"],
            "duracion_semestres": config["semestres"],
            "dias_gracia_pago": 15,
            "activo": True
        }
        result = supabase.table("carreras").insert(data).execute()
        carreras.append(result.data[0])
        print(f"  ✓ {config['nombre']}")
    return carreras

# =====================================================
# PASO 2: CREAR MALLA CURRICULAR
# =====================================================
def crear_malla(carreras):
    print("📖 Creando malla curricular...")
    
    materias_por_semestre = {
        "ISOFT": [
            ["Introducción a la Programación", "Matemáticas I", "Física I", "Comunicación", "Inglés I"],
            ["Programación Orientada a Objetos", "Matemáticas II", "Estructuras de Datos", "Base de Datos I", "Inglés II"],
            ["Algoritmos Avanzados", "Base de Datos II", "Desarrollo Web", "Redes I", "Estadística"],
            ["Ingeniería de Software I", "Sistemas Operativos", "Desarrollo Móvil", "Redes II", "Ética Profesional"],
            ["Ingeniería de Software II", "Arquitectura de Software", "Cloud Computing", "Inteligencia Artificial", "Proyecto I"],
            ["Seguridad Informática", "DevOps", "Machine Learning", "Blockchain", "Proyecto II"],
            ["Compiladores", "Computación Distribuida", "Big Data", "Ciberseguridad", "Tesis I"],
            ["Auditoría de Sistemas", "Emprendimiento Tech", "IoT", "Testing Avanzado", "Tesis II"],
            ["Práctica Profesional I", "Seminario de Investigación", "Computación Cuántica", "Gestión de Proyectos", "Electiva I"],
            ["Práctica Profesional II", "Seminario de Titulación", "Innovación Tecnológica", "Liderazgo", "Electiva II"],
        ],
        "MED": [
            ["Anatomía I", "Biología Celular", "Química General", "Introducción a la Medicina", "Ética Médica"],
            ["Anatomía II", "Fisiología I", "Bioquímica", "Histología", "Embriología"],
            ["Fisiología II", "Farmacología I", "Microbiología", "Parasitología", "Inmunología"],
            ["Farmacología II", "Patología I", "Semiología Médica", "Imagenología", "Epidemiología"],
            ["Patología II", "Medicina Interna I", "Cirugía I", "Pediatría I", "Ginecología I"],
            ["Medicina Interna II", "Cirugía II", "Pediatría II", "Ginecología II", "Psiquiatría I"],
            ["Medicina Familiar", "Traumatología", "Dermatología", "Oftalmología", "Otorrinolaringología"],
            ["Cardiología", "Neurología", "Nefrología", "Gastroenterología", "Neumología"],
            ["Medicina de Urgencias", "Oncología", "Geriatría", "Medicina Legal", "Salud Pública"],
            ["Internado Rotatorio I", "Cirugía Ambulatoria", "Cuidados Paliativos", "Bioética Clínica", "Investigación Médica"],
            ["Internado Rotatorio II", "Medicina Basada en Evidencia", "Gestión Hospitalaria", "Telemedicina", "Electiva Clínica I"],
            ["Servicio Social", "Seminario de Casos Clínicos", "Medicina Preventiva", "Farmacología Clínica", "Electiva Clínica II"],
        ],
        "DER": [
            ["Introducción al Derecho", "Teoría del Estado", "Historia del Derecho", "Metodología Jurídica", "Latín Jurídico"],
            ["Derecho Civil I", "Derecho Constitucional I", "Derecho Romano", "Filosofía del Derecho", "Teoría del Delito"],
            ["Derecho Civil II", "Derecho Constitucional II", "Derecho Penal I", "Derecho Internacional Público", "Lógica Jurídica"],
            ["Derecho Civil III", "Derecho Administrativo I", "Derecho Penal II", "Derecho Laboral I", "Derechos Humanos"],
            ["Derecho Mercantil I", "Derecho Administrativo II", "Derecho Procesal Civil I", "Derecho Laboral II", "Criminología"],
            ["Derecho Mercantil II", "Derecho Procesal Penal I", "Derecho Procesal Civil II", "Derecho Fiscal I", "Derecho Notarial"],
            ["Derecho Procesal Penal II", "Derecho Fiscal II", "Derecho Internacional Privado", "Derecho Ambiental", "Arbitraje"],
            ["Derecho Corporativo", "Derecho Agrario", "Derecho de la Seguridad Social", "Derecho Bancario", "Mediación"],
            ["Práctica Forense I", "Amparo", "Derecho de Familia", "Derecho Procesal Laboral", "Argumentación Jurídica"],
            ["Práctica Forense II", "Seminario de Tesis", "Derecho Electoral", "Compliance", "Ética Profesional del Abogado"],
        ],
        "ADM": [
            ["Introducción a la Administración", "Contabilidad Básica", "Matemáticas Financieras", "Microeconomía", "Comunicación Empresarial"],
            ["Administración de Recursos Humanos", "Contabilidad de Costos", "Estadística Aplicada", "Macroeconomía", "Derecho Empresarial"],
            ["Finanzas Corporativas I", "Marketing I", "Investigación de Operaciones", "Comportamiento Organizacional", "Ética en los Negocios"],
            ["Finanzas Corporativas II", "Marketing II", "Administración de Producción", "Gestión de Proyectos", "Emprendimiento"],
            ["Análisis Financiero", "Marketing Digital", "Logística y Cadena de Suministro", "Planeación Estratégica", "Innovación"],
            ["Finanzas Internacionales", "Comercio Electrónico", "Gestión de Calidad", "Consultoría Empresarial", "Liderazgo"],
            ["Auditoría Administrativa", "Inteligencia de Negocios", "Responsabilidad Social", "Coaching Ejecutivo", "Negociación"],
            ["Práctica Profesional", "Seminario de Casos", "Gestión del Cambio", "Business Analytics", "Plan de Negocios"],
        ],
        "ARQ": [
            ["Dibujo I", "Geometría Descriptiva", "Teoría de la Arquitectura I", "Matemáticas para Arquitectura", "Historia del Arte"],
            ["Dibujo II", "Diseño Arquitectónico I", "Teoría de la Arquitectura II", "Estática", "Historia de la Arquitectura I"],
            ["Diseño Arquitectónico II", "Construcción I", "Estructuras I", "Instalaciones I", "Historia de la Arquitectura II"],
            ["Diseño Arquitectónico III", "Construcción II", "Estructuras II", "Instalaciones II", "Topografía"],
            ["Diseño Arquitectónico IV", "Construcción III", "Estructuras III", "Paisajismo", "Urbanismo I"],
            ["Diseño Arquitectónico V", "Administración de Obras", "Diseño Estructural", "Acondicionamiento Ambiental", "Urbanismo II"],
            ["Diseño Integral I", "Presupuestos y Costos", "Restauración de Monumentos", "Diseño Sustentable", "Normatividad"],
            ["Diseño Integral II", "Dirección de Obra", "Arquitectura de Interiores", "BIM", "Proyecto Ejecutivo I"],
            ["Taller de Investigación", "Gestión Inmobiliaria", "Diseño Paramétrico", "Fotografía Arquitectónica", "Proyecto Ejecutivo II"],
            ["Práctica Profesional", "Seminario de Tesis", "Arquitectura Contemporánea", "Emprendimiento Inmobiliario", "Portafolio"],
        ]
    }
    
    todas_materias = []
    for carrera in carreras:
        codigo_carrera = carrera["codigo"]
        materias_lista = materias_por_semestre.get(codigo_carrera, [])
        
        for sem_idx, materias_sem in enumerate(materias_lista, start=1):
            for mat_idx, nombre in enumerate(materias_sem, start=1):
                codigo = f"{codigo_carrera}{sem_idx:02d}{mat_idx:02d}"
                creditos = random.choice([3, 3, 3, 4, 4, 5])
                
                # Prerequisito: materia del semestre anterior con mismo índice
                prerequisito_id = None
                if sem_idx > 1 and mat_idx <= len(materias_por_semestre.get(codigo_carrera, [])[sem_idx-2]):
                    # Buscar materia prerequisito
                    prereq_codigo = f"{codigo_carrera}{sem_idx-1:02d}{mat_idx:02d}"
                    prereq = next((m for m in todas_materias if m["codigo"] == prereq_codigo), None)
                    if prereq:
                        prerequisito_id = prereq["id"]
                
                data = {
                    "nombre": nombre,
                    "codigo": codigo,
                    "carrera_id": carrera["id"],
                    "semestre": sem_idx,
                    "creditos": creditos,
                    "prerequisito_id": prerequisito_id,
                    "activo": True
                }
                result = supabase.table("materias").insert(data).execute()
                todas_materias.append(result.data[0])
        
        print(f"  ✓ {carrera['nombre']}: {len(materias_lista)} semestres")
    
    return todas_materias

# =====================================================
# PASO 3: CREAR PERÍODOS LECTIVOS
# =====================================================
def crear_periodos():
    print("📅 Creando períodos lectivos...")
    periodos = []
    
    configs = [
        {"codigo": "2021-1", "nombre": "Enero-Junio 2021", "fecha_inicio": "2021-01-15", "fecha_fin": "2021-06-30", "activo": False},
        {"codigo": "2021-2", "nombre": "Julio-Diciembre 2021", "fecha_inicio": "2021-07-15", "fecha_fin": "2021-12-20", "activo": False},
        {"codigo": "2022-1", "nombre": "Enero-Junio 2022", "fecha_inicio": "2022-01-15", "fecha_fin": "2022-06-30", "activo": False},
        {"codigo": "2022-2", "nombre": "Julio-Diciembre 2022", "fecha_inicio": "2022-07-15", "fecha_fin": "2022-12-20", "activo": False},
        {"codigo": "2023-1", "nombre": "Enero-Junio 2023", "fecha_inicio": "2023-01-15", "fecha_fin": "2023-06-30", "activo": False},
        {"codigo": "2024-1", "nombre": "Enero-Junio 2024", "fecha_inicio": "2024-01-15", "fecha_fin": "2024-06-30", "activo": True},
    ]
    
    for config in configs:
        result = supabase.table("periodos_lectivos").insert(config).execute()
        periodos.append(result.data[0])
        print(f"  ✓ {config['nombre']}")
    
    return periodos

# =====================================================
# PASO 4: CREAR USUARIOS
# =====================================================
def crear_usuarios(carreras):
    print("👥 Creando usuarios...")
    usuarios = []
    archivo_txt = []
    
    # DIRECTOR
    data = {
        "username": "director.001",
        "email": "director@infocampus.edu",
        "first_name": "Roberto",
        "last_name": "Martínez Silva",
        "password": "campus2026",
        "rol": "director",
        "is_staff": True,
        "is_superuser": True
    }
    result = supabase.table("usuarios").insert(data).execute()
    usuarios.append(result.data[0])
    archivo_txt.append(f"director.001 | campus2026 | Director | Roberto Martínez Silva")
    
    # COORDINADORES
    for i in range(1, 3):
        tipo = "Académico" if i == 1 else "Financiero"
        data = {
            "username": f"coordinador.{i:03d}",
            "email": f"coord{i}@infocampus.edu",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "password": "campus2026",
            "rol": "coordinador",
            "is_staff": True
        }
        result = supabase.table("usuarios").insert(data).execute()
        usuarios.append(result.data[0])
        nombre = f"{data['first_name']} {data['last_name']}"
        archivo_txt.append(f"coordinador.{i:03d} | campus2026 | Coordinador {tipo} | {nombre}")
    
    # TESOREROS
    for i in range(1, 3):
        data = {
            "username": f"tesorero.{i:03d}",
            "email": f"tesorero{i}@infocampus.edu",
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "password": "campus2026",
            "rol": "tesorero",
            "is_staff": True
        }
        result = supabase.table("usuarios").insert(data).execute()
        usuarios.append(result.data[0])
        nombre = f"{data['first_name']} {data['last_name']}"
        archivo_txt.append(f"tesorero.{i:03d} | campus2026 | Tesorero | {nombre}")
    
    # PROFESORES (distribuidos por carrera)
    profes_por_carrera = TOTAL_PROFESORES // len(carreras)
    for idx, carrera in enumerate(carreras):
        for i in range(profes_por_carrera):
            num = idx * profes_por_carrera + i + 1
            data = {
                "username": f"profesor.{num:03d}",
                "email": f"profesor{num}@infocampus.edu",
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "password": "campus2026",
                "dni": fake.unique.random_number(digits=8),
                "rol": "profesor",
                "carrera_id": carrera["id"]
            }
            result = supabase.table("usuarios").insert(data).execute()
            usuarios.append(result.data[0])
            nombre = f"{data['first_name']} {data['last_name']}"
            archivo_txt.append(f"profesor.{num:03d} | campus2026 | Profesor | {nombre} ({carrera['nombre']})")
    
    print(f"  ✓ Staff: {5 + TOTAL_PROFESORES} usuarios")
    
    # ESTUDIANTES
    estudiantes_por_carrera = TOTAL_ESTUDIANTES // len(carreras)
    for idx, carrera in enumerate(carreras):
        for i in range(estudiantes_por_carrera):
            num = idx * estudiantes_por_carrera + i + 1
            
            # Asignar beca aleatoria
            es_becado = False
            porcentaje_beca = 0
            rand = random.random()
            acum = 0
            for porc, prob in BECAS.items():
                acum += prob
                if rand < acum:
                    es_becado = True
                    porcentaje_beca = porc
                    break
            
            # Semestre actual aleatorio (1 a duracion_semestres)
            semestre_actual = random.randint(1, carrera["duracion_semestres"])
            
            data = {
                "username": f"estudiante.{num:03d}",
                "email": f"estudiante{num}@infocampus.edu",
                "first_name": fake.first_name(),
                "last_name": fake.last_name(),
                "password": "campus2026",
                "dni": fake.unique.random_number(digits=8),
                "rol": "estudiante",
                "carrera_id": carrera["id"],
                "es_becado": es_becado,
                "porcentaje_beca": porcentaje_beca
            }
            result = supabase.table("usuarios").insert(data).execute()
            usuarios.append(result.data[0])
            
            nombre = f"{data['first_name']} {data['last_name']}"
            beca_str = f" - Beca {porcentaje_beca}%" if es_becado else ""
            archivo_txt.append(f"estudiante.{num:03d} | campus2026 | Estudiante | {nombre} ({carrera['codigo']} Sem{semestre_actual}){beca_str}")
    
    print(f"  ✓ Estudiantes: {TOTAL_ESTUDIANTES} usuarios")
    
    # Guardar archivo
    with open("usuarios_y_claves.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(archivo_txt))
    print("  ✓ Archivo usuarios_y_claves.txt generado")
    
    return usuarios

# =====================================================
# PASO 5: CREAR SECCIONES
# =====================================================
def crear_secciones(materias, profesores, periodos):
    print("🏫 Creando secciones...")
    
    periodo_actual = next(p for p in periodos if p["activo"])
    
    # Materias del período actual (solo semestres impares para Enero-Junio)
    materias_periodo = [m for m in materias if m["semestre"] % 2 == 1]
    
    secciones = []
    dias = ["LU", "MA", "MI", "JU", "VI"]
    aulas = [f"A{piso}{num:02d}" for piso in range(1, 4) for num in range(1, 6)]
    
    for materia in materias_periodo:
        # 2 secciones por materia
        num_secciones = random.choice([2, 3])
        
        # Profesores de la misma carrera
        profes_carrera = [p for p in profesores if p.get("carrera_id") == materia["carrera_id"]]
        
        for i in range(num_secciones):
            profesor = random.choice(profes_carrera) if profes_carrera else None
            
            data = {
                "materia_id": materia["id"],
                "profesor_id": profesor["id"] if profesor else None,
                "periodo_id": periodo_actual["id"],
                "codigo_seccion": f"{i+1:02d}",
                "dia": random.choice(dias),
                "hora_inicio": f"{random.choice([7, 9, 13, 15])}:00:00",
                "hora_fin": f"{random.choice([10, 12, 16, 18])}:00:00",
                "aula": random.choice(aulas),
                "cupo_maximo": 30
            }
            result = supabase.table("secciones").insert(data).execute()
            secciones.append(result.data[0])
    
    print(f"  ✓ {len(secciones)} secciones creadas")
    return secciones

# =====================================================
# PASO 6: SIMULAR ACTIVIDAD ACADÉMICA
# =====================================================
def simular_actividad(usuarios, secciones, periodos):
    print("📊 Simulando actividad académica...")
    
    estudiantes = [u for u in usuarios if u["rol"] == "estudiante"]
    periodo_actual = next(p for p in periodos if p["activo"])
    periodos_anteriores = [p for p in periodos if not p["activo"]]
    
    inscripciones_totales = 0
    pagos_totales = 0
    
    for estudiante in estudiantes:
        carrera_id = estudiante.get("carrera_id")
        if not carrera_id:
            continue
        
        # Determinar semestre actual del estudiante (aleatorio 1-10)
        semestre_estudiante = random.randint(1, 10)
        
        # INSCRIPCIONES HISTÓRICAS (períodos anteriores)
        for periodo in periodos_anteriores:
            # Inscribir en materias de semestres previos
            sem_inscribir = random.randint(1, max(1, semestre_estudiante - 1))
            
            secciones_disponibles = [
                s for s in secciones 
                if s["periodo_id"] == periodo["id"]
            ]
            
            # Obtener materias del semestre
            materias_sem = supabase.table("materias").select("*").eq("carrera_id", carrera_id).eq("semestre", sem_inscribir).execute()
            
            for materia in materias_sem.data[:4]:  # 4 materias por período histórico
                seccion_materia = next((s for s in secciones_disponibles if s["materia_id"] == materia["id"]), None)
                if not seccion_materia:
                    continue
                
                # Generar nota realista (distribución normal μ=7.5, σ=1.2)
                nota = max(0, min(10, random.gauss(7.5, 1.2)))
                estado = "aprobado" if nota >= 7.0 else "reprobado"
                
                # 95% probabilidad de inscripción normal
                if random.random() < 0.95:
                    fecha_insc = datetime.strptime(periodo["fecha_inicio"], "%Y-%m-%d") + timedelta(days=random.randint(0, 10))
                    
                    data_insc = {
                        "estudiante_id": estudiante["id"],
                        "seccion_id": seccion_materia["id"],
                        "nota_final": round(nota, 2),
                        "estado": estado,
                        "fecha_inscripcion": fecha_insc.isoformat()
                    }
                    result_insc = supabase.table("inscripciones").insert(data_insc).execute()
                    inscripciones_totales += 1
                    
                    # PAGO: 80% pagado en períodos anteriores
                    if random.random() < 0.80:
                        # Calcular monto
                        carrera_data = supabase.table("carreras").select("precio_credito").eq("id", carrera_id).execute()
                        precio = carrera_data.data[0]["precio_credito"]
                        monto = float(materia["creditos"]) * float(precio)
                        
                        if estudiante["es_becado"]:
                            descuento = monto * (estudiante["porcentaje_beca"] / 100)
                            monto -= descuento
                        
                        data_pago = {
                            "inscripcion_id": result_insc.data[0]["id"],
                            "monto": round(monto, 2),
                            "metodo_pago": random.choice(["transferencia", "tarjeta", "efectivo"]),
                            "comprobante": f"PAG-{random.randint(10000, 99999)}"
                        }
                        supabase.table("pagos").insert(data_pago).execute()
                        pagos_totales += 1
        
        # INSCRIPCIONES PERÍODO ACTUAL
        materias_actuales = supabase.table("materias").select("*").eq("carrera_id", carrera_id).eq("semestre", semestre_estudiante).execute()
        
        for materia in materias_actuales.data[:5]:  # 5 materias período actual
            seccion_materia = next((s for s in secciones if s["materia_id"] == materia["id"] and s["periodo_id"] == periodo_actual["id"]), None)
            if not seccion_materia:
                continue
            
            fecha_insc = datetime.strptime(periodo_actual["fecha_inicio"], "%Y-%m-%d") + timedelta(days=random.randint(0, 10))
            
            data_insc = {
                "estudiante_id": estudiante["id"],
                "seccion_id": seccion_materia["id"],
                "estado": "inscrito",
                "fecha_inscripcion": fecha_insc.isoformat()
            }
            result_insc = supabase.table("inscripciones").insert(data_insc).execute()
            inscripciones_totales += 1
            
            # PAGO PERÍODO ACTUAL: 70% pagado, 20% mora, 10% convenio
            rand = random.random()
            
            if rand < 0.70:  # Pagado
                carrera_data = supabase.table("carreras").select("precio_credito").eq("id", carrera_id).execute()
                precio = carrera_data.data[0]["precio_credito"]
                monto = float(materia["creditos"]) * float(precio)
                
                if estudiante["es_becado"]:
                    descuento = monto * (estudiante["porcentaje_beca"] / 100)
                    monto -= descuento
                
                data_pago = {
                    "inscripcion_id": result_insc.data[0]["id"],
                    "monto": round(monto, 2),
                    "metodo_pago": random.choice(["transferencia", "tarjeta", "efectivo"]),
                    "comprobante": f"PAG-{random.randint(10000, 99999)}"
                }
                supabase.table("pagos").insert(data_pago).execute()
                pagos_totales += 1
            
            elif rand < 0.90:  # 20% Mora (no paga, no convenio)
                pass
            
            else:  # 10% Convenio activo
                supabase.table("usuarios").update({
                    "convenio_activo": True,
                    "fecha_limite_convenio": (datetime.now() + timedelta(days=90)).date().isoformat(),
                    "comprobante_convenio": f"CONV-{random.randint(1000, 9999)}"
                }).eq("id", estudiante["id"]).execute()
    
    print(f"  ✓ {inscripciones_totales} inscripciones")
    print(f"  ✓ {pagos_totales} pagos registrados")

# =====================================================
# MAIN - EJECUTAR TODO
# =====================================================
def main():
    print("=" * 60)
    print("POBLACIÓN SUPABASE - INFO CAMPUS ERP")
    print("=" * 60)
    
    try:
        # Verificar conexión
        supabase.table("carreras").select("count").execute()
        print("✓ Conexión a Supabase exitosa\n")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("Verifica SUPABASE_URL y SUPABASE_KEY")
        return
    
    carreras = crear_carreras()
    materias = crear_malla(carreras)
    periodos = crear_periodos()
    usuarios = crear_usuarios(carreras)
    
    profesores = [u for u in usuarios if u["rol"] == "profesor"]
    secciones = crear_secciones(materias, profesores, periodos)
    
    simular_actividad(usuarios, secciones, periodos)
    
    print("\n" + "=" * 60)
    print("✅ POBLACIÓN COMPLETA")
    print(f"   {len(carreras)} carreras")
    print(f"   {len(materias)} materias")
    print(f"   {len(periodos)} períodos")
    print(f"   {len(usuarios)} usuarios")
    print(f"   {len(secciones)} secciones")
    print("=" * 60)
    print("📄 Archivo: usuarios_y_claves.txt")

if __name__ == "__main__":
    main()