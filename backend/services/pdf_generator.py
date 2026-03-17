from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib.units import inch
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

COLOR_PRIMARY = colors.HexColor('#0f172a')
COLOR_ACCENT = colors.HexColor('#4f46e5')
COLOR_SECONDARY = colors.HexColor('#64748b')
COLOR_BG_LIGHT = colors.HexColor('#f8fafc')
COLOR_BORDER = colors.HexColor('#e2e8f0')
COLOR_SUCCESS = colors.HexColor('#10b981')
COLOR_DANGER = colors.HexColor('#ef4444')


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-BoldOblique',
        fontSize=24,
        textColor=COLOR_PRIMARY,
        spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        name='TechLabel',
        fontSize=7,
        fontName='Helvetica-Bold',
        textColor=COLOR_ACCENT,
    ))
    styles.add(ParagraphStyle(
        name='FormalBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        firstLineIndent=20
    ))
    return styles


def _draw_branding(canvas, doc):
    _ = doc
    canvas.saveState()
    canvas.setFillColor(COLOR_ACCENT)
    canvas.rect(0, letter[1] - 10, letter[0], 10, fill=1, stroke=0)
    canvas.setFont('Helvetica-BoldOblique', 16)
    canvas.setFillColor(COLOR_PRIMARY)
    canvas.drawString(40, letter[1] - 40, "INFO CAMPUS")
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(COLOR_SECONDARY)
    canvas.drawString(40, letter[1] - 52, f"EMISIÓN: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    canvas.setStrokeColor(COLOR_BORDER)
    canvas.line(40, 45, letter[0] - 40, 45)
    canvas.drawRightString(letter[0] - 40, 35, f"Página {canvas.getPageNumber()} | SISTEMA DE GESTIÓN ACADÉMICA")
    canvas.restoreState()


def generar_estado_cuenta(
    estudiante: Dict,
    inscripciones: List,
    deuda_total: Decimal,
    deuda_vencida: Decimal = Decimal('0.00'),
    carrera: Optional[Dict] = None
) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.3 * inch)
    styles = _get_styles()
    nombre = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip()

    elements = [
        Paragraph("ESTADO DE CUENTA", styles['DocTitle']),
        Paragraph(f"ESTUDIANTE: {nombre} | CÉDULA: {estudiante.get('cedula', 'N/A')}", styles['TechLabel']),
    ]

    if carrera:
        elements.append(
            Paragraph(f"CARRERA: {carrera.get('nombre', 'N/A')} | CÓDIGO: {carrera.get('codigo', 'N/A')}", styles['TechLabel'])
        )

    elements.append(Spacer(1, 20))

    data = [["MATERIA", "PERÍODO", "ESTADO", "MONTO"]]
    for i in inscripciones:
        pagado = i.get('pagado', False)
        data.append([
            Paragraph(i.get('materia_nombre', 'N/A'), styles['Normal']),
            i.get('periodo_nombre', 'N/A'),
            Paragraph("PAGADO" if pagado else "PENDIENTE", ParagraphStyle(
                'st', fontSize=7, fontName='Helvetica-Bold',
                textColor=COLOR_SUCCESS if pagado else COLOR_DANGER
            )),
            f"${float(i.get('costo', 0)):,.2f}"
        ])

    t = Table(data, colWidths=[3.2 * inch, 1.3 * inch, 1.2 * inch, 1 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT])
    ]))

    elements.extend([
        t,
        Spacer(1, 12),
        Paragraph(
            f"DEUDA VENCIDA: ${float(deuda_vencida):,.2f}",
            ParagraphStyle('venc', parent=styles['TechLabel'], fontSize=9, textColor=COLOR_DANGER)
        ),
        Spacer(1, 8),
        Paragraph(
            f"TOTAL PENDIENTE: ${float(deuda_total):,.2f}",
            ParagraphStyle('tot', parent=styles['DocTitle'], fontSize=16, alignment=TA_RIGHT, textColor=COLOR_DANGER)
        )
    ])

    doc.build(elements, onFirstPage=_draw_branding, onLaterPages=_draw_branding)
    buffer.seek(0)
    return buffer


