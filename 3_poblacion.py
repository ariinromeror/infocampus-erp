"""
SCRIPT 3: POBLACIÓN OPTIMIZADA + CREDENCIALES
Genera 3 Estudiantes, 1 Profesor y Staff mínimo (Director, Tesorero, Coordinador).
Crea archivos .txt en la carpeta 'credenciales'.
Optimizado para Render Free Tier
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
from portal.models import Usuario, Carrera, Seccion, PeriodoLectivo, Inscripcion, Pago

fake = Faker('es_ES')
PASSWORD_DEFAULT = 'campus2026'
CREDENCIALES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credenciales')

def crear_directorio_credenciales():
    if not os.path.exists(CREDENCIALES_DIR):
        os.makedirs(CREDENCIALES_DIR)
        print(f"✓ Directorio 'credenciales' creado")

def guardar_credencial(username, password, rol, email='', carrera='', observacion=''):
    filename = f"{username}.txt"
    filepath = os.path.join(CREDENCIALES_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("="*50 + "\n")
        f.write("CREDENCIALES DE ACCESO - INFO CAMPUS\n")
        f.write("="*50 + "\n\n")
        f.write(f"Usuario:    {username}\n")
        f.write(f"Contraseña: {password}\n")
        f.write(f"Rol:        {rol}\n")
        if email: f.write(f"Email:      {email}\n")
        if carrera: f.write(f"Carrera:    {carrera}\n")
        if observacion: f.write(f"Nota:       {observacion}\n")
        f.write("\n" + "="*50 + "\n")

def crear_grupos():
    roles = ['Estudiante', 'Profesor', 'Tesorero', 'Coordinador', 'Director']
    for rol in roles:
        Group.objects.get_or_create(name=rol)

def crear_estudiantes():
    print("\n" + "="*60 + "\nCREANDO 3 ESTUDIANTES Y SUS TXT\n" + "="*60)
    # Ya no necesitamos delete() aquí porque se hizo en main()
    carreras = list(Carrera.objects.all())
    
    # Estudiante 1: Normal (ISC)
    username = "estudiante001"
    carrera = Carrera.objects.get(codigo='ISC')
    user = Usuario.objects.create_user(
        username=username, password=PASSWORD_DEFAULT,
        first_name=fake.first_name(), last_name=f"{fake.last_name()} {fake.last_name()}",
        email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
        rol='estudiante', carrera=carrera, is_active=True
    )
    user.groups.add(Group.objects.get(name='Estudiante'))
    guardar_credencial(username, PASSWORD_DEFAULT, "Estudiante", user.email, str(carrera), "Al día con pagos")
    print(f"  ✓ Creado: {username} - {carrera.codigo} (AL DÍA)")
    
    # Estudiante 2: Normal (ADM)
    username = "estudiante002"
    carrera = Carrera.objects.get(codigo='ADM')
    user = Usuario.objects.create_user(
        username=username, password=PASSWORD_DEFAULT,
        first_name=fake.first_name(), last_name=f"{fake.last_name()} {fake.last_name()}",
        email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
        rol='estudiante', carrera=carrera, is_active=True
    )
    user.groups.add(Group.objects.get(name='Estudiante'))
    guardar_credencial(username, PASSWORD_DEFAULT, "Estudiante", user.email, str(carrera), "Al día con pagos")
    print(f"  ✓ Creado: {username} - {carrera.codigo} (AL DÍA)")
    
    # Estudiante 3: EN MORA (PSI)
    username = "estudiante003"
    carrera = Carrera.objects.get(codigo='PSI')
    user = Usuario.objects.create_user(
        username=username, password=PASSWORD_DEFAULT,
        first_name=fake.first_name(), last_name=f"{fake.last_name()} {fake.last_name()}",
        email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
        rol='estudiante', carrera=carrera, is_active=True
    )
    user.groups.add(Group.objects.get(name='Estudiante'))
    guardar_credencial(username, PASSWORD_DEFAULT, "Estudiante", user.email, str(carrera), "⚠️ EN MORA - Tiene pagos pendientes")
    print(f"  ✓ Creado: {username} - {carrera.codigo} (⚠️ EN MORA)")

def crear_profesores():
    print("\n" + "="*60 + "\nCREANDO 1 PROFESOR Y SU TXT\n" + "="*60)
    # Ya no necesitamos delete() aquí porque se hizo en main()
    
    username = "profesor01"
    user = Usuario.objects.create_user(
        username=username, password=PASSWORD_DEFAULT,
        first_name=fake.first_name(), last_name=fake.last_name(),
        email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
        rol='profesor', is_active=True
    )
    user.groups.add(Group.objects.get(name='Profesor'))
    guardar_credencial(username, PASSWORD_DEFAULT, "Profesor", user.email)
    print(f"  ✓ Creado: {username} (TXT generado)")
    
    # Asignar el profesor a todas las secciones
    secciones = Seccion.objects.all()
    secciones.update(profesor=user)
    print(f"  ✓ Profesor asignado a {secciones.count()} secciones")

def crear_staff_administrativo():
    print("\n" + "="*60 + "\nCREANDO STAFF MÍNIMO Y SUS TXT\n" + "="*60)
    # Ya no necesitamos delete() aquí porque se hizo en main()
    staff = [('director', 'Director'), ('coordinador', 'Coordinador'), ('tesorero', 'Tesorero')]
    
    for rol_slug, grupo_name in staff:
        username = f"{rol_slug}01"
        user = Usuario.objects.create_user(
            username=username, password=PASSWORD_DEFAULT,
            first_name=fake.first_name(), last_name=fake.last_name(),
            email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
            rol=rol_slug, is_staff=True, is_active=True
        )
        user.groups.add(Group.objects.get(name=grupo_name))
        guardar_credencial(username, PASSWORD_DEFAULT, grupo_name, user.email)
        print(f"  ✓ Creado: {username} (TXT generado)")

def main():
    print("\n" + "█"*60)
    print("🧹 LIMPIEZA PROFUNDA DE BASE DE DATOS")
    print("█"*60)
    
    # CRÍTICO: Orden de borrado de hijos a padres para evitar Foreign Key errors
    print("\n⚠️  Eliminando datos existentes en orden correcto...")
    
    # 1. Primero borrar Pagos (dependen de Inscripciones)
    pagos_count = Pago.objects.all().count()
    Pago.objects.all().delete()
    print(f"  ✓ Pagos eliminados: {pagos_count}")
    
    # 2. Luego borrar Inscripciones (dependen de Usuarios y Secciones)
    inscripciones_count = Inscripcion.objects.all().count()
    Inscripcion.objects.all().delete()
    print(f"  ✓ Inscripciones eliminadas: {inscripciones_count}")
    
    # 3. Ahora sí podemos borrar Usuarios sin problema
    usuarios_count = Usuario.objects.all().count()
    Usuario.objects.all().delete()
    print(f"  ✓ Usuarios eliminados: {usuarios_count}")
    
    print("\n✓ Base de datos limpia. Iniciando creación de nuevos datos...")
    
    crear_directorio_credenciales()
    crear_grupos()
    crear_estudiantes()
    crear_profesores()
    crear_staff_administrativo()
    
    print("\n" + "="*60)
    print("RESUMEN DE USUARIOS CREADOS")
    print("="*60)
    print(f"Estudiantes: 3 (1 en mora)")
    print(f"Profesores:  1")
    print(f"Staff:       3 (Director, Coordinador, Tesorero)")
    print(f"TOTAL:       7 usuarios")
    print("="*60)
    print("\n✓ PROCESO COMPLETADO: Usuarios creados y archivos TXT listos.")

if __name__ == '__main__':
    main()