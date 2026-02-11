"""
Router de Reportes PDF
Generación y descarga de documentos oficiales
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from auth.dependencies import require_roles, get_current_user
from database import get_db
from services.pdf_generator import (
    generar_estado_cuenta,
    generar_reporte_pagos,
    generar_certificado_inscripcion
)
from services.calculos_financieros import calcular_deuda_total, calcular_deuda_vencida, calcular_en_mora

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/reportes",
    tags=["Reportes PDF"],
    responses={
        401: {"description": "No autorizado"},
        403: {"description": "Prohibido"},
        404: {"description": "Recurso no encontrado"}
    }
)


# ================================================================
# 1. CERTIFICADO DE INSCRIPCIÓN
# ================================================================

@router.get(
    "/inscripcion/{inscripcion_id}",
    summary="Descargar certificado de inscripción",
    description="""
    Genera y descarga un certificado oficial de inscripción en PDF.
    
    **Contenido del certificado:**
    - Datos del estudiante
    - Información de la materia y sección
    - Período lectivo
    - Fecha de emisión
    - Firma digital autorizada
    
    **Permisos:**
    - El propio estudiante (su inscripción)
    - Director, Coordinador, Tesorero, Administrativo
    
    **Formato:** PDF profesional con diseño institucional
    """
)
async def certificado_inscripcion(
    inscripcion_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Genera certificado de inscripción en PDF
    """
    logger.info(f"📜 Certificado solicitado para inscripción {inscripcion_id} por {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Obtener datos de la inscripción
            cur.execute(
                """
                SELECT 
                    i.id,
                    i.fecha_inscripcion,
                    u.id as estudiante_id,
                    u.username as estudiante_username,
                    u.first_name as estudiante_first_name,
                    u.last_name as estudiante_last_name,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    s.codigo_seccion,
                    s.aula,
                    p.nombre as periodo_nombre,
                    p.codigo as periodo_codigo,
                    c.nombre as carrera_nombre,
                    c.codigo as carrera_codigo
                FROM public.inscripciones i
                JOIN public.usuarios u ON i.estudiante_id = u.id
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE i.id = %s
                """,
                (inscripcion_id,)
            )
            
            inscripcion = cur.fetchone()
            
            if not inscripcion:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inscripción no encontrada"
                )
            
            insc_dict = dict(inscripcion)
            
            # Verificar permisos
            puede_descargar = False
            
            if current_user['rol'] in ['director', 'coordinador', 'tesorero', 'administrativo']:
                puede_descargar = True
            elif current_user['id'] == insc_dict['estudiante_id']:
                puede_descargar = True
            
            if not puede_descargar:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permiso para descargar este certificado"
                )
            
            # Preparar datos para el PDF
            estudiante_data = {
                'id': insc_dict['estudiante_id'],
                'username': insc_dict['estudiante_username'],
                'first_name': insc_dict['estudiante_first_name'],
                'last_name': insc_dict['estudiante_last_name']
            }
            
            inscripcion_data = {
                'id': insc_dict['id'],
                'materia_nombre': insc_dict['materia_nombre'],
                'materia_codigo': insc_dict['materia_codigo'],
                'seccion_codigo': insc_dict['codigo_seccion'],
                'periodo_nombre': insc_dict['periodo_nombre'],
                'periodo_codigo': insc_dict['periodo_codigo'],
                'creditos': insc_dict['creditos'],
                'aula': insc_dict['aula']
            }
            
            carrera_data = {
                'nombre': insc_dict['carrera_nombre'] or 'N/A',
                'codigo': insc_dict['carrera_codigo'] or 'N/A'
            } if insc_dict.get('carrera_nombre') else None
            
            cur.close()
        
        # Generar PDF
        pdf_buffer = generar_certificado_inscripcion(
            estudiante_data,
            inscripcion_data,
            carrera_data
        )
        
        # Preparar nombre del archivo
        nombre_archivo = f"certificado_inscripcion_{inscripcion_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        logger.info(f"✅ Certificado generado: {nombre_archivo}")
        
        # Retornar como StreamingResponse
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={nombre_archivo}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generando certificado: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando certificado: {str(e)}"
        )


# ================================================================
# 2. ESTADO DE CUENTA
# ================================================================