def generar_certificado_inscripcion(
    estudiante: Dict,
    inscripcion: Dict,
    carrera: Optional[Dict] = None
) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.5 * inch)
    styles = _get_styles()
    nombre = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".upper()

    carrera_nombre = carrera.get('nombre', 'N/A') if carrera else 'N/A'
    periodo_nombre = inscripcion.get('periodo_nombre', 'N/A')
    materia_nombre = inscripcion.get('materia_nombre', 'N/A')
    seccion = inscripcion.get('seccion_codigo', 'N/A')
    aula = inscripcion.get('aula', 'N/A')
    creditos = inscripcion.get('creditos', 'N/A')

    texto = (
        f"La Secretaría General de INFO CAMPUS, mediante el presente documento, hace constar que el estudiante "
        f"{nombre}, con identificación {estudiante.get('cedula', 'N/A')}, se encuentra debidamente inscrito en el programa "
        f"de {carrera_nombre.upper()} durante el ciclo {periodo_nombre}, en la asignatura {materia_nombre}, "
        f"sección {seccion}, aula {aula}, con {creditos} créditos. Se emite el presente certificado para los "
        f"fines legales y administrativos que el interesado requiera."
    )

    elements = [
        Paragraph("CERTIFICADO DE INSCRIPCIÓN", styles['DocTitle']),
        Spacer(1, 40),
        Paragraph(texto, styles['FormalBody']),
        Spacer(1, 100),
        Table(
            [["_" * 40], ["FIRMA AUTORIZADA"], ["SECRETARÍA ACADÉMICA"]],
            colWidths=[3 * inch],
            style=[('ALIGN', (0, 0), (-1, -1), 'CENTER')]
        )
    ]

    doc.build(elements, onFirstPage=_draw_branding)
    buffer.seek(0)
    return buffer


def generar_acta_notas_seccion(seccion: Dict, alumnos: List) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.3 * inch)
    styles = _get_styles()
    elements = [
        Paragraph("ACTA OFICIAL DE CALIFICACIONES", styles['DocTitle']),
        Paragraph(f"MATERIA: {seccion.get('materia_nombre', 'N/A')} | SECCIÓN: {seccion.get('codigo', 'N/A')}", styles['TechLabel']),
        Spacer(1, 20)
    ]
    data = [["#", "CÉDULA", "NOMBRE COMPLETO", "NOTA"]]
    for idx, a in enumerate(alumnos, 1):
        nota = float(a.get('nota_final', 0))
        data.append([
            str(idx),
            a.get('cedula', 'N/A'),
            Paragraph(a.get('nombre_completo', 'N/A'), styles['Normal']),
            Paragraph(f"{nota:.1f}", ParagraphStyle(
                'n', alignment=TA_CENTER,
                textColor=COLOR_PRIMARY if nota >= 7 else COLOR_DANGER
            ))
        ])
    t = Table(data, colWidths=[0.5 * inch, 1.2 * inch, 4 * inch, 1 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ]))
    elements.extend([
        t,
        Spacer(1, 80),
        Table(
            [["_" * 40, "_" * 40], ["FIRMA DEL DOCENTE", "FECHA RECIBIDO"]],
            colWidths=[3.5 * inch, 3.5 * inch],
            style=[
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTSIZE', (0, 0), (-1, -1), 8)
            ]
        )
    ])
    doc.build(elements, onFirstPage=_draw_branding, onLaterPages=_draw_branding)
    buffer.seek(0)
    return buffer


def generar_boletin_notas(estudiante: Dict, notas: List, promedio: float) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.3 * inch)
    styles = _get_styles()
    nombre = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip()
    elements = [
        Paragraph("BOLETÍN DE RENDIMIENTO", styles['DocTitle']),
        Paragraph(f"ALUMNO: {nombre} | PROMEDIO: {promedio:.2f}", styles['TechLabel']),
        Spacer(1, 20)
    ]
    data = [["MATERIA", "CALIFICACIÓN", "RESULTADO"]]
    for n in notas:
        nota_val = float(n.get('nota', 0))
        aprobado = nota_val >= 7
        data.append([
            Paragraph(n.get('materia', 'N/A'), styles['Normal']),
            f"{nota_val:.1f}",
            Paragraph("APROBADO" if aprobado else "REPROBADO", ParagraphStyle(
                'res', fontSize=7, fontName='Helvetica-Bold',
                textColor=COLOR_SUCCESS if aprobado else COLOR_DANGER
            ))
        ])
    t = Table(data, colWidths=[4 * inch, 1.2 * inch, 1.3 * inch])
    t.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 2, COLOR_ACCENT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT])
    ]))
    elements.append(t)
    doc.build(elements, onFirstPage=_draw_branding)
    buffer.seek(0)
    return buffer


