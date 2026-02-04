"""
SCRIPT 2: LOGÍSTICA DE TIEMPOS Y SECCIONES
Crea 4 períodos lectivos y secciones para todas las materias en el período 2026-1
"""

import os
import sys
import django
from datetime import date, time
import random

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from portal.models import PeriodoLectivo, Materia, Seccion

def crear_periodos():
    """Crea 4 períodos lectivos: 3 pasados y 1 actual"""
    periodos_data = [
        {
            'codigo': '2024-2',
            'nombre': 'Segundo Semestre 2024',
            'fecha_inicio': date(2024, 8, 1),
            'fecha_fin': date(2024, 12, 15),
            'activo': False
        },
        {
            'codigo': '2025-1',
            'nombre': 'Primer Semestre 2025',
            'fecha_inicio': date(2025, 1, 15),
            'fecha_fin': date(2025, 6, 30),
            'activo': False
        },
        {
            'codigo': '2025-2',
            'nombre': 'Segundo Semestre 2025',
            'fecha_inicio': date(2025, 8, 1),
            'fecha_fin': date(2025, 12, 20),
            'activo': False
        },
        {
            'codigo': '2026-1',
            'nombre': 'Primer Semestre 2026',
            'fecha_inicio': date(2026, 1, 20),
            'fecha_fin': date(2026, 7, 10),
            'activo': True
        }
    ]
    
    print("\n" + "="*60)
    print("CREANDO PERÍODOS LECTIVOS")
    print("="*60)
    
    periodos_creados = []
    for data in periodos_data:
        periodo, created = PeriodoLectivo.objects.get_or_create(
            codigo=data['codigo'],
            defaults=data
        )
        
        # Si ya existe pero necesita actualización del estado activo
        if not created and data['activo']:
            periodo.activo = True
            periodo.save()
        
        status = "✓ Creado" if created else "○ Ya existía"
        estado = "ACTIVO" if periodo.activo else "Cerrado"
        print(f"{status}: {periodo.nombre} ({periodo.codigo}) - {estado}")
        periodos_creados.append(periodo)
    
    return periodos_creados


def crear_secciones(periodo_actual):
    """Crea secciones para todas las materias en el período actual 2026-1"""
    
    # Configuración de horarios realistas
    horarios_disponibles = [
        {'hora_inicio': time(7, 0), 'hora_fin': time(9, 0)},
        {'hora_inicio': time(9, 0), 'hora_fin': time(11, 0)},
        {'hora_inicio': time(11, 0), 'hora_fin': time(13, 0)},
        {'hora_inicio': time(14, 0), 'hora_fin': time(16, 0)},
        {'hora_inicio': time(16, 0), 'hora_fin': time(18, 0)},
        {'hora_inicio': time(18, 0), 'hora_fin': time(20, 0)},
    ]
    
    dias_semana = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA']
    aulas = ['A-101', 'A-102', 'A-201', 'A-202', 'B-101', 'B-102', 'B-201', 'C-101', 'C-102', 'LAB-1', 'LAB-2']
    
    print("\n" + "="*60)
    print(f"CREANDO SECCIONES PARA PERÍODO {periodo_actual.codigo}")
    print("="*60)
    
    materias = Materia.objects.all()
    total_creadas = 0
    total_existentes = 0
    
    for materia in materias:
        print(f"\n{materia.carrera.codigo} - {materia.nombre}:")
        print("-" * 50)
        
        # Crear 2 secciones por materia para dar opciones a los estudiantes
        for num_seccion in range(1, 3):
            codigo_seccion = f"S{num_seccion}"
            
            # Seleccionar horario y día aleatorio
            horario = random.choice(horarios_disponibles)
            dia = random.choice(dias_semana)
            aula = random.choice(aulas)
            
            seccion, created = Seccion.objects.get_or_create(
                materia=materia,
                periodo=periodo_actual,
                codigo_seccion=codigo_seccion,
                defaults={
                    'dia': dia,
                    'hora_inicio': horario['hora_inicio'],
                    'hora_fin': horario['hora_fin'],
                    'aula': aula,
                    'cupo_maximo': 30,
                    'profesor': None  # Se asignará en el script 3
                }
            )
            
            if created:
                total_creadas += 1
                print(f"  ✓ Sección {codigo_seccion}: {dia} {horario['hora_inicio'].strftime('%H:%M')}-{horario['hora_fin'].strftime('%H:%M')} - Aula {aula}")
            else:
                total_existentes += 1
                print(f"  ○ Sección {codigo_seccion}: Ya existía")
    
    print("\n" + "="*60)
    print(f"RESUMEN: {total_creadas} secciones creadas, {total_existentes} ya existían")
    print(f"Total de materias: {materias.count()}")
    print(f"Total esperado de secciones: {materias.count() * 2}")
    print("="*60)


def main():
    """Función principal"""
    print("\n" + "█"*60)
    print("SCRIPT 2: CREACIÓN DE PERÍODOS Y SECCIONES")
    print("█"*60)
    
    # Paso 1: Crear períodos lectivos
    periodos = crear_periodos()
    
    # Paso 2: Obtener el período actual (2026-1)
    periodo_actual = PeriodoLectivo.objects.get(codigo='2026-1')
    
    # Paso 3: Crear secciones para el período actual
    crear_secciones(periodo_actual)
    
    print("\n" + "█"*60)
    print("✓ SCRIPT COMPLETADO EXITOSAMENTE")
    print("█"*60 + "\n")


if __name__ == '__main__':
    main()