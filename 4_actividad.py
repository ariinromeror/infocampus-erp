"""
SCRIPT 4: SIMULACIÓN DE ACTIVIDAD ACADÉMICA Y FINANCIERA (OPTIMIZADO)
- Inscribe los 3 estudiantes en 2-3 materias del período 2026-1
- Genera notas históricas mínimas para período 2025-2
- Crea registros de pago (2 pagados, 1 moroso)
Optimizado para Render Free Tier
"""

import os
import sys
import django
from decimal import Decimal
import random
from datetime import datetime, timedelta

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from portal.models import Usuario, Materia, Seccion, PeriodoLectivo, Inscripcion, Pago


def inscribir_estudiantes_periodo_actual():
    """Inscribe a los 3 estudiantes en 2-3 materias del período 2026-1"""
    print("\n" + "="*60)
    print("INSCRIBIENDO ESTUDIANTES EN PERÍODO 2026-1")
    print("="*60)
    
    periodo_actual = PeriodoLectivo.objects.get(codigo='2026-1')
    estudiantes = Usuario.objects.filter(rol='estudiante').order_by('username')
    
    total_inscripciones = 0
    
    for estudiante in estudiantes:
        if not estudiante.carrera:
            continue
        
        # Obtener materias de la carrera del estudiante
        materias_carrera = Materia.objects.filter(carrera=estudiante.carrera)
        
        # Inscribir en todas las materias de su carrera (2 materias)
        num_materias = min(2, len(materias_carrera))
        materias_seleccionadas = list(materias_carrera)[:num_materias]
        
        print(f"\n{estudiante.username} ({estudiante.carrera.codigo}):")
        
        for materia in materias_seleccionadas:
            # Obtener una sección disponible de esa materia
            seccion = Seccion.objects.filter(
                materia=materia,
                periodo=periodo_actual
            ).first()
            
            if not seccion:
                continue
            
            # Crear inscripción
            inscripcion, created = Inscripcion.objects.get_or_create(
                estudiante=estudiante,
                seccion=seccion,
                defaults={
                    'estado': 'inscrito',
                    'fecha_inscripcion': timezone.now() - timedelta(days=random.randint(1, 10))
                }
            )
            
            if created:
                total_inscripciones += 1
                print(f"  ✓ {materia.codigo} - {materia.nombre}")
    
    print(f"\n✓ Total: {total_inscripciones} inscripciones creadas")
    return total_inscripciones


def generar_notas_historicas():
    """Genera algunas notas históricas para período 2025-2"""
    print("\n" + "="*60)
    print("GENERANDO NOTAS HISTÓRICAS (PERÍODO 2025-2)")
    print("="*60)
    
    try:
        periodo_historico = PeriodoLectivo.objects.get(codigo='2025-2')
    except PeriodoLectivo.DoesNotExist:
        print("  ! Período 2025-2 no encontrado, saltando...")
        return 0
    
    estudiantes = Usuario.objects.filter(rol='estudiante')
    profesor = Usuario.objects.filter(rol='profesor').first()
    
    total_inscripciones_historicas = 0
    total_aprobadas = 0
    total_reprobadas = 0
    
    print(f"\nProcesando período {periodo_historico.codigo}...")
    print("-" * 50)
    
    for estudiante in estudiantes:
        if not estudiante.carrera:
            continue
        
        # Inscribir en 1 materia por período histórico
        materias_carrera = Materia.objects.filter(carrera=estudiante.carrera)
        if not materias_carrera.exists():
            continue
            
        materia = materias_carrera.first()
        
        # Obtener o crear sección para este período histórico
        seccion, _ = Seccion.objects.get_or_create(
            materia=materia,
            periodo=periodo_historico,
            codigo_seccion='S1',
            defaults={
                'dia': 'LU',
                'hora_inicio': '08:00',
                'hora_fin': '10:00',
                'aula': 'A-101',
                'cupo_maximo': 30,
                'profesor': profesor
            }
        )
        
        # Crear inscripción histórica
        inscripcion, created = Inscripcion.objects.get_or_create(
            estudiante=estudiante,
            seccion=seccion,
            defaults={
                'fecha_inscripcion': timezone.make_aware(
                    datetime.combine(periodo_historico.fecha_inicio, datetime.min.time())
                ) + timedelta(days=5)
            }
        )
        
        if not created:
            continue
        
        # Generar nota (solo el estudiante003 reprueba)
        if estudiante.username == 'estudiante003':
            nota = Decimal('5.5')
            estado = 'reprobado'
            total_reprobadas += 1
        else:
            nota = Decimal(str(round(random.uniform(7.5, 9.5), 2)))
            estado = 'aprobado'
            total_aprobadas += 1
        
        inscripcion.nota_final = nota
        inscripcion.estado = estado
        inscripcion.nota_puesta_por = profesor
        inscripcion.fecha_nota_puesta = timezone.now() - timedelta(days=60)
        inscripcion.save()
        
        total_inscripciones_historicas += 1
        print(f"  ✓ {estudiante.username}: {materia.codigo} - Nota: {nota} ({estado})")
    
    print(f"\n✓ Total inscripciones históricas: {total_inscripciones_historicas}")
    print(f"  - Aprobadas: {total_aprobadas}")
    print(f"  - Reprobadas: {total_reprobadas}")
    
    return total_inscripciones_historicas


