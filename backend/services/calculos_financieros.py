"""
Lógica de cálculos financieros
Migrado desde Django models.py líneas 113-231
Usa Decimal para precisión financiera
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, date
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

# Constantes
NOTA_APROBACION = Decimal('7.0')
PRECIO_CREDITO_DEFAULT = Decimal('50.00')
DIAS_GRACIA_DEFAULT = 15


async def calcular_en_mora(
    estudiante: Dict[str, Any],
    inscripciones: List[Dict[str, Any]],
    periodo_actual: Optional[Dict[str, Any]],
    conn
) -> bool:
    """
    Determina si un estudiante está en mora según las 3 reglas de negocio
    
    REFERENCIA DJANGO: models.py líneas 113-173 (property en_mora)
    
    REGLAS DE MORA:
    1. Si tiene convenio activo y vigente → NO mora (independientemente de deuda)
    2. Inscripciones de períodos ANTERIORES sin pagar → MORA INMEDIATA
    3. Inscripciones del período ACTUAL → Verificar días de gracia
    
    Args:
        estudiante: Diccionario con datos del estudiante
        inscripciones: Lista de inscripciones del estudiante
        periodo_actual: Período lectivo activo (puede ser None)
        conn: Conexión a base de datos PostgreSQL
    
    Returns:
        bool: True si está en mora, False si no
    """
    # Solo estudiantes pueden estar en mora
    if estudiante.get('rol') != 'estudiante':
        return False
    
    # ==========================================
    # REGLA 1: Convenio activo y vigente
    # ==========================================
    # Si tiene convenio activo y aún está vigente, NO está en mora
    # Esto protege al estudiante aunque tenga deuda
    if estudiante.get('convenio_activo'):
        fecha_limite_convenio = estudiante.get('fecha_limite_convenio')
        
        if fecha_limite_convenio:
            # Convertir a date si es string (formato ISO)
            if isinstance(fecha_limite_convenio, str):
                fecha_limite = datetime.fromisoformat(fecha_limite_convenio.replace('Z', '+00:00')).date()
            elif isinstance(fecha_limite_convenio, datetime):
                fecha_limite = fecha_limite_convenio.date()
            else:
                fecha_limite = fecha_limite_convenio
            
            # Si el convenio aún está vigente (fecha límite >= hoy)
            if fecha_limite >= date.today():
                logger.info(f"✅ Estudiante {estudiante.get('cedula')} protegido por convenio hasta {fecha_limite}")
                return False  # NO está en mora
    
    # Si no hay inscripciones, no hay mora
    if not inscripciones:
        return False
    
    # Filtrar inscripciones sin pagar
    inscripciones_pendientes = [i for i in inscripciones if not i.get('pago_id')]
    
    if not inscripciones_pendientes:
        return False  # No tiene deuda
    
    # Si no hay período actual definido, usar lógica simple
    if not periodo_actual:
        logger.warning("⚠️ No hay período actual definido, usando lógica simple de mora")
        return len(inscripciones_pendientes) > 0
    
    # Obtener fechas del período actual
    try:
        if isinstance(periodo_actual['fecha_inicio'], str):
            fecha_inicio_actual = datetime.fromisoformat(periodo_actual['fecha_inicio'].replace('Z', '+00:00')).date()
        else:
            fecha_inicio_actual = periodo_actual['fecha_inicio']
    except Exception as e:
        logger.error(f"❌ Error parseando fecha de período: {e}")
        return False
    
    # ==========================================
    # REGLA 2: Períodos anteriores sin pagar
    # ==========================================
    # Si debe inscripciones de períodos que ya terminaron → MORA INMEDIATA
    for insc in inscripciones_pendientes:
        try:
            result = await conn.fetchrow(
                """
                SELECT pl.fecha_fin 
                FROM public.secciones s
                JOIN public.periodos_lectivos pl ON s.periodo_id = pl.id
                WHERE s.id = $1
                """,
                insc['seccion_id'],
            )
            if not result:
                continue

            fecha_fin_periodo = result['fecha_fin']
            if isinstance(fecha_fin_periodo, str):
                fecha_fin_periodo = datetime.fromisoformat(fecha_fin_periodo.replace('Z', '+00:00')).date()
            elif isinstance(fecha_fin_periodo, datetime):
                fecha_fin_periodo = fecha_fin_periodo.date()

            if fecha_fin_periodo < fecha_inicio_actual:
                logger.info(f"🚫 Estudiante {estudiante.get('cedula')} en mora: deuda de período anterior")
                return True

        except Exception as e:
            logger.error(f"❌ Error verificando período de inscripción {insc.get('id')}: {e}")
            continue

    # ==========================================
    # REGLA 3: Período actual + días de gracia
    # ==========================================
    dias_gracia = DIAS_GRACIA_DEFAULT
    if estudiante.get('carrera_id'):
        try:
            result = await conn.fetchrow(
                "SELECT dias_gracia_pago FROM public.carreras WHERE id = $1",
                estudiante['carrera_id'],
            )
            if result and result.get('dias_gracia_pago'):
                dias_gracia = result['dias_gracia_pago']
        except Exception as e:
            logger.warning(f"⚠️ Error obteniendo días de gracia, usando default: {e}")
    
    # Calcular fecha límite de pago (hoy - días de gracia)
    fecha_limite_gracia = datetime.now() - timedelta(days=dias_gracia)
    
    for insc in inscripciones_pendientes:
        try:
            result = await conn.fetchrow(
                "SELECT periodo_id FROM public.secciones WHERE id = $1",
                insc['seccion_id'],
            )
            if not result or result['periodo_id'] != periodo_actual['id']:
                continue

            fecha_inscripcion = insc.get('fecha_inscripcion')
            if not fecha_inscripcion:
                continue

            if isinstance(fecha_inscripcion, str):
                fecha_inscripcion = datetime.fromisoformat(fecha_inscripcion.replace('Z', '+00:00'))

            if fecha_inscripcion < fecha_limite_gracia:
                logger.info(f"🚫 Estudiante {estudiante.get('cedula')} en mora: superó días de gracia")
                return True

        except Exception as e:
            logger.error(f"❌ Error verificando gracia de inscripción {insc.get('id')}: {e}")
            continue

    return False


async def calcular_deuda_total(
    estudiante: Dict[str, Any],
    inscripciones: List[Dict[str, Any]],
    conn
) -> Decimal:
    """
    Calcula la deuda total del estudiante (todas las inscripciones sin pagar)
    Aplica descuentos por beca si corresponde
    
    REFERENCIA DJANGO: models.py líneas 175-197 (property deuda_total)
    
    Fórmula:
        costo = créditos × precio_crédito
        si es_becado:
            descuento = costo × (porcentaje_beca / 100)
            costo -= descuento
    
    Args:
        estudiante: Diccionario con datos del estudiante
        inscripciones: Lista de inscricciones (con o sin pago)
        conn: Conexión a base de datos
    
    Returns:
        Decimal: Monto total de deuda (2 decimales)
    """
    # Solo estudiantes tienen deuda
    if estudiante.get('rol') != 'estudiante':
        return Decimal('0.00')
    
    # Filtrar inscripciones sin pagar
    inscripciones_pendientes = [i for i in inscripciones if not i.get('pago_id')]
    
    if not inscripciones_pendientes:
        return Decimal('0.00')
    
    total = Decimal('0.00')

    precio_credito = PRECIO_CREDITO_DEFAULT
    if estudiante.get('carrera_id'):
        try:
            result = await conn.fetchrow(
                "SELECT precio_credito FROM public.carreras WHERE id = $1",
                estudiante['carrera_id'],
            )
            if result and result.get('precio_credito'):
                precio_credito = Decimal(str(result['precio_credito']))
        except Exception as e:
            logger.warning(f"⚠️ Error obteniendo precio de crédito: {e}")

    for insc in inscripciones_pendientes:
        try:
            result = await conn.fetchrow(
                """
                SELECT m.creditos 
                FROM public.secciones s
                JOIN public.materias m ON s.materia_id = m.id
                WHERE s.id = $1
                """,
                insc['seccion_id'],
            )
            if not result:
                continue

            creditos = Decimal(str(result['creditos']))
            costo_materia = creditos * precio_credito
            
            # Aplicar descuento por beca
            if estudiante.get('es_becado') and estudiante.get('porcentaje_beca', 0) > 0:
                porcentaje_beca = Decimal(str(estudiante['porcentaje_beca']))
                descuento = costo_materia * (porcentaje_beca / Decimal('100'))
                costo_materia -= descuento
                logger.debug(f"💰 Beca aplicada: {porcentaje_beca}% = ${descuento}")
            
            total += costo_materia

        except Exception as e:
            logger.error(f"❌ Error calculando costo de inscripción {insc.get('id')}: {e}")
            continue

    return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


async def calcular_deuda_vencida(
    estudiante: Dict[str, Any],
    inscripciones: List[Dict[str, Any]],
    periodo_actual: Optional[Dict[str, Any]],
    conn
) -> Decimal:
    """
    Calcula solo la deuda que ya superó el período de gracia
    
    REFERENCIA DJANGO: models.py líneas 199-218 (property deuda_vencida)
    
    Incluye:
    - Deuda de períodos anteriores (ya cerrados)
    - Deuda del período actual que ya venció los días de gracia
    
    Args:
        estudiante: Diccionario con datos del estudiante
        inscripciones: Lista de inscripciones
        periodo_actual: Período lectivo activo
        conn: Conexión a base de datos
    
    Returns:
        Decimal: Monto de deuda vencida (2 decimales)
    """
    if estudiante.get('rol') != 'estudiante':
        return Decimal('0.00')
    
    inscripciones_pendientes = [i for i in inscripciones if not i.get('pago_id')]
    
    if not inscripciones_pendientes:
        return Decimal('0.00')
    
    if not periodo_actual:
        return await calcular_deuda_total(estudiante, inscripciones, conn)

    total = Decimal('0.00')

    try:
        fecha_inicio_actual = periodo_actual['fecha_inicio']
        if isinstance(fecha_inicio_actual, str):
            fecha_inicio_actual = datetime.fromisoformat(fecha_inicio_actual.replace('Z', '+00:00')).date()
        elif isinstance(fecha_inicio_actual, datetime):
            fecha_inicio_actual = fecha_inicio_actual.date()
    except Exception as e:
        logger.error(f"❌ Error parseando fecha de período: {e}")
        return await calcular_deuda_total(estudiante, inscripciones, conn)

    dias_gracia = DIAS_GRACIA_DEFAULT
    if estudiante.get('carrera_id'):
        try:
            result = await conn.fetchrow(
                "SELECT dias_gracia_pago FROM public.carreras WHERE id = $1",
                estudiante['carrera_id'],
            )
            if result and result.get('dias_gracia_pago'):
                dias_gracia = result['dias_gracia_pago']
        except Exception as e:
            logger.warning(f"⚠️ Error obteniendo días de gracia: {e}")

    fecha_limite_gracia = datetime.now() - timedelta(days=dias_gracia)

    precio_credito = PRECIO_CREDITO_DEFAULT
    if estudiante.get('carrera_id'):
        try:
            result = await conn.fetchrow(
                "SELECT precio_credito FROM public.carreras WHERE id = $1",
                estudiante['carrera_id'],
            )
            if result and result.get('precio_credito'):
                precio_credito = Decimal(str(result['precio_credito']))
        except Exception as e:
            logger.warning(f"⚠️ Error obteniendo precio de crédito: {e}")

    for insc in inscripciones_pendientes:
        try:
            result = await conn.fetchrow(
                """
                SELECT s.periodo_id, m.creditos, pl.fecha_fin
                FROM public.secciones s
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos pl ON s.periodo_id = pl.id
                WHERE s.id = $1
                """,
                insc['seccion_id'],
            )
            if not result:
                continue
            
            periodo_id = result['periodo_id']
            creditos = Decimal(str(result['creditos']))
            fecha_fin_periodo = result['fecha_fin']
            
            if isinstance(fecha_fin_periodo, str):
                fecha_fin_periodo = datetime.fromisoformat(fecha_fin_periodo.replace('Z', '+00:00')).date()
            elif isinstance(fecha_fin_periodo, datetime):
                fecha_fin_periodo = fecha_fin_periodo.date()
            
            # Determinar si está vencida
            esta_vencida = False
            
            if periodo_id != periodo_actual['id']:
                # Período anterior
                if fecha_fin_periodo < fecha_inicio_actual:
                    esta_vencida = True
            else:
                # Período actual - verificar días de gracia
                fecha_inscripcion = insc.get('fecha_inscripcion')
                if fecha_inscripcion:
                    if isinstance(fecha_inscripcion, str):
                        fecha_inscripcion = datetime.fromisoformat(fecha_inscripcion.replace('Z', '+00:00'))
                    
                    if fecha_inscripcion < fecha_limite_gracia:
                        esta_vencida = True
            
            if esta_vencida:
                costo = creditos * precio_credito
                
                # Aplicar beca
                if estudiante.get('es_becado') and estudiante.get('porcentaje_beca', 0) > 0:
                    porcentaje_beca = Decimal(str(estudiante['porcentaje_beca']))
                    descuento = costo * (porcentaje_beca / Decimal('100'))
                    costo -= descuento
                
                total += costo

        except Exception as e:
            logger.error(f"❌ Error calculando deuda vencida de inscripción {insc.get('id')}: {e}")
            continue

    return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calcular_costo_materia(
    creditos: int,
    precio_credito: Decimal,
    porcentaje_beca: int = 0
) -> Decimal:
    """
    Calcula el costo de una materia aplicando beca si corresponde
    
    Args:
        creditos: Número de créditos de la materia
        precio_credito: Precio por cada crédito
        porcentaje_beca: Porcentaje de descuento (0-100)
    
    Returns:
        Decimal: Costo final de la materia
    """
    costo_base = Decimal(str(creditos)) * precio_credito
    
    if porcentaje_beca > 0:
        descuento = costo_base * (Decimal(str(porcentaje_beca)) / Decimal('100'))
        costo_base -= descuento
    
    return costo_base.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
