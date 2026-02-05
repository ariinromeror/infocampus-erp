"""
SCRIPT 3: POBLACIÓN OPTIMIZADA + CREDENCIALES
Genera 5 Estudiantes, 2 Profesores y Staff mínimo.
Crea archivos .txt en la carpeta 'credenciales'.
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

fake = Faker('es_ES')
PASSWORD_DEFAULT = 'campus2026'
CREDENCIALES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credenciales')

def crear_directorio_credenciales():
    if not os.path.exists(CREDENCIALES_DIR):
        os.makedirs(CREDENCIALES_DIR)
        print(f"✓ Directorio 'credenciales' creado")

def guardar_credencial(username, password, rol, email='', carrera=''):
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
        f.write("\n" + "="*50 + "\n")

def crear_grupos():
    roles = ['Estudiante', 'Profesor', 'Tesorero', 'Coordinador', 'Director']
    for rol in roles:
        Group.objects.get_or_create(name=rol)

def crear_estudiantes():
    print("\n" + "="*60 + "\nCREANDO 5 ESTUDIANTES Y SUS TXT\n" + "="*60)
    Usuario.objects.filter(rol='estudiante').delete() # Limpia para evitar Error 500
    carreras = list(Carrera.objects.all())
    
    for i in range(1, 6):
        username = f"estudiante{i:03d}"
        first_name = fake.first_name()
        last_name = f"{fake.last_name()} {fake.last_name()}"
        carrera = random.choice(carreras)
        
        user = Usuario.objects.create_user(
            username=username, password=PASSWORD_DEFAULT,
            first_name=first_name, last_name=last_name,
            email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
            rol='estudiante', carrera=carrera, is_active=True
        )
        user.groups.add(Group.objects.get(name='Estudiante'))
        
        # GENERAR EL TXT
        guardar_credencial(username, PASSWORD_DEFAULT, "Estudiante", user.email, str(carrera))
        print(f"  ✓ Creado: {username} (TXT generado)")

def crear_profesores():
    print("\n" + "="*60 + "\nCREANDO 2 PROFESORES Y SUS TXT\n" + "="*60)
    Usuario.objects.filter(rol='profesor').delete()
    for i in range(1, 3):
        username = f"profesor{i:02d}"
        user = Usuario.objects.create_user(
            username=username, password=PASSWORD_DEFAULT,
            first_name=fake.first_name(), last_name=fake.last_name(),
            email=f"{username}@infocampus.edu", dni=str(fake.unique.random_number(digits=8, fix_len=True)),
            rol='profesor', is_active=True
        )
        user.groups.add(Group.objects.get(name='Profesor'))
        guardar_credencial(username, PASSWORD_DEFAULT, "Profesor", user.email)
        print(f"  ✓ Creado: {username} (TXT generado)")

def crear_staff_administrativo():
    print("\n" + "="*60 + "\nCREANDO STAFF MÍNIMO Y SUS TXT\n" + "="*60)
    Usuario.objects.filter(rol__in=['director', 'coordinador', 'tesorero']).delete()
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
    crear_directorio_credenciales()
    crear_grupos()
    crear_estudiantes()
    crear_profesores()
    crear_staff_administrativo()
    print("\n✓ PROCESO COMPLETADO: Usuarios creados y archivos TXT listos.")

if __name__ == '__main__':
    main()