@router.get(
    "/estado-cuenta/{estudiante_id}",
    summary="Descargar estado de cuenta en PDF",
    description="""
    Genera y descarga un estado de cuenta financiero en PDF.
    
    **Contenido del reporte:**
    - Datos completos del estudiante
    - Resumen financiero (deuda total, vencida, becas)
    - Detalle de todas las inscripciones (pagadas y pendientes)
    - Información de convenios activos
    - Tabla detallada con costos
    
    **Permisos:**
    - El propio estudiante (su estado de cuenta)
    - Director, Coordinador, Tesorero, Administrativo
    
    **Nota:** Si el estudiante está en mora, se incluye advertencia
    """
)
async def estado_cuenta_pdf(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Genera estado de cuenta en PDF
    
    REFERENCIA DJANGO: views.py - descargar_estado_cuenta (líneas 435-454)
    """
    logger.info(f"📊 Estado de cuenta solicitado para estudiante {estudiante_id} por {current_user['username']}")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Obtener datos del estudiante
            cur.execute(
                """
                SELECT 
                    u.id, u.username, u.email, u.first_name, u.last_name,
                    u.rol, u.carrera_id, u.es_becado, u.porcentaje_beca,
                    u.convenio_activo, u.fecha_limite_convenio,
                    c.nombre as carrera_nombre, c.codigo as carrera_codigo,
                    c.precio_credito, c.dias_gracia_pago
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE u.id = %s AND u.rol = 'estudiante'
                """,
                (estudiante_id,)
            )
            
            estudiante = cur.fetchone()
            
            if not estudiante:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Estudiante no encontrado"
                )
            
            est_dict = dict(estudiante)
            
            # Verificar permisos
            puede_descargar = False
            
            if current_user['rol'] in ['director', 'coordinador', 'tesorero', 'administrativo']:
                puede_descargar = True
            elif current_user['id'] == estudiante_id:
                puede_descargar = True
            
            if not puede_descargar:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tiene permiso para descargar este estado de cuenta"
                )
            
            # Obtener período actual
            cur.execute(
                """
                SELECT * FROM public.periodos_lectivos 
                WHERE activo = true 
                ORDER BY fecha_inicio DESC 
                LIMIT 1
                """
            )
            periodo_actual = cur.fetchone()
            
            # Obtener TODAS las inscripciones del estudiante
            cur.execute(
                """
                SELECT 
                    i.id,
                    i.nota_final,
                    i.estado,
                    i.fecha_inscripcion,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    s.codigo_seccion,
                    s.aula,
                    p.nombre as periodo_nombre,
                    CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.pagos pg ON i.pago_id = pg.id
                WHERE i.estudiante_id = %s
                ORDER BY p.codigo DESC, m.nombre
                """,
                (estudiante_id,)
            )
            
            inscripciones_raw = cur.fetchall()
            
            # Calcular métricas financieras
            inscripciones = []
            for row in inscripciones_raw:
                row_dict = dict(row)
                
                # Calcular costo de esta inscripción
                creditos = Decimal(str(row_dict['creditos']))
                precio_credito = Decimal(str(est_dict.get('precio_credito', 50)))
                costo = creditos * precio_credito
                
                # Aplicar beca si aplica
                if est_dict.get('es_becado') and est_dict.get('porcentaje_beca', 0) > 0:
                    porcentaje = Decimal(str(est_dict['porcentaje_beca']))
                    descuento = costo * (porcentaje / Decimal('100'))
                    costo -= descuento
                
                inscripciones.append({
                    'id': row_dict['id'],
                    'materia_nombre': row_dict['materia_nombre'],
                    'materia_codigo': row_dict['materia_codigo'],
                    'seccion_codigo': row_dict['codigo_seccion'],
                    'periodo_nombre': row_dict['periodo_nombre'],
                    'creditos': row_dict['creditos'],
                    'aula': row_dict['aula'],
                    'nota_final': float(row_dict['nota_final']) if row_dict['nota_final'] else None,
                    'estado': row_dict['estado'],
                    'pagado': row_dict['pagado'],
                    'costo': costo
                })
            
            # Calcular deudas
            inscripciones_para_calculo = [dict(row) for row in inscripciones_raw]
            deuda_total = calcular_deuda_total(est_dict, inscripciones_para_calculo, conn)
            deuda_vencida = calcular_deuda_vencida(
                est_dict,
                inscripciones_para_calculo,
                dict(periodo_actual) if periodo_actual else None,
                conn
            )
            
            cur.close()
        
        # Generar PDF
        pdf_buffer = generar_estado_cuenta(
            est_dict,
            inscripciones,
            deuda_total,
            deuda_vencida,
            {
                'nombre': est_dict.get('carrera_nombre'),
                'codigo': est_dict.get('carrera_codigo'),
                'dias_gracia_pago': est_dict.get('dias_gracia_pago', 15)
            }
        )
        
        # Preparar nombre del archivo
        nombre_estudiante = f"{est_dict.get('first_name', '')}_{est_dict.get('last_name', '')}".strip() or est_dict['username']
        nombre_archivo = f"estado_cuenta_{nombre_estudiante}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        logger.info(f"✅ Estado de cuenta generado: {nombre_archivo}")
        
        # Retornar como StreamingResponse
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={nombre_archivo}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generando estado de cuenta: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando estado de cuenta: {str(e)}"
        )


# ================================================================
# 3. REPORTE DE TESORERÍA
# ================================================================

@router.get(
    "/tesoreria",
    summary="Reporte de tesorería en PDF",
    description="""
    Genera un reporte financiero completo para el Director.
    
    **Contenido del reporte:**
    - Período del reporte (últimos 30 días por defecto)
    - Ingresos totales recaudados
    - Total de transacciones
    - Detalle de cada pago (estudiante, materia, monto, método)
    - Estadísticas por método de pago
    
    **Permisos:**
    - Solo Director y Tesorero
    
    **Uso:**
    Reporte mensual/quincenal para revisión financiera institucional
    """
)
async def reporte_tesoreria(
    dias: int = 30,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'tesorero']))
):
    """
    Genera reporte de tesorería en PDF
    """
    logger.info(f"💰 Reporte de tesorería solicitado por {current_user['username']} (últimos {días} días)")
    
    try:
        with get_db() as conn:
            cur = conn.cursor()
            
            # Calcular fechas
            fecha_fin = datetime.now()
            fecha_inicio = fecha_fin - timedelta(days=dias)
            
            # Obtener pagos del período
            cur.execute(
                """
                SELECT 
                    p.id,
                    p.monto,
                    p.metodo_pago,
                    p.fecha_pago,
                    p.comprobante,
                    u.username as estudiante_username,
                    u.first_name || ' ' || u.last_name as estudiante_nombre,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo
                FROM public.pagos p
                JOIN public.inscripciones i ON p.inscripcion_id = i.id
                JOIN public.usuarios u ON i.estudiante_id = u.id
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                WHERE p.fecha_pago >= %s AND p.fecha_pago <= %s
                ORDER BY p.fecha_pago DESC
                """,
                (fecha_inicio, fecha_fin)
            )
            
            pagos_raw = cur.fetchall()
            
            # Calcular total recaudado
            total_recaudado = Decimal('0.00')
            pagos = []
            
            for row in pagos_raw:
                row_dict = dict(row)
                monto = Decimal(str(row_dict['monto']))
                total_recaudado += monto
                
                pagos.append({
                    'fecha': row_dict['fecha_pago'].strftime('%d/%m/%Y %H:%M') if row_dict['fecha_pago'] else 'N/A',
                    'estudiante': row_dict['estudiante_nombre'] or row_dict['estudiante_username'],
                    'materia': row_dict['materia_nombre'],
                    'monto': monto,
                    'metodo': row_dict['metodo_pago'].capitalize()
                })
            
            # Estadísticas adicionales
            cur.execute(
                """
                SELECT 
                    metodo_pago,
                    COUNT(*) as cantidad,
                    SUM(monto) as total
                FROM public.pagos
                WHERE fecha_pago >= %s AND fecha_pago <= %s
                GROUP BY metodo_pago
                """,
                (fecha_inicio, fecha_fin)
            )
            
            metodos = cur.fetchall()
            
            cur.close()
        
        # Crear título personalizado
        titulo = f"Reporte de Tesorería - {dias} días"
        
        # Generar contenido adicional
        contenido = f"""
RESUMEN EJECUTIVO
================
Período: {fecha_inicio.strftime('%d/%m/%Y')} - {fecha_fin.strftime('%d/%m/%Y')}
Total de pagos: {len(pagos)}
Total recaudado: ${float(total_recaudado):.2f}

DESGLOSE POR MÉTODO DE PAGO:
"""
        
        for metodo in metodos:
            contenido += f"\n{metodo['metodo_pago'].capitalize()}: {metodo['cantidad']} pagos - ${float(metodo['total']):.2f}"
        
        # Generar PDF
        from io import BytesIO
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=10
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_LEFT
        )
        
        elements = []
        
        # Título
        elements.append(Paragraph("INFO CAMPUS", title_style))
        elements.append(Paragraph(titulo, styles['Heading2']))
        elements.append(Spacer(1, 12))
        
        # Período
        elements.append(Paragraph(
            f"<b>Período:</b> {fecha_inicio.strftime('%d/%m/%Y')} - {fecha_fin.strftime('%d/%m/%Y')}",
            normal_style
        ))
        elements.append(Spacer(1, 12))
        
        # Resumen
        elements.append(Paragraph("<b>RESUMEN</b>", header_style))
        
        resumen_data = [
            ['Concepto', 'Valor'],
            ['Total de Pagos', str(len(pagos))],
            ['Total Recaudado', f"${float(total_recaudado):.2f}"],
        ]
        
        resumen_table = Table(resumen_data, colWidths=[3*inch, 3.5*inch])
        resumen_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
        ]))
        
        elements.append(resumen_table)
        elements.append(Spacer(1, 20))
        
        # Desglose por método
        if metodos:
            elements.append(Paragraph("<b>DESGLOSE POR MÉTODO DE PAGO</b>", header_style))
            
            metodos_data = [['Método', 'Cantidad', 'Total']]
            for metodo in metodos:
                metodos_data.append([
                    metodo['metodo_pago'].capitalize(),
                    str(metodo['cantidad']),
                    f"${float(metodo['total']):.2f}"
                ])
            
            metodos_table = Table(metodos_data, colWidths=[3*inch, 1.5*inch, 2*inch])
            metodos_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
            ]))
            
            elements.append(metodos_table)
            elements.append(Spacer(1, 20))
        
        # Detalle de pagos
        if pagos:
            elements.append(Paragraph("<b>DETALLE DE PAGOS</b>", header_style))
            elements.append(Spacer(1, 6))
            
            # Solo mostrar primeros 50 pagos para no saturar
            pagos_mostrar = pagos[:50]
            
            pagos_data = [['Fecha', 'Estudiante', 'Materia', 'Monto', 'Método']]
            for pago in pagos_mostrar:
                pagos_data.append([
                    pago['fecha'],
                    pago['estudiante'][:25],  # Truncar si es muy largo
                    pago['materia'][:20],
                    f"${pago['monto']:.2f}",
                    pago['metodo']
                ])
            
            if len(pagos) > 50:
                pagos_data.append(['...', f'Y {len(pagos) - 50} pagos más', '', '', ''])
            
            pagos_table = Table(pagos_data, colWidths=[1.2*inch, 1.8*inch, 1.8*inch, 1*inch, 1.2*inch])
            pagos_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('TOPPADDING', (0, 1), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
                ('ALIGN', (0, 1), (1, -1), 'LEFT'),
                ('ALIGN', (-2, 1), (-2, -1), 'RIGHT'),
            ]))
            
            elements.append(pagos_table)
        
        # Pie de página
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("_" * 60, normal_style))
        elements.append(Paragraph(
            f"<para alignment='center' fontSize='8'>Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} por {current_user['username']}</para>",
            normal_style
        ))
        
        # Generar PDF
        doc.build(elements)
        buffer.seek(0)
        
        # Preparar nombre del archivo
        nombre_archivo = f"reporte_tesoreria_{dias}dias_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        logger.info(f"✅ Reporte de tesorería generado: {len(pagos)} pagos, ${float(total_recaudado):.2f}")
        
        # Retornar como StreamingResponse
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={nombre_archivo}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generando reporte de tesorería: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando reporte: {str(e)}"
        )