def generar_reporte_recaudacion(pagos: List, total_recaudado: Decimal, periodo_texto: str) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.3 * inch)
    styles = _get_styles()
    elements = [
        Paragraph("REPORTE CRÍTICO DE RECAUDACIÓN", styles['DocTitle']),
        Paragraph(f"PERÍODO ANALIZADO: {periodo_texto}", styles['TechLabel']),
        Spacer(1, 20)
    ]
    resumen_data = [
        [Paragraph("TOTAL INGRESOS", styles['TechLabel']), Paragraph(f"${float(total_recaudado):,.2f}", styles['DocTitle'])],
        [Paragraph("TRANSACCIONES", styles['TechLabel']), str(len(pagos))]
    ]
    res_t = Table(resumen_data, colWidths=[2 * inch, 4.5 * inch])
    res_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COLOR_BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, COLOR_BORDER)
    ]))
    elements.extend([res_t, Spacer(1, 30)])
    data = [["FECHA", "ESTUDIANTE", "MÉTODO", "MONTO"]]
    for p in pagos:
        data.append([
            p.get('fecha', 'N/A')[:10],
            Paragraph(p.get('estudiante_nombre', 'N/A'), styles['Normal']),
            p.get('metodo', 'N/A').upper(),
            f"${float(p.get('monto', 0)):,.2f}"
        ])
    t = Table(data, colWidths=[1.2 * inch, 3.3 * inch, 1 * inch, 1 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT')
    ]))
    elements.append(t)
    doc.build(elements, onFirstPage=_draw_branding, onLaterPages=_draw_branding)
    buffer.seek(0)
    return buffer


def generar_recibo_pago_individual(pago: Dict, estudiante: Dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=(5.5 * inch, 8.5 * inch),
        topMargin=0.5 * inch, bottomMargin=0.5 * inch
    )
    styles = _get_styles()
    nombre = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".strip()
    elements = [
        Paragraph("COMPROBANTE DE INGRESO", styles['DocTitle']),
        HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceAfter=15),
        Table(
            [
                [Paragraph("N° TRANSACCIÓN:", styles['TechLabel']), pago.get('id', 'N/A')],
                [Paragraph("FECHA:", styles['TechLabel']), pago.get('fecha', 'N/A')[:16]],
                [Paragraph("ESTUDIANTE:", styles['TechLabel']), nombre],
                [Paragraph("CÉDULA:", styles['TechLabel']), estudiante.get('cedula', 'N/A')],
                [Paragraph("MÉTODO DE PAGO:", styles['TechLabel']), pago.get('metodo', 'EFECTIVO').upper()],
            ],
            colWidths=[1.5 * inch, 3 * inch],
            style=[('BOTTOMPADDING', (0, 0), (-1, -1), 8)]
        ),
        Spacer(1, 20),
        Table(
            [[
                Paragraph("TOTAL PAGADO", styles['TechLabel']),
                Paragraph(
                    f"${float(pago.get('monto', 0)):,.2f}",
                    ParagraphStyle('m', fontSize=20, fontName='Helvetica-Bold', textColor=COLOR_SUCCESS)
                )
            ]],
            colWidths=[1.5 * inch, 3 * inch],
            style=[
                ('BOX', (0, 0), (-1, -1), 1, COLOR_BORDER),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
            ]
        ),
        Spacer(1, 30),
        Paragraph(
            "Este documento sirve como soporte legal de pago. No se aceptan tachaduras.",
            ParagraphStyle('f', fontSize=7, alignment=TA_CENTER, textColor=COLOR_SECONDARY)
        )
    ]
    doc.build(elements)
    buffer.seek(0)
    return buffer


def generar_historial_academico(estudiante: Dict, historia_completa: List) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1.3 * inch)
    styles = _get_styles()
    nombre = f"{estudiante.get('first_name', '')} {estudiante.get('last_name', '')}".upper()
    elements = [
        Paragraph("HISTORIAL ACADÉMICO INTEGRAL", styles['DocTitle']),
        Paragraph(f"EXPEDIENTE: {estudiante.get('cedula', 'N/A')} | ALUMNO: {nombre}", styles['TechLabel']),
        Spacer(1, 20)
    ]
    data = [["CÓDIGO", "ASIGNATURA", "CR", "NOTA", "ESTADO"]]
    for m in historia_completa:
        nota = float(m.get('nota', 0))
        estado = "APROBADA" if nota >= 7 else "REPROBADA"
        data.append([
            m.get('codigo_materia', 'N/A'),
            Paragraph(m.get('nombre_materia', 'N/A'), styles['Normal']),
            str(m.get('creditos', '0')),
            f"{nota:.1f}",
            Paragraph(estado, ParagraphStyle(
                'es', fontSize=7, fontName='Helvetica-Bold',
                textColor=COLOR_SUCCESS if nota >= 7 else COLOR_DANGER
            ))
        ])
    t = Table(data, colWidths=[0.8 * inch, 3.4 * inch, 0.5 * inch, 0.8 * inch, 1 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ]))
    elements.extend([
        t,
        Spacer(1, 40),
        Paragraph(
            "FIN DEL REGISTRO ACADÉMICO OFICIAL",
            ParagraphStyle('end', fontSize=8, alignment=TA_CENTER, textColor=COLOR_SECONDARY)
        )
    ])
    doc.build(elements, onFirstPage=_draw_branding, onLaterPages=_draw_branding)
    buffer.seek(0)
    return buffer