"""
SCRIPT 0: LIMPIEZA COMPLETA DE BASE DE DATOS
Elimina TODOS los datos en el orden correcto para evitar errores de Foreign Key
Ejecutar ANTES de los scripts de población si necesitas resetear todo
"""

import os
import sys
import django

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from portal.models import (
    Usuario, Carrera, Materia, PeriodoLectivo, 
    Seccion, Inscripcion, Pago
)
from django.contrib.auth.models import Group


def limpiar_base_datos():
    """
    Limpia la base de datos en el orden correcto:
    De tablas hijas a tablas padres para respetar Foreign Keys
    """
    print("\n" + "🧹"*30)
    print("LIMPIEZA COMPLETA DE BASE DE DATOS")
    print("🧹"*30 + "\n")
    
    print("⚠️  ADVERTENCIA: Se eliminarán TODOS los datos.")
    print("    Este proceso es irreversible.\n")
    
    # Confirmación de seguridad (comentar en producción automática)
    # respuesta = input("¿Deseas continuar? (escribe 'SI' para confirmar): ")
    # if respuesta != 'SI':
    #     print("\n❌ Operación cancelada.")
    #     return
    
    print("\n" + "="*60)
    print("PASO 1: Eliminando registros con dependencias")
    print("="*60)
    
    # 1. PAGOS (dependen de Inscripciones)
    pagos_count = Pago.objects.all().count()
    Pago.objects.all().delete()
    print(f"  ✓ Pagos eliminados: {pagos_count}")
    
    # 2. INSCRIPCIONES (dependen de Usuarios y Secciones)
    inscripciones_count = Inscripcion.objects.all().count()
    Inscripcion.objects.all().delete()
    print(f"  ✓ Inscripciones eliminadas: {inscripciones_count}")
    
    print("\n" + "="*60)
    print("PASO 2: Eliminando estructura académica")
    print("="*60)
    
    # 3. SECCIONES (dependen de Materias, Períodos y Profesores)
    secciones_count = Seccion.objects.all().count()
    Seccion.objects.all().delete()
    print(f"  ✓ Secciones eliminadas: {secciones_count}")
    
    # 4. MATERIAS (dependen de Carreras)
    materias_count = Materia.objects.all().count()
    Materia.objects.all().delete()
    print(f"  ✓ Materias eliminadas: {materias_count}")
    
    # 5. PERÍODOS LECTIVOS (independientes)
    periodos_count = PeriodoLectivo.objects.all().count()
    PeriodoLectivo.objects.all().delete()
    print(f"  ✓ Períodos lectivos eliminados: {periodos_count}")
    
    # 6. CARRERAS (independientes)
    carreras_count = Carrera.objects.all().count()
    Carrera.objects.all().delete()
    print(f"  ✓ Carreras eliminadas: {carreras_count}")
    
    print("\n" + "="*60)
    print("PASO 3: Eliminando usuarios y permisos")
    print("="*60)
    
    # 7. USUARIOS (ahora no tienen ninguna dependencia)
    usuarios_count = Usuario.objects.all().count()
    Usuario.objects.all().delete()
    print(f"  ✓ Usuarios eliminados: {usuarios_count}")
    
    # 8. GRUPOS (opcional - los scripts los recrean)
    grupos_count = Group.objects.all().count()
    Group.objects.all().delete()
    print(f"  ✓ Grupos eliminados: {grupos_count}")
    
    print("\n" + "="*60)
    print("RESUMEN DE LIMPIEZA")
    print("="*60)
    print(f"Total de registros eliminados:")
    print(f"  - Pagos:         {pagos_count}")
    print(f"  - Inscripciones: {inscripciones_count}")
    print(f"  - Secciones:     {secciones_count}")
    print(f"  - Materias:      {materias_count}")
    print(f"  - Períodos:      {periodos_count}")
    print(f"  - Carreras:      {carreras_count}")
    print(f"  - Usuarios:      {usuarios_count}")
    print(f"  - Grupos:        {grupos_count}")
    print(f"  TOTAL:           {pagos_count + inscripciones_count + secciones_count + materias_count + periodos_count + carreras_count + usuarios_count + grupos_count}")
    print("="*60)
    
    print("\n✅ Base de datos limpia exitosamente.")
    print("📝 Ahora puedes ejecutar los scripts 1-4 para repoblar.\n")


def main():
    print("\n" + "█"*60)
    print("SCRIPT 0: LIMPIEZA COMPLETA")
    print("█"*60)
    
    limpiar_base_datos()
    
    print("\n" + "█"*60)
    print("✓ LIMPIEZA COMPLETADA")
    print("█"*60 + "\n")
    
    print("🚀 SIGUIENTES PASOS:")
    print("   1. python 1_malla_optimizado.py")
    print("   2. python 2_secciones_optimizado.py")
    print("   3. python 3_poblacion_optimizado.py")
    print("   4. python 4_actividad_optimizado.py\n")


if __name__ == '__main__':
    main()