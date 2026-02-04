"""
SCRIPT 4: SIMULACIÓN DE ACTIVIDAD ACADÉMICA Y FINANCIERA
- Inscribe estudiantes en materias del período 2026-1
- Genera notas históricas (20% reprobadas) para períodos 2025-1 y 2025-2
- Crea registros de pago (80% pagados, 20% morosos)
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
    """Inscribe a los 150 estudiantes en al menos 5 materias del período 2026-1"""
    print("\n" + "="*60)
    print("INSCRIBIENDO ESTUDIANTES EN PERÍODO 2026-1")
    print("="*60)
    
    periodo_actual = PeriodoLectivo.objects.get(codigo='2026-1')
    estudiantes = Usuario.objects.filter(rol='estudiante')
    
    total_inscripciones = 0
    total_existentes = 0
    
    for estudiante in estudiantes:
        if not estudiante.carrera:
            continue
        
        # Obtener materias de la carrera del estudiante
        materias_carrera = Materia.objects.filter(carrera=estudiante.carrera)
        
        # Seleccionar entre 5 y 6 materias aleatorias
        num_materias = random.randint(5, 6)
        materias_seleccionadas = random.sample(list(materias_carrera), min(num_materias, len(materias_carrera)))
        
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
                    'fecha_inscripcion': timezone.now() - timedelta(days=random.randint(1, 20))
                }
            )
            
            if created:
                total_inscripciones += 1
            else:
                total_existentes += 1
        
        if total_inscripciones % 100 == 0 and total_inscripciones > 0:
            print(f"  ✓ {total_inscripciones} inscripciones procesadas...")
    
    print(f"\n✓ Total: {total_inscripciones} inscripciones creadas, {total_existentes} ya existían")
    return total_inscripciones


def generar_notas_historicas():
    """Genera notas históricas para períodos 2025-1 y 2025-2 con 20% de reprobaciones"""
    print("\n" + "="*60)
    print("GENERANDO NOTAS HISTÓRICAS (PERÍODOS 2025-1 Y 2025-2)")
    print("="*60)
    
    periodos_historicos = PeriodoLectivo.objects.filter(codigo__in=['2025-1', '2025-2'])
    estudiantes = Usuario.objects.filter(rol='estudiante')
    
    total_inscripciones_historicas = 0
    total_aprobadas = 0
    total_reprobadas = 0
    
    for periodo in periodos_historicos:
        print(f"\nProcesando período {periodo.codigo}...")
        print("-" * 50)
        
        inscripciones_periodo = 0
        
        for estudiante in estudiantes:
            if not estudiante.carrera:
                continue
            
            # Inscribir en 4-5 materias por período histórico
            materias_carrera = Materia.objects.filter(carrera=estudiante.carrera)
            num_materias = random.randint(4, 5)
            materias_seleccionadas = random.sample(list(materias_carrera), min(num_materias, len(materias_carrera)))
            
            for materia in materias_seleccionadas:
                # Obtener o crear sección para este período histórico
                seccion, _ = Seccion.objects.get_or_create(
                    materia=materia,
                    periodo=periodo,
                    codigo_seccion='S1',
                    defaults={
                        'dia': random.choice(['LU', 'MA', 'MI', 'JU', 'VI']),
                        'hora_inicio': '08:00',
                        'hora_fin': '10:00',
                        'aula': 'A-101',
                        'cupo_maximo': 30
                    }
                )
                
                # Asignar profesor aleatorio si no tiene
                if not seccion.profesor:
                    profesor = Usuario.objects.filter(rol='profesor').order_by('?').first()
                    if profesor:
                        seccion.profesor = profesor
                        seccion.save()
                
                # Crear inscripción histórica
                inscripcion, created = Inscripcion.objects.get_or_create(
                    estudiante=estudiante,
                    seccion=seccion,
                    defaults={
                        'fecha_inscripcion': timezone.make_aware(
                            datetime.combine(periodo.fecha_inicio, datetime.min.time())
                        ) + timedelta(days=random.randint(1, 10))
                    }
                )
                
                if not created:
                    continue
                
                # Generar nota (20% de probabilidad de reprobar)
                es_reprobado = random.random() < 0.20
                
                if es_reprobado:
                    # Nota reprobada (entre 0 y 6.9)
                    nota = Decimal(str(round(random.uniform(2.0, 6.9), 2)))
                    estado = 'reprobado'
                    total_reprobadas += 1
                else:
                    # Nota aprobada (entre 7.0 y 10.0)
                    nota = Decimal(str(round(random.uniform(7.0, 10.0), 2)))
                    estado = 'aprobado'
                    total_aprobadas += 1
                
                inscripcion.nota_final = nota
                inscripcion.estado = estado
                inscripcion.nota_puesta_por = seccion.profesor
                inscripcion.fecha_nota_puesta = timezone.now() - timedelta(days=random.randint(30, 180))
                inscripcion.save()
                
                inscripciones_periodo += 1
        
        print(f"  ✓ {inscripciones_periodo} inscripciones con notas generadas")
        total_inscripciones_historicas += inscripciones_periodo
    
    porcentaje_reprobadas = (total_reprobadas / (total_aprobadas + total_reprobadas) * 100) if total_aprobadas + total_reprobadas > 0 else 0
    
    print(f"\n✓ Total inscripciones históricas: {total_inscripciones_historicas}")
    print(f"  - Aprobadas: {total_aprobadas}")
    print(f"  - Reprobadas: {total_reprobadas} ({porcentaje_reprobadas:.1f}%)")
    
    return total_inscripciones_historicas


def generar_pagos():
    """Genera registros de pago: 80% pagados, 20% pendientes (morosos)"""
    print("\n" + "="*60)
    print("GENERANDO REGISTROS DE PAGO")
    print("="*60)
    
    # Obtener todas las inscripciones del período actual
    periodo_actual = PeriodoLectivo.objects.get(codigo='2026-1')
    inscripciones = Inscripcion.objects.filter(seccion__periodo=periodo_actual)
    
    tesoreros = list(Usuario.objects.filter(rol='tesorero'))
    if not tesoreros:
        # Si no hay tesoreros, crear uno temporal
        tesorero = Usuario.objects.filter(rol='tesorero').first()
        if not tesorero:
            print("  ! No hay tesoreros disponibles. Los pagos se registrarán sin procesador.")
            tesorero = None
    else:
        tesorero = None
    
    total_pagados = 0
    total_pendientes = 0
    metodos_pago = ['efectivo', 'transferencia', 'tarjeta', 'cheque']
    
    for inscripcion in inscripciones:
        # Verificar si ya tiene pago
        if hasattr(inscripcion, 'pago'):
            continue
        
        # 80% de probabilidad de estar pagado
        esta_pagado = random.random() < 0.80
        
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
            procesador = random.choice(tesoreros) if tesoreros else tesorero
            
            Pago.objects.create(
                inscripcion=inscripcion,
                monto=monto_final,
                metodo_pago=random.choice(metodos_pago),
                comprobante=f"COMP-{random.randint(10000, 99999)}",
                procesado_por=procesador,
                fecha_pago=timezone.now() - timedelta(days=random.randint(1, 15))
            )
            total_pagados += 1
        else:
            # Dejar sin pago (pendiente/moroso)
            total_pendientes += 1
    
    total = total_pagados + total_pendientes
    porcentaje_pagados = (total_pagados / total * 100) if total > 0 else 0
    porcentaje_pendientes = (total_pendientes / total * 100) if total > 0 else 0
    
    print(f"\n✓ Pagos procesados:")
    print(f"  - Pagados: {total_pagados} ({porcentaje_pagados:.1f}%)")
    print(f"  - Pendientes: {total_pendientes} ({porcentaje_pendientes:.1f}%)")
    print(f"  - Total: {total}")
    
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
        else:
            estudiantes_al_dia.append(estudiante)
    
    print(f"\n✓ Estudiantes al día: {len(estudiantes_al_dia)}")
    print(f"✓ Estudiantes en mora: {len(estudiantes_morosos)}")
    
    if estudiantes_morosos:
        print(f"\nEjemplos de estudiantes morosos (primeros 5):")
        for est in estudiantes_morosos[:5]:
            print(f"  - {est.username}: Deuda ${est.deuda_total}")


def main():
    """Función principal"""
    print("\n" + "█"*60)
    print("SCRIPT 4: SIMULACIÓN DE ACTIVIDAD ACADÉMICA Y FINANCIERA")
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