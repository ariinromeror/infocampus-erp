from reportlab.lib.units import inch  
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from io import BytesIO
from datetime import datetime
from decimal import Decimal


def generar_pdf_estado_cuenta(estudiante):
    """
    Genera un Estado de Cuenta profesional en PDF.
    Utiliza la lógica de negocio definida en el modelo Usuario e Inscripcion.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, 
                            rightMargin=40, leftMargin=40, 
                            topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], alignment=TA_CENTER, spaceAfter=20)
    info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, leading=12)
    header_table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ])

    elements = []

    # 1. ENCABEZADO INSTITUCIONAL
    elements.append(Paragraph("INFO CAMPUS 2026 - ESTADO DE CUENTA OFICIAL", title_style))
    elements.append(Spacer(1, 10))
    
    # 2. INFORMACIÓN DEL ESTUDIANTE
    fecha_emision = datetime.now().strftime("%d/%m/%Y %H:%M")
    beca_status = f"SI ({estudiante.porcentaje_beca}%)" if estudiante.es_becado else "NO" #
    
    info_data = [
        [Paragraph(f"<b>Alumno:</b> {estudiante.nombre_completo}", info_style), #
         Paragraph(f"<b>DNI:</b> {estudiante.dni or 'N/A'}", info_style)],      #
        [Paragraph(f"<b>Carrera:</b> {estudiante.carrera.nombre if estudiante.carrera else 'N/A'}", info_style), 
         Paragraph(f"<b>Fecha Emisión:</b> {fecha_emision}", info_style)],
        [Paragraph(f"<b>Beca:</b> {beca_status}", info_style), 
         Paragraph(f"<b>Estado:</b> {'🔴 EN MORA' if estudiante.en_mora else '✅ AL DÍA'}", info_style)] #
    ]
    
    info_table = Table(info_data, colWidths=[3.5*inch, 2.5*inch])
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # 3. DETALLE DE MOVIMIENTOS (TABLA DE INSCRIPCIONES)
    # Encabezados de la tabla
    data = [['Materia', 'Periodo', 'Costo Base', 'Beca', 'Total', 'Estado']]
    
    precio_credito = estudiante.carrera.precio_credito if estudiante.carrera else Decimal('0.00') #

    # Iteramos sobre inscripciones (relación correcta según la biblia)
    for insc in estudiante.inscripciones.all(): 
        # Lógica financiera centralizada
        materia = insc.seccion.materia
        costo_base = Decimal(str(materia.creditos)) * precio_credito #
        
        descuento = Decimal('0.00')
        if estudiante.es_becado:
            descuento = costo_base * (Decimal(str(estudiante.porcentaje_beca)) / Decimal('100'))
        
        total_materia = costo_base - descuento
        
        # Determinar si ya está pagado consultando el modelo Pago
        tiene_pago = hasattr(insc, 'pago') 
        estado_pago = "PAGADO" if tiene_pago else "PENDIENTE"
        
        data.append([
            Paragraph(materia.nombre, info_style),
            insc.seccion.periodo.codigo, #
            f"${costo_base:,.2f}",
            f"-${descuento:,.2f}",
            f"${total_materia:,.2f}",
            estado_pago
        ])

    # Crear tabla de movimientos
    table_movs = Table(data, colWidths=[2.2*inch, 1*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1*inch])
    table_movs.setStyle(header_table_style)
    
    # Colorear filas de estado
    for i, row in enumerate(data):
        if row[5] == "PENDIENTE":
            table_movs.setStyle(TableStyle([('TEXTCOLOR', (5, i), (5, i), colors.red)]))
        elif row[5] == "PAGADO":
            table_movs.setStyle(TableStyle([('TEXTCOLOR', (5, i), (5, i), colors.green)]))

    elements.append(table_movs)
    elements.append(Spacer(1, 20))

    # 4. RESUMEN FINAL
    # Usamos la property centralizada deuda_total definida en models.py
    total_deuda = estudiante.deuda_total 
    
    resumen_data = [
        ['', '', '', Paragraph("<b>DEUDA TOTAL:</b>", ParagraphStyle('Right', parent=info_style, alignment=TA_RIGHT)), 
         f"${total_deuda:,.2f}"]
    ]
    
    resumen_table = Table(resumen_data, colWidths=[1*inch, 1*inch, 1*inch, 2*inch, 1.5*inch])
    resumen_table.setStyle(TableStyle([
        ('FONTSIZE', (3, 0), (4, 0), 12),
        ('LINEABOVE', (3, 0), (4, 0), 1, colors.black),
        ('ALIGN', (3, 0), (4, 0), 'RIGHT'),
    ]))
    
    elements.append(resumen_table)

    # Construir PDF
    doc.build(elements)
    
    buffer.seek(0)
    return buffer