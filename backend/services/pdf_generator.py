"""
Generador de PDFs
Usando ReportLab para documentos profesionales
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


def generar_estado_cuenta(
    estudiante: Dict[str, Any],
    inscripciones: List[Dict[str, Any]],
    deuda_total: Decimal,
    deuda_vencida: Decimal,
    carrera: Dict[str, Any]
) -> BytesIO:
    """
    Genera un PDF con el estado de cuenta del estudiante
    
    REFERENCIA DJANGO: views.py líneas 435-454
    
    Args:
        estudiante: Datos del estudiante
        inscripciones: Lista de inscripciones (pagadas y pendientes)
        deuda_total: Monto total de deuda
        deuda_vencida: Monto de deuda vencida
        carrera: Datos de la carrera
    
    Returns:
        BytesIO: Buffer con el PDF generado
    """
    buffer = BytesIO()
    
    # Crear documento
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Estilos
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#374151'),
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=6,
        alignment=TA_LEFT
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=12,
        alignment=TA_LEFT
    )
    
    right_style = ParagraphStyle(
        'CustomRight',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_RIGHT
    )
    
    # Elementos del PDF
    elements = []
    
    # Título
    elements.append(Paragraph("INFO CAMPUS", title_style))
    elements.append(Paragraph("Estado de Cuenta", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Fecha de generación
    fecha_generacion = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    elements.append(Paragraph(f"<b>Fecha de generación:</b> {fecha_generacion}", normal_style))
    elements.append(Spacer(1, 12))
    
    # Información del estudiante
    elements.append(Paragraph("<b>INFORMACIÓN DEL ESTUDIANTE</b>", header_style))
    
    nombre_completo = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip() or estudiante.get('username')
    
    info_data = [
        ['Campo', 'Valor'],
        ['Nombre', nombre_completo],
        ['Usuario/Matrícula', estudiante.get('username', 'N/A')],
        ['Email', estudiante.get('email', 'N/A')],
        ['Carrera', carrera.get('nombre', 'N/A') if carrera else 'N/A'],
        ['Código de Carrera', carrera.get('codigo', 'N/A') if carrera else 'N/A'],
    ]
    
    info_table = Table(info_data, colWidths=[2.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
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
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Resumen financiero
    elements.append(Paragraph("<b>RESUMEN FINANCIERO</b>", header_style))
    
    # Información de beca
    if estudiante.get('es_becado'):
        beca_info = f"Beca activa: {estudiante.get('porcentaje_beca', 0)}% de descuento"
        elements.append(Paragraph(f"<i>{beca_info}</i>", normal_style))
        elements.append(Spacer(1, 6))
    
    resumen_data = [
        ['Concepto', 'Monto'],
        ['Deuda Total', f"${deuda_total:.2f}"],
        ['Deuda Vencida', f"${deuda_vencida:.2f}"],
        ['Días de Gracia', str(carrera.get('dias_gracia_pago', 15)) if carrera else '15'],
    ]
    
    # Agregar convenio si aplica
    if estudiante.get('convenio_activo'):
        fecha_limite = estudiante.get('fecha_limite_convenio', 'N/A')
        resumen_data.append(['Convenio Activo', f"Hasta: {fecha_limite}"])
    
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
    
    # Detalle de inscripciones
    elements.append(Paragraph("<b>DETALLE DE INSCRIPCIONES</b>", header_style))
    elements.append(Spacer(1, 6))
    
    if inscripciones:
        insc_data = [['Materia', 'Sección', 'Período', 'Estado', 'Costo']]
        
        for insc in inscripciones:
            # Determinar estado y costo
            if insc.get('pago_id'):
                estado = "Pagado ✓"
                costo = "$0.00"
            else:
                estado = "Pendiente"
                # Calcular costo con beca si aplica
                costo_materia = insc.get('costo', Decimal('0'))
                if estudiante.get('es_becado') and estudiante.get('porcentaje_beca', 0) > 0:
                    costo_materia = costo_materia * (Decimal('1') - Decimal(str(estudiante['porcentaje_beca'])) / Decimal('100'))
                costo = f"${costo_materia:.2f}"
            
            insc_data.append([
                insc.get('materia_nombre', 'N/A'),
                insc.get('seccion_codigo', 'N/A'),
                insc.get('periodo_nombre', 'N/A'),
                estado,
                costo
            ])
        
        insc_table = Table(insc_data, colWidths=[2.5*inch, 1*inch, 1.5*inch, 1*inch, 1.5*inch])
        insc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        ]))
        
        elements.append(insc_table)
    else:
        elements.append(Paragraph("<i>No hay inscripciones registradas</i>", normal_style))
    
    elements.append(Spacer(1, 30))
    
    # Pie de página
    elements.append(Paragraph("_" * 60, normal_style))
    elements.append(Paragraph(
        "<i>Este documento es una representación de su estado de cuenta. "
        "Para más información, contacte a tesorería.</i>",
        styles['Normal']
    ))
    
    # Generar PDF
    doc.build(elements)
    buffer.seek(0)
    
    logger.info(f"✅ PDF generado para estudiante: {estudiante.get('username')}")
    
    return buffer


def generar_reporte_pagos(
    fecha_inicio: datetime,
    fecha_fin: datetime,
    pagos: List[Dict[str, Any]],
    total_recaudado: Decimal
) -> BytesIO:
    """
    Genera un reporte de pagos para tesorería
    
    Args:
        fecha_inicio: Fecha inicial del reporte
        fecha_fin: Fecha final del reporte
        pagos: Lista de pagos realizados
        total_recaudado: Monto total recaudado
    
    Returns:
        BytesIO: Buffer con el PDF generado
    """
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
        spaceAfter=6,
        alignment=TA_LEFT
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
    elements.append(Paragraph("Reporte de Pagos", styles['Heading2']))
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
        ['Total Recaudado', f"${total_recaudado:.2f}"],
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
    
    # Detalle de pagos
    if pagos:
        elements.append(Paragraph("<b>DETALLE DE PAGOS</b>", header_style))
        elements.append(Spacer(1, 6))
        
        pagos_data = [['Fecha', 'Estudiante', 'Materia', 'Monto', 'Método']]
        
        for pago in pagos:
            pagos_data.append([
                pago.get('fecha', 'N/A'),
                pago.get('estudiante', 'N/A'),
                pago.get('materia', 'N/A'),
                f"${pago.get('monto', 0):.2f}",
                pago.get('metodo', 'N/A')
            ])
        
        pagos_table = Table(pagos_data, colWidths=[1.2*inch, 1.8*inch, 2*inch, 1*inch, 1.5*inch])
        pagos_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),
            ('ALIGN', (-2, 1), (-2, -1), 'RIGHT'),
        ]))
        
        elements.append(pagos_table)
    
    # Generar PDF
    doc.build(elements)
    buffer.seek(0)
    
    logger.info(f"✅ Reporte de pagos generado: {len(pagos)} pagos, ${total_recaudado:.2f}")
    
    return buffer


def generar_certificado_inscripcion(
    estudiante: Dict[str, Any],
    inscripcion: Dict[str, Any],
    carrera: Dict[str, Any]
) -> BytesIO:
    """
    Genera un certificado de inscripción en una materia
    
    Args:
        estudiante: Datos del estudiante
        inscripcion: Datos de la inscripción
        carrera: Datos de la carrera
    
    Returns:
        BytesIO: Buffer con el PDF generado
    """
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
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=12,
        alignment=TA_LEFT
    )
    
    center_style = ParagraphStyle(
        'CustomCenter',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    elements = []
    
    # Título
    elements.append(Paragraph("INFO CAMPUS", title_style))
    elements.append(Paragraph("<b>Certificado de Inscripción</b>", styles['Heading2']))
    elements.append(Spacer(1, 30))
    
    # Texto del certificado
    nombre_estudiante = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip()
    nombre_carrera = carrera.get('nombre', '') if carrera else ''
    materia = inscripcion.get('materia_nombre', '')
    seccion = inscripcion.get('seccion_codigo', '')
    periodo = inscripcion.get('periodo_nombre', '')
    
    texto = f"""
    <para alignment="center">
    Por medio de la presente se certifica que:<br/><br/>
    <b>{nombre_estudiante}</b><br/>
    Código: {estudiante.get('username')}<br/><br/>
    Se encuentra debidamente inscrito(a) en la carrera de <b>{nombre_carrera}</b>,<br/>
    en la materia de <b>{materia}</b>, sección <b>{seccion}</b>,<br/>
    correspondiente al período <b>{periodo}</b>.
    </para>
    """
    
    elements.append(Paragraph(texto, center_style))
    elements.append(Spacer(1, 40))
    
    # Fecha
    fecha_actual = datetime.now().strftime("%d de %B de %Y")
    elements.append(Paragraph(f'<para alignment="center">{fecha_actual}</para>', normal_style))
    elements.append(Spacer(1, 60))
    
    # Firma
    elements.append(Paragraph("_" * 40, center_style))
    elements.append(Paragraph('<para alignment="center">Firma Autorizada</para>', normal_style))
    elements.append(Paragraph('<para alignment="center">Info Campus</para>', normal_style))
    
    # Generar PDF
    doc.build(elements)
    buffer.seek(0)
    
    logger.info(f"✅ Certificado generado para: {nombre_estudiante}")
    
    return buffer