def generar_pagos():
    """Genera registros de pago: 2 pagados, 1 pendiente (moroso)"""
    print("\n" + "="*60)
    print("GENERANDO REGISTROS DE PAGO")
    print("="*60)
    
    # Obtener todas las inscripciones del período actual
    periodo_actual = PeriodoLectivo.objects.get(codigo='2026-1')
    inscripciones = Inscripcion.objects.filter(seccion__periodo=periodo_actual)
    
    tesorero = Usuario.objects.filter(rol='tesorero').first()
    metodos_pago = ['efectivo', 'transferencia', 'tarjeta']
    
    total_pagados = 0
    total_pendientes = 0
    
    for inscripcion in inscripciones:
        # Verificar si ya tiene pago
        if hasattr(inscripcion, 'pago'):
            continue
        
        # El estudiante003 queda en mora (sin pago)
        esta_pagado = inscripcion.estudiante.username != 'estudiante003'
        
        if esta_pagado:
            # Calcular monto del pago
            carrera = inscripcion.estudiante.carrera
            creditos = inscripcion.seccion.materia.creditos
            monto_base = Decimal(str(creditos)) * carrera.precio_credito
            
            # Aplicar descuento por beca si corresponde
            if inscripcion.estudiante.es_becado:
                descuento = monto_base * (Decimal(str(inscripcion.estudiante.porcentaje_beca)) / Decimal('100'))
                monto_final = monto_base - descuento
            else:
                monto_final = monto_base
            
            # Crear el pago
            Pago.objects.create(
                inscripcion=inscripcion,
                monto=monto_final,
                metodo_pago=random.choice(metodos_pago),
                comprobante=f"COMP-{random.randint(10000, 99999)}",
                procesado_por=tesorero,
                fecha_pago=timezone.now() - timedelta(days=random.randint(1, 10))
            )
            total_pagados += 1
            print(f"  ✓ PAGADO: {inscripcion.estudiante.username} - {inscripcion.seccion.materia.codigo} (${monto_final})")
        else:
            # Dejar sin pago (pendiente/moroso)
            total_pendientes += 1
            print(f"  ⚠️  MORA: {inscripcion.estudiante.username} - {inscripcion.seccion.materia.codigo}")
    
    total = total_pagados + total_pendientes
    
    print(f"\n✓ Pagos procesados:")
    print(f"  - Pagados: {total_pagados}")
    print(f"  - Pendientes: {total_pendientes}")
    print(f"  - Total inscripciones: {total}")
    
    return total_pagados, total_pendientes


def verificar_estudiantes_en_mora():
    """Verifica cuántos estudiantes están en mora"""
    print("\n" + "="*60)
    print("VERIFICACIÓN DE MOROSIDAD")
    print("="*60)
    
    estudiantes = Usuario.objects.filter(rol='estudiante')
    estudiantes_morosos = []
    estudiantes_al_dia = []
    
    for estudiante in estudiantes:
        if estudiante.en_mora:
            estudiantes_morosos.append(estudiante)
            print(f"  ⚠️  MOROSO: {estudiante.username} - Deuda: ${estudiante.deuda_total}")
        else:
            estudiantes_al_dia.append(estudiante)
            print(f"  ✓ AL DÍA: {estudiante.username}")
    
    print(f"\n✓ Estudiantes al día: {len(estudiantes_al_dia)}")
    print(f"⚠️  Estudiantes en mora: {len(estudiantes_morosos)}")


def main():
    """Función principal"""
    print("\n" + "█"*60)
    print("SCRIPT 4: SIMULACIÓN DE ACTIVIDAD (OPTIMIZADO)")
    print("█"*60)
    
    # Paso 1: Inscribir estudiantes en período actual
    total_inscripciones_actuales = inscribir_estudiantes_periodo_actual()
    
    # Paso 2: Generar notas históricas
    total_historicas = generar_notas_historicas()
    
    # Paso 3: Generar pagos
    pagados, pendientes = generar_pagos()
    
    # Paso 4: Verificar morosidad
    verificar_estudiantes_en_mora()
    
    # Resumen final
    print("\n" + "="*60)
    print("RESUMEN GENERAL")
    print("="*60)
    print(f"Inscripciones período 2026-1: {total_inscripciones_actuales}")
    print(f"Inscripciones históricas:     {total_historicas}")
    print(f"Pagos registrados:            {pagados}")
    print(f"Pagos pendientes:             {pendientes}")
    print("="*60)
    
    print("\n" + "█"*60)
    print("✓ SCRIPT COMPLETADO EXITOSAMENTE")
    print("█"*60 + "\n")


if __name__ == '__main__':
    main()