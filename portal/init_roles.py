from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from portal.models import Nota, Usuario

def crear_roles():
    # 1. Definir los Grupos
    grupos = ['Director', 'Coordinador', 'Tesorero', 'Administrativo', 'Profesor', 'Estudiante']
    
    for nombre in grupos:
        obj, created = Group.objects.get_or_create(name=nombre)
        if created:
            print(f"✅ Grupo '{nombre}' creado.")

    # 2. Permisos específicos (Ejemplos de lógica de negocio)
    # El Coordinador puede cambiar notas
    coordinador_group = Group.objects.get(name='Coordinador')
    content_type_nota = ContentType.objects.get_for_model(Nota)
    change_nota = Permission.objects.get(codename='change_nota', content_type=content_type_nota)
    coordinador_group.permissions.add(change_nota)
    
    # El Tesorero puede ver usuarios para marcar moras
    tesorero_group = Group.objects.get(name='Tesorero')
    content_type_user = ContentType.objects.get_for_model(Usuario)
    view_user = Permission.objects.get(codename='view_usuario', content_type=content_type_user)
    tesorero_group.permissions.add(view_user)

    print("🚀 Sistema de permisos inicializado correctamente.")

if __name__ == "__main__":
    import django
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    crear_roles()