"""
Router de Dashboards
Endpoints para Director, Tesorero y Profesor
REFERENCIA DJANGO: views.py líneas 31-288
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from decimal import Decimal
from datetime import datetime
import logging

from auth.dependencies import require_roles, get_current_user
from database import get_db
from services.calculos_financieros import calcular_en_mora, calcular_deuda_total, calcular_deuda_vencida

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboards",
    tags=["Dashboards"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido - Rol no permitido"},
    }
)


# ================================================================
# 1. DASHBOARD INSTITUCIONAL (DIRECTOR / COORDINADOR)
# ================================================================

@router.get(
    "/institucional",
    summary="Dashboard Institucional",
    description="""
    Dashboard completo para Director y Coordinador.
    
    Métricas incluidas:
    - Total de estudiantes y profesores
    - Estudiantes por carrera (para gráficas)
    - Materias totales
    - Promedio institucional de notas
    - Ingresos totales recaudados
    - Lista de alumnos en mora con deudas calculadas
    """
)
async def dashboard_institucional(
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'coordinador', 'administrativo']))
) -> Dict[str, Any]:
    """
    Dashboard para Director y Coordinador
    
    REFERENCIA DJANGO: views.py - metricas_institucionales (líneas 31-109)
    """
    logger.info(f"📊 Dashboard institucional solicitado por: {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # ---- DATOS BÁSICOS CON AGREGACIONES SQL ----
            
            # Total estudiantes
            cur.execute("SELECT COUNT(*) as total FROM public.usuarios WHERE rol = 'estudiante'")
            total_estudiantes = cur.fetchone()['total']
            
            # Total profesores
            cur.execute("SELECT COUNT(*) as total FROM public.usuarios WHERE rol = 'profesor'")
            total_profesores = cur.fetchone()['total']
            
            # Total materias
            cur.execute("SELECT COUNT(*) as total FROM public.materias")
            materias_totales = cur.fetchone()['total']
            
            # ---- PROMEDIO INSTITUCIONAL ----
            cur.execute("""
                SELECT AVG(nota_final) as promedio 
                FROM public.inscripciones 
                WHERE nota_final IS NOT NULL
            """)
            result = cur.fetchone()
            promedio_institucional = float(result['promedio'] or 0)
            
            # ---- INGRESOS TOTALES ----
            cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM public.pagos")
            result = cur.fetchone()
            ingresos_totales = float(result['total'])
            
            # ---- ESTUDIANTES POR CARRERA (Para gráfica) ----
            cur.execute("""
                SELECT 
                    c.nombre,
                    COUNT(u.id) as num_alumnos
                FROM public.carreras c
                LEFT JOIN public.usuarios u ON u.carrera_id = c.id AND u.rol = 'estudiante'
                GROUP BY c.id, c.nombre
                ORDER BY num_alumnos DESC
            """)
            estudiantes_por_carrera = [dict(row) for row in cur.fetchall()]
            
            # ---- ALUMNOS EN MORA (Con cálculos financieros reales) ----
            # Obtener estudiantes con inscripciones pendientes
            cur.execute("""
                SELECT DISTINCT 
                    u.id, u.username, u.first_name, u.last_name,
                    u.carrera_id, u.es_becado, u.porcentaje_beca,
                    u.convenio_activo, u.fecha_limite_convenio
                FROM public.usuarios u
                JOIN public.inscripciones i ON i.estudiante_id = u.id
                WHERE u.rol = 'estudiante' 
                AND i.pago_id IS NULL
            """)
            
            estudiantes_con_deuda = cur.fetchall()
            alumnos_mora = []
            
            # Obtener período actual para cálculos
            cur.execute("""
                SELECT * FROM public.periodos_lectivos 
                WHERE activo = true 
                ORDER BY fecha_inicio DESC 
                LIMIT 1
            """)
            periodo_actual = cur.fetchone()
            
            # Calcular deuda para cada estudiante
            for est in estudiantes_con_deuda:
                est_dict = dict(est)
                
                # Obtener inscripciones pendientes del estudiante
                cur.execute("""
                    SELECT i.*, s.id as seccion_id
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    WHERE i.estudiante_id = %s AND i.pago_id IS NULL
                """, (est_dict['id'],))
                
                inscripciones = [dict(row) for row in cur.fetchall()]
                
                # Calcular en_mora usando la función de services
                en_mora = calcular_en_mora(est_dict, inscripciones, dict(periodo_actual) if periodo_actual else None, conn)
                
                # Calcular deuda total
                deuda = calcular_deuda_total(est_dict, inscripciones, conn)
                
                alumnos_mora.append({
                    'id': est_dict['id'],
                    'username': est_dict['username'],
                    'nombre_completo': f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip() or est_dict['username'],
                    'nombre': f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip() or est_dict['username'],
                    'deuda_total': str(deuda),
                    'en_mora': en_mora
                })
            
            cur.close()
        
        respuesta = {
            "total_estudiantes": total_estudiantes,
            "total_profesores": total_profesores,
            "materias_totales": materias_totales,
            "promedio_institucional": round(promedio_institucional, 2),
            "ingresos_totales": ingresos_totales,
            "estudiantes_por_carrera": estudiantes_por_carrera,
            "alumnos_mora": alumnos_mora
        }
        
        logger.info(f"✅ Dashboard institucional generado: {total_estudiantes} estudiantes, {len(alumnos_mora)} en mora")
        
        return respuesta
        
    except Exception as e:
        logger.error(f"❌ Error en dashboard institucional: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando dashboard: {str(e)}"
        )


# ================================================================
# 2. DASHBOARD DE FINANZAS (TESORERO)
# ================================================================

@router.get(
    "/finanzas",
    summary="Dashboard de Tesorería",
    description="""
    Dashboard financiero para Tesorero.
    
    Métricas financieras:
    - Ingreso proyectado vs real
    - Tasa de cobranza (%)
    - Listado de cobranza con estados de mora
    """
)
async def dashboard_finanzas(
    current_user: Dict[str, Any] = Depends(require_roles(['tesorero']))
) -> Dict[str, Any]:
    """
    Dashboard de Tesorería
    
    REFERENCIA DJANGO: views.py - dashboard_finanzas (líneas 112-186)
    """
    logger.info(f"💰 Dashboard de finanzas solicitado por: {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # ---- CALCULAR INGRESO PROYECTADO ----
            # Obtener todos los estudiantes con sus carreras
            cur.execute("""
                SELECT 
                    u.id, u.es_becado, u.porcentaje_beca, u.carrera_id,
                    c.precio_credito
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE u.rol = 'estudiante'
            """)
            estudiantes = cur.fetchall()
            
            total_proyectado = Decimal('0.00')
            
            for est in estudiantes:
                est_dict = dict(est)
                
                # Obtener inscripciones pendientes del estudiante
                cur.execute("""
                    SELECT i.id, s.id as seccion_id
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    WHERE i.estudiante_id = %s AND i.pago_id IS NULL
                """, (est_dict['id'],))
                
                inscripciones_pendientes = cur.fetchall()
                
                for insc in inscripciones_pendientes:
                    # Obtener créditos de la materia
                    cur.execute("""
                        SELECT m.creditos
                        FROM public.secciones s
                        JOIN public.materias m ON s.materia_id = m.id
                        WHERE s.id = %s
                    """, (insc['seccion_id'],))
                    
                    result = cur.fetchone()
                    if not result:
                        continue
                    
                    creditos = Decimal(str(result['creditos']))
                    precio_credito = Decimal(str(est_dict.get('precio_credito', 50)))
                    costo = creditos * precio_credito
                    
                    # Aplicar beca
                    if est_dict.get('es_becado') and est_dict.get('porcentaje_beca', 0) > 0:
                        porcentaje = Decimal(str(est_dict['porcentaje_beca']))
                        descuento = costo * (porcentaje / Decimal('100'))
                        costo -= descuento
                    
                    total_proyectado += costo
            
            # ---- INGRESO REAL ----
            cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM public.pagos")
            result = cur.fetchone()
            ingreso_real = Decimal(str(result['total'] or 0))
            
            # ---- TASA DE COBRANZA ----
            tasa_cobranza = Decimal('0.00')
            if total_proyectado > 0:
                tasa_cobranza = (ingreso_real / total_proyectado) * Decimal('100')
            
            # ---- LISTADO DE COBRANZA ----
            # Obtener período actual para cálculos de mora
            cur.execute("""
                SELECT * FROM public.periodos_lectivos 
                WHERE activo = true 
                ORDER BY fecha_inicio DESC 
                LIMIT 1
            """)
            periodo_actual = cur.fetchone()
            
            cur.execute("""
                SELECT 
                    u.id, u.username, u.first_name, u.last_name,
                    u.es_becado, u.porcentaje_beca, u.carrera_id
                FROM public.usuarios u
                WHERE u.rol = 'estudiante'
                LIMIT 50
            """)
            
            estudiantes_cobranza = cur.fetchall()
            listado_cobranza = []
            
            for est in estudiantes_cobranza:
                est_dict = dict(est)
                
                # Obtener inscripciones
                cur.execute("""
                    SELECT i.*, s.id as seccion_id
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    WHERE i.estudiante_id = %s AND i.pago_id IS NULL
                """, (est_dict['id'],))
                
                inscripciones = [dict(row) for row in cur.fetchall()]
                
                # Calcular deuda y mora
                deuda = calcular_deuda_total(est_dict, inscripciones, conn)
                
                if deuda > 0:  # Solo incluir si tiene deuda
                    en_mora = calcular_en_mora(
                        est_dict, 
                        inscripciones, 
                        dict(periodo_actual) if periodo_actual else None, 
                        conn
                    )
                    
                    listado_cobranza.append({
                        'id': est_dict['id'],
                        'username': est_dict['username'],
                        'nombre_completo': f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip() or est_dict['username'],
                        'en_mora': en_mora,
                        'deuda_total': float(deuda)
                    })
            
            cur.close()
        
        respuesta = {
            "ingreso_proyectado": float(total_proyectado),
            "ingreso_real": float(ingreso_real),
            "tasa_cobranza": float(tasa_cobranza),
            "listado_cobranza": listado_cobranza
        }
        
        logger.info(f"✅ Dashboard finanzas generado: ${float(ingreso_real):.2f} recaudado, {len(listado_cobranza)} en cobranza")
        
        return respuesta
        
    except Exception as e:
        logger.error(f"❌ Error en dashboard finanzas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando dashboard: {str(e)}"
        )


# ================================================================
# 3. DASHBOARD DE PROFESOR
# ================================================================

@router.get(
    "/profesor",
    summary="Dashboard de Profesor",
    description="""
    Dashboard para profesores.
    
    Muestra:
    - Secciones asignadas
    - Total de alumnos
    - Promedio de rendimiento
    """
)
async def dashboard_profesor(
    current_user: Dict[str, Any] = Depends(require_roles(['profesor']))
) -> Dict[str, Any]:
    """
    Dashboard para Profesores
    
    REFERENCIA DJANGO: views.py - dashboard_profesor (líneas 252-288)
    """
    logger.info(f"👨‍🏫 Dashboard profesor solicitado por: {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            profesor_id = current_user['id']
            
            # ---- SECCIONES DEL PROFESOR ----
            cur.execute("""
                SELECT 
                    s.id,
                    s.codigo_seccion,
                    s.aula,
                    s.dia,
                    s.hora_inicio,
                    s.hora_fin,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    p.nombre as periodo_nombre,
                    p.codigo as periodo_codigo
                FROM public.secciones s
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                WHERE s.profesor_id = %s
                ORDER BY p.codigo DESC, m.nombre
            """, (profesor_id,))
            
            secciones_raw = cur.fetchall()
            
            # ---- ESTADÍSTICAS ----
            # Total de alumnos en todas las secciones
            cur.execute("""
                SELECT COUNT(*) as total
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE s.profesor_id = %s
            """, (profesor_id,))
            
            total_alumnos = cur.fetchone()['total']
            
            # Promedio de notas
            cur.execute("""
                SELECT AVG(nota_final) as promedio
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                WHERE s.profesor_id = %s AND i.nota_final IS NOT NULL
            """, (profesor_id,))
            
            result = cur.fetchone()
            promedio_grupal = float(result['promedio'] or 0)
            
            # ---- PROCESAR SECCIONES ----
            mis_clases = []
            for sec in secciones_raw:
                sec_dict = dict(sec)
                
                # Contar alumnos en esta sección
                cur.execute(
                    "SELECT COUNT(*) as total FROM public.inscripciones WHERE seccion_id = %s",
                    (sec_dict['id'],)
                )
                alumnos_count = cur.fetchone()['total']
                
                # Formatear horario
                dias_map = {
                    'LU': 'Lunes', 'MA': 'Martes', 'MI': 'Miércoles',
                    'JU': 'Jueves', 'VI': 'Viernes', 'SA': 'Sábado'
                }
                dia_nombre = dias_map.get(sec_dict['dia'], sec_dict['dia'])
                horario = f"{dia_nombre} {sec_dict['hora_inicio'].strftime('%H:%M')}-{sec_dict['hora_fin'].strftime('%H:%M')}"
                
                mis_clases.append({
                    'id': sec_dict['id'],
                    'materia': sec_dict['materia_nombre'],
                    'codigo': sec_dict['codigo_seccion'],
                    'aula': sec_dict['aula'],
                    'alumnos_inscritos': alumnos_count,
                    'horario': horario,
                    'periodo': f"{sec_dict['periodo_nombre']} ({sec_dict['periodo_codigo']})"
                })
            
            cur.close()
        
        respuesta = {
            "stats": {
                "secciones_activas": len(secciones_raw),
                "total_alumnos": total_alumnos,
                "rendimiento_promedio": round(promedio_grupal, 2)
            },
            "mis_clases": mis_clases
        }
        
        logger.info(f"✅ Dashboard profesor generado: {len(mis_clases)} secciones, {total_alumnos} alumnos")
        
        return respuesta
        
    except Exception as e:
        logger.error(f"❌ Error en dashboard profesor: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando dashboard: {str(e)}"
        )


# ================================================================
# 4. RESUMEN RÁPIDO (PARA HEADER/NAV)
# ================================================================

@router.get(
    "/resumen",
    summary="Resumen rápido del sistema",
    description="Datos básicos para mostrar en headers o navegación"
)
async def resumen_sistema(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Resumen rápido accesible por todos los usuarios autenticados
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            resumen = {
                "usuario": {
                    "id": current_user['id'],
                    "nombre": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
                    "rol": current_user['rol']
                }
            }
            
            # Si es estudiante, agregar estado financiero
            if current_user['rol'] == 'estudiante':
                cur.execute("""
                    SELECT * FROM public.periodos_lectivos 
                    WHERE activo = true 
                    ORDER BY fecha_inicio DESC 
                    LIMIT 1
                """)
                periodo_actual = cur.fetchone()
                
                cur.execute("""
                    SELECT i.*, s.id as seccion_id
                    FROM public.inscripciones i
                    JOIN public.secciones s ON i.seccion_id = s.id
                    WHERE i.estudiante_id = %s AND i.pago_id IS NULL
                """, (current_user['id'],))
                
                inscripciones = [dict(row) for row in cur.fetchall()]
                
                deuda = calcular_deuda_total(current_user, inscripciones, conn)
                en_mora = calcular_en_mora(
                    current_user,
                    inscripciones,
                    dict(periodo_actual) if periodo_actual else None,
                    conn
                )
                
                resumen["estado_financiero"] = {
                    "deuda_total": float(deuda),
                    "en_mora": en_mora,
                    "inscripciones_pendientes": len(inscripciones)
                }
            
            cur.close()
            
            return resumen
            
    except Exception as e:
        logger.error(f"❌ Error en resumen: {e}")
        return {
            "usuario": {
                "id": current_user['id'],
                "nombre": current_user.get('username'),
                "rol": current_user['rol']
            },
            "error": str(e)
        }
