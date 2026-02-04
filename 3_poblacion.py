"""
SCRIPT 3: POBLACIÓN DE USUARIOS Y RBAC
Crea usuarios con roles: 150 Estudiantes, 20 Profesores, 2 Directores, 3 Coordinadores, 3 Tesoreros
Genera credenciales en carpeta 'credenciales'
"""

import os
import sys
import django
from faker import Faker
import random

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import Group
from portal.models import Usuario, Carrera, Seccion, PeriodoLectivo

# Inicializar Faker en español
fake = Faker('es_ES')
PASSWORD_DEFAULT = 'campus2026'

# Directorio para credenciales
CREDENCIALES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credenciales')


def crear_directorio_credenciales():
    """Crea el directorio de credenciales si no existe"""
    if not os.path.exists(CREDENCIALES_DIR):
        os.makedirs(CREDENCIALES_DIR)
        print(f"✓ Directorio 'credenciales' creado en: {CREDENCIALES_DIR}")
    else:
        print(f"○ Directorio 'credenciales' ya existe")


def guardar_credencial(username, password, rol, email='', carrera=''):
    """Guarda las credenciales de un usuario en un archivo .txt"""
    filename = f"{username}.txt"
    filepath = os.path.join(CREDENCIALES_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("="*50 + "\n")
        f.write("CREDENCIALES DE ACCESO - INFO CAMPUS\n")
        f.write("="*50 + "\n\n")
        f.write(f"Usuario:   {username}\n")
        f.write(f"Contraseña: {password}\n")
        f.write(f"Rol:       {rol}\n")
        if email:
            f.write(f"Email:     {email}\n")
        if carrera:
            f.write(f"Carrera:   {carrera}\n")
        f.write("\n" + "="*50 + "\n")
        f.write("IMPORTANTE: Cambia tu contraseña al primer ingreso\n")
        f.write("="*50 + "\n")


def crear_grupos():
    """Crea o asegura la existencia de los grupos de roles"""
    roles = ['Estudiante', 'Profesor', 'Tesorero', 'Coordinador', 'Director', 'Administrativo']
    
    print("\n" + "="*60)
    print("CREANDO GRUPOS DE ROLES (RBAC)")
    print("="*60)
    
    for rol in roles:
        grupo, created = Group.objects.get_or_create(name=rol)
        status = "✓ Creado" if created else "○ Ya existía"
        print(f"{status}: Grupo '{rol}'")
    
    return roles


def crear_estudiantes():
    """Crea 150 estudiantes vinculados a carreras"""
    print("\n" + "="*60)
    print("CREANDO ESTUDIANTES (150)")
    print("="*60)
    
    carreras = list(Carrera.objects.all())
    if not carreras:
        print("ERROR: No hay carreras disponibles. Ejecuta primero 1_malla.py")
        return []
    
    estudiantes_creados = []
    total_creados = 0
    total_existentes = 0
    
    for i in range(1, 151):
        username = f"estudiante{i:03d}"
        
        # Verificar si ya existe
        if Usuario.objects.filter(username=username).exists():
            total_existentes += 1
            continue
        
        # Generar datos realistas
        first_name = fake.first_name()
        last_name = f"{fake.last_name()} {fake.last_name()}"
        email = f"{username}@infocampus.edu"
        dni = fake.unique.random_number(digits=8, fix_len=True)
        carrera = random.choice(carreras)
        
        # Determinar si tiene beca (20% de probabilidad)
        es_becado = random.random() < 0.20
        porcentaje_beca = random.choice([25, 50, 75, 100]) if es_becado else 0
        
        # Crear usuario
        estudiante = Usuario.objects.create_user(
            username=username,
            password=PASSWORD_DEFAULT,
            first_name=first_name,
            last_name=last_name,
            email=email,
            dni=str(dni),
            rol='estudiante',
            carrera=carrera,
            es_becado=es_becado,
            porcentaje_beca=porcentaje_beca,
            is_active=True
        )
        
        # Asignar al grupo
        grupo_estudiante = Group.objects.get(name='Estudiante')
        estudiante.groups.add(grupo_estudiante)
        
        # Guardar credenciales
        beca_info = f" - Beca {porcentaje_beca}%" if es_becado else ""
        guardar_credencial(
            username, 
            PASSWORD_DEFAULT, 
            f"Estudiante{beca_info}", 
            email, 
            str(carrera)
        )
        
        estudiantes_creados.append(estudiante)
        total_creados += 1
        
        if total_creados % 30 == 0:
            print(f"  ✓ {total_creados} estudiantes creados...")
    
    print(f"\n✓ Total: {total_creados} estudiantes creados, {total_existentes} ya existían")
    return estudiantes_creados


def crear_profesores():
    """Crea 20 profesores y los asigna a secciones"""
    print("\n" + "="*60)
    print("CREANDO PROFESORES (20)")
    print("="*60)
    
    periodo_actual = PeriodoLectivo.objects.filter(activo=True).first()
    if not periodo_actual:
        print("ERROR: No hay período activo. Ejecuta primero 2_secciones.py")
        return []
    
    secciones = list(Seccion.objects.filter(periodo=periodo_actual, profesor__isnull=True))
    
    profesores_creados = []
    total_creados = 0
    total_existentes = 0
    
    for i in range(1, 21):
        username = f"profesor{i:02d}"
        
        # Verificar si ya existe
        if Usuario.objects.filter(username=username).exists():
            total_existentes += 1
            continue
        
        # Generar datos realistas
        first_name = fake.first_name()
        last_name = f"{fake.last_name()} {fake.last_name()}"
        email = f"{username}@infocampus.edu"
        dni = fake.unique.random_number(digits=8, fix_len=True)
        
        # Crear profesor
        profesor = Usuario.objects.create_user(
            username=username,
            password=PASSWORD_DEFAULT,
            first_name=first_name,
            last_name=last_name,
            email=email,
            dni=str(dni),
            rol='profesor',
            is_active=True
        )
        
        # Asignar al grupo
        grupo_profesor = Group.objects.get(name='Profesor')
        profesor.groups.add(grupo_profesor)
        
        # Asignar secciones (entre 2 y 4 secciones por profesor)
        num_secciones = random.randint(2, 4)
        secciones_asignadas = []
        
        for _ in range(min(num_secciones, len(secciones))):
            if secciones:
                seccion = secciones.pop(0)
                seccion.profesor = profesor
                seccion.save()
                secciones_asignadas.append(f"{seccion.materia.codigo}-{seccion.codigo_seccion}")
        
        # Guardar credenciales
        guardar_credencial(
            username, 
            PASSWORD_DEFAULT, 
            f"Profesor ({len(secciones_asignadas)} secciones)", 
            email
        )
        
        profesores_creados.append(profesor)
        total_creados += 1
        
        print(f"  ✓ {profesor.nombre_completo} - {len(secciones_asignadas)} secciones asignadas")
    
    print(f"\n✓ Total: {total_creados} profesores creados, {total_existentes} ya existían")
    return profesores_creados


def crear_staff_administrativo():
    """Crea 2 Directores, 3 Coordinadores y 3 Tesoreros"""
    print("\n" + "="*60)
    print("CREANDO PERSONAL ADMINISTRATIVO")
    print("="*60)
    
    staff_config = [
        {'rol': 'director', 'cantidad': 2, 'grupo': 'Director'},
        {'rol': 'coordinador', 'cantidad': 3, 'grupo': 'Coordinador'},
        {'rol': 'tesorero', 'cantidad': 3, 'grupo': 'Tesorero'},
    ]
    
    total_creados = 0
    total_existentes = 0
    
    for config in staff_config:
        rol = config['rol']
        cantidad = config['cantidad']
        grupo_name = config['grupo']
        
        print(f"\n{grupo_name}s:")
        print("-" * 50)
        
        for i in range(1, cantidad + 1):
            username = f"{rol}{i:02d}"
            
            # Verificar si ya existe
            if Usuario.objects.filter(username=username).exists():
                total_existentes += 1
                print(f"  ○ {username} - Ya existía")
                continue
            
            # Generar datos
            first_name = fake.first_name()
            last_name = f"{fake.last_name()} {fake.last_name()}"
            email = f"{username}@infocampus.edu"
            dni = fake.unique.random_number(digits=8, fix_len=True)
            
            # Crear usuario
            user = Usuario.objects.create_user(
                username=username,
                password=PASSWORD_DEFAULT,
                first_name=first_name,
                last_name=last_name,
                email=email,
                dni=str(dni),
                rol=rol,
                is_staff=True,
                is_active=True
            )
            
            # Asignar al grupo
            grupo = Group.objects.get(name=grupo_name)
            user.groups.add(grupo)
            
            # Guardar credenciales
            guardar_credencial(username, PASSWORD_DEFAULT, grupo_name, email)
            
            total_creados += 1
            print(f"  ✓ {user.nombre_completo} ({username})")
    
    print(f"\n✓ Total: {total_creados} administrativos creados, {total_existentes} ya existían")


def main():
    """Función principal"""
    print("\n" + "█"*60)
    print("SCRIPT 3: POBLACIÓN DE USUARIOS Y RBAC")
    print("█"*60)
    
    # Paso 1: Crear directorio de credenciales
    crear_directorio_credenciales()
    
    # Paso 2: Crear grupos de roles
    crear_grupos()
    
    # Paso 3: Crear estudiantes
    estudiantes = crear_estudiantes()
    
    # Paso 4: Crear profesores
    profesores = crear_profesores()
    
    # Paso 5: Crear staff administrativo
    crear_staff_administrativo()
    
    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN FINAL DE USUARIOS")
    print("="*60)
    print(f"Estudiantes:     {Usuario.objects.filter(rol='estudiante').count()}")
    print(f"Profesores:      {Usuario.objects.filter(rol='profesor').count()}")
    print(f"Directores:      {Usuario.objects.filter(rol='director').count()}")
    print(f"Coordinadores:   {Usuario.objects.filter(rol='coordinador').count()}")
    print(f"Tesoreros:       {Usuario.objects.filter(rol='tesorero').count()}")
    print(f"\nTOTAL USUARIOS:  {Usuario.objects.count()}")
    print(f"Credenciales guardadas en: {CREDENCIALES_DIR}")
    print("="*60)
    
    print("\n" + "█"*60)
    print("✓ SCRIPT COMPLETADO EXITOSAMENTE")
    print("█"*60 + "\n")


if __name__ == '__main__':
    main()