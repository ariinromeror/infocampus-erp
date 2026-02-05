"""
SCRIPT 1: ESTRUCTURA ACADÉMICA OPTIMIZADA (MALLA CURRICULAR)
Crea 3 carreras con 2 materias cada una (6 materias totales)
Optimizado para Render Free Tier
"""

import os
import sys
import django
from decimal import Decimal

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from portal.models import Carrera, Materia

def crear_carreras():
    """Crea 3 carreras universitarias con configuración realista"""
    carreras_data = [
        {
            'nombre': 'Ingeniería en Sistemas Computacionales',
            'codigo': 'ISC',
            'precio_credito': Decimal('55.00'),
            'duracion_semestres': 8,
            'dias_gracia_pago': 15
        },
        {
            'nombre': 'Administración de Empresas',
            'codigo': 'ADM',
            'precio_credito': Decimal('45.00'),
            'duracion_semestres': 8,
            'dias_gracia_pago': 15
        },
        {
            'nombre': 'Psicología Clínica',
            'codigo': 'PSI',
            'precio_credito': Decimal('48.00'),
            'duracion_semestres': 9,
            'dias_gracia_pago': 15
        }
    ]
    
    print("\n" + "="*60)
    print("CREANDO CARRERAS")
    print("="*60)
    
    carreras_creadas = []
    for data in carreras_data:
        carrera, created = Carrera.objects.get_or_create(
            codigo=data['codigo'],
            defaults=data
        )
        status = "✓ Creada" if created else "○ Ya existía"
        print(f"{status}: {carrera.nombre} ({carrera.codigo}) - ${carrera.precio_credito}/crédito")
        carreras_creadas.append(carrera)
    
    return carreras_creadas


def crear_materias_sistemas(carrera):
    """Crea 2 materias para Ingeniería en Sistemas"""
    materias = [
        {'nombre': 'Programación I', 'codigo': 'ISC101', 'semestre': 1, 'creditos': 4},
        {'nombre': 'Estructura de Datos', 'codigo': 'ISC202', 'semestre': 2, 'creditos': 4},
    ]
    return materias


def crear_materias_administracion(carrera):
    """Crea 2 materias para Administración de Empresas"""
    materias = [
        {'nombre': 'Fundamentos de Administración', 'codigo': 'ADM101', 'semestre': 1, 'creditos': 3},
        {'nombre': 'Marketing Estratégico', 'codigo': 'ADM301', 'semestre': 3, 'creditos': 4},
    ]
    return materias


def crear_materias_psicologia(carrera):
    """Crea 2 materias para Psicología Clínica"""
    materias = [
        {'nombre': 'Introducción a la Psicología', 'codigo': 'PSI101', 'semestre': 1, 'creditos': 3},
        {'nombre': 'Psicopatología General', 'codigo': 'PSI301', 'semestre': 3, 'creditos': 4},
    ]
    return materias


def poblar_materias(carreras):
    """Crea todas las materias para cada carrera"""
    funciones_materias = {
        'ISC': crear_materias_sistemas,
        'ADM': crear_materias_administracion,
        'PSI': crear_materias_psicologia,
    }
    
    print("\n" + "="*60)
    print("CREANDO MATERIAS (2 por carrera = 6 totales)")
    print("="*60)
    
    total_creadas = 0
    total_existentes = 0
    
    for carrera in carreras:
        print(f"\n{carrera.nombre}:")
        print("-" * 50)
        
        materias_data = funciones_materias[carrera.codigo](carrera)
        
        for data in materias_data:
            materia, created = Materia.objects.get_or_create(
                codigo=data['codigo'],
                defaults={
                    'nombre': data['nombre'],
                    'carrera': carrera,
                    'semestre': data['semestre'],
                    'creditos': data['creditos'],
                    'activo': True
                }
            )
            
            if created:
                total_creadas += 1
                print(f"  ✓ [{materia.codigo}] {materia.nombre} - Sem {materia.semestre} ({materia.creditos} créditos)")
            else:
                total_existentes += 1
                print(f"  ○ [{materia.codigo}] {materia.nombre} - Ya existía")
    
    print("\n" + "="*60)
    print(f"RESUMEN: {total_creadas} materias creadas, {total_existentes} ya existían")
    print("="*60)


def main():
    """Función principal"""
    print("\n" + "█"*60)
    print("SCRIPT 1: CREACIÓN DE ESTRUCTURA ACADÉMICA (OPTIMIZADO)")
    print("█"*60)
    
    # Paso 1: Crear carreras
    carreras = crear_carreras()
    
    # Paso 2: Crear materias
    poblar_materias(carreras)
    
    print("\n" + "█"*60)
    print("✓ SCRIPT COMPLETADO EXITOSAMENTE")
    print("█"*60 + "\n")


if __name__ == '__main__':
    main()