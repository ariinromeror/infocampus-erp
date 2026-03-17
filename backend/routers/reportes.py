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
    generar_certificado_inscripcion
)
from services.calculos_financieros import calcular_deuda_total, calcular_deuda_vencida

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


@router.get("/inscripcion/{inscripcion_id}", summary="Descargar certificado de inscripción")
async def certificado_inscripcion(
    inscripcion_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    logger.info(f"Certificado solicitado para inscripción {inscripcion_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            inscripcion = await conn.fetchrow(
                """
                SELECT
                    i.id,
                    i.fecha_inscripcion,
                    u.id as estudiante_id,
                    u.cedula as estudiante_cedula,
                    u.first_name as estudiante_first_name,
                    u.last_name as estudiante_last_name,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    s.codigo as codigo_seccion,
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
                WHERE i.id = $1
                """,
                inscripcion_id,
            )

            if not inscripcion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada")

            insc_dict = dict(inscripcion)

            puede_descargar = False
            if current_user['rol'] in ['director', 'coordinador', 'tesorero', 'administrativo']:
                puede_descargar = True
            elif current_user['id'] == insc_dict['estudiante_id']:
                puede_descargar = True

            if not puede_descargar:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso para descargar este certificado")

            estudiante_data = {
                'id': insc_dict['estudiante_id'],
                'cedula': insc_dict['estudiante_cedula'],
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

        pdf_buffer = generar_certificado_inscripcion(estudiante_data, inscripcion_data, carrera_data)
        nombre_archivo = f"certificado_inscripcion_{inscripcion_id}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={nombre_archivo}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando certificado: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generando certificado: {str(e)}")


@router.get("/estado-cuenta/{estudiante_id}", summary="Descargar estado de cuenta en PDF")
async def estado_cuenta_pdf(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    logger.info(f"Estado de cuenta solicitado para estudiante {estudiante_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow(
                """
                SELECT
                    u.id, u.cedula, u.email, u.first_name, u.last_name,
                    u.rol, u.carrera_id, u.es_becado, u.porcentaje_beca,
                    u.convenio_activo, u.fecha_limite_convenio,
                    c.nombre as carrera_nombre, c.codigo as carrera_codigo,
                    c.precio_credito, c.dias_gracia_pago
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE u.id = $1 AND u.rol = 'estudiante'
                """,
                estudiante_id,
            )

            if not estudiante:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            puede_descargar = False
            if current_user['rol'] in ['director', 'coordinador', 'tesorero', 'administrativo']:
                puede_descargar = True
            elif current_user['id'] == estudiante_id:
                puede_descargar = True

            if not puede_descargar:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso para descargar este estado de cuenta")

            periodo_actual = await conn.fetchrow(
                "SELECT * FROM public.periodos_lectivos WHERE activo = true ORDER BY fecha_inicio DESC LIMIT 1"
            )

            inscripciones_raw = await conn.fetch(
                """
                SELECT
                    i.id,
                    i.nota_final,
                    i.estado,
                    i.fecha_inscripcion,
                    i.pago_id,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    s.codigo as codigo_seccion,
                    s.aula,
                    p.nombre as periodo_nombre,
                    CASE WHEN pg.id IS NOT NULL THEN true ELSE false END as pagado
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.pagos pg ON i.pago_id = pg.id
                WHERE i.estudiante_id = $1
                ORDER BY p.codigo DESC, m.nombre
                """,
                estudiante_id,
            )

            inscripciones = []
            for row in inscripciones_raw:
                row_dict = dict(row)
                creditos = Decimal(str(row_dict['creditos']))
                precio_credito = Decimal(str(est_dict.get('precio_credito', 50)))
                costo = creditos * precio_credito

                if est_dict.get('es_becado') and est_dict.get('porcentaje_beca', 0) > 0:
                    porcentaje = Decimal(str(est_dict['porcentaje_beca']))
                    costo -= costo * (porcentaje / Decimal('100'))

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

            inscripciones_para_calculo = [dict(row) for row in inscripciones_raw]
            deuda_total = await calcular_deuda_total(est_dict, inscripciones_para_calculo, conn)
            deuda_vencida = await calcular_deuda_vencida(
                est_dict,
                inscripciones_para_calculo,
                dict(periodo_actual) if periodo_actual else None,
                conn
            )

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

        nombre_estudiante = f"{est_dict.get('first_name', '')}_{est_dict.get('last_name', '')}".strip() or est_dict['cedula']
        nombre_archivo = f"estado_cuenta_{nombre_estudiante}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando estado de cuenta: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generando estado de cuenta: {str(e)}")


@router.get("/tesoreria", summary="Reporte de tesorería en PDF")
async def reporte_tesoreria(
    dias: int = 30,
    current_user: Dict[str, Any] = Depends(require_roles(['director', 'admin', 'tesorero', 'coordinador']))
):
    logger.info(f"Reporte de tesorería solicitado por {current_user['cedula']} (últimos {dias} días)")

    try:
        async with get_db() as conn:
            fecha_fin = datetime.now()
            fecha_inicio = fecha_fin - timedelta(days=dias)

            pagos_raw = await conn.fetch(
                """
                SELECT
                    p.id,
                    p.monto,
                    p.metodo_pago,
                    p.fecha_pago,
                    p.referencia,
                    u.cedula as estudiante_cedula,
                    u.first_name || ' ' || u.last_name as estudiante_nombre,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo
                FROM public.pagos p
                JOIN public.usuarios u ON p.estudiante_id = u.id
                LEFT JOIN public.inscripciones i ON i.pago_id = p.id
                LEFT JOIN public.secciones s ON i.seccion_id = s.id
                LEFT JOIN public.materias m ON s.materia_id = m.id
                WHERE p.fecha_pago >= $1 AND p.fecha_pago <= $2
                ORDER BY p.fecha_pago DESC
                """,
                fecha_inicio, fecha_fin
            )

            total_recaudado = Decimal('0.00')
            pagos = []

            for row in pagos_raw:
                row_dict = dict(row)
                monto = Decimal(str(row_dict['monto']))
                total_recaudado += monto

                pagos.append({
                    'fecha': row_dict['fecha_pago'].strftime('%d/%m/%Y %H:%M') if row_dict['fecha_pago'] else 'N/A',
                    'estudiante': row_dict['estudiante_nombre'] or row_dict['estudiante_cedula'],
                    'materia': row_dict['materia_nombre'] or 'N/A',
                    'monto': monto,
                    'metodo': row_dict['metodo_pago'].capitalize() if row_dict['metodo_pago'] else 'N/A'
                })

            metodos = await conn.fetch(
                """
                SELECT
                    metodo_pago,
                    COUNT(*) as cantidad,
                    SUM(monto) as total
                FROM public.pagos
                WHERE fecha_pago >= $1 AND fecha_pago <= $2
                GROUP BY metodo_pago
                """,
                fecha_inicio, fecha_fin
            )

        from io import BytesIO
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=20,
                                     textColor=colors.HexColor('#1e40af'), spaceAfter=20, alignment=TA_CENTER)
        header_style = ParagraphStyle('CustomHeader', parent=styles['Heading2'], fontSize=12,
                                      textColor=colors.HexColor('#1e40af'), spaceAfter=10)
        normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=10,
                                      spaceAfter=12, alignment=TA_LEFT)

        elements = []
        elements.append(Paragraph("INFO CAMPUS", title_style))
        elements.append(Paragraph(f"Reporte de Tesorería - {dias} días", styles['Heading2']))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(
            f"<b>Período:</b> {fecha_inicio.strftime('%d/%m/%Y')} - {fecha_fin.strftime('%d/%m/%Y')}",
            normal_style
        ))
        elements.append(Spacer(1, 12))

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

        if metodos:
            elements.append(Paragraph("<b>DESGLOSE POR MÉTODO DE PAGO</b>", header_style))
            metodos_data = [['Método', 'Cantidad', 'Total']]
            for metodo in metodos:
                m = dict(metodo)
                metodos_data.append([
                    m['metodo_pago'].capitalize() if m['metodo_pago'] else 'N/A',
                    str(m['cantidad']),
                    f"${float(m['total']):.2f}"
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

        if pagos:
            elements.append(Paragraph("<b>DETALLE DE PAGOS</b>", header_style))
            elements.append(Spacer(1, 6))
            pagos_mostrar = pagos[:50]
            pagos_data = [['Fecha', 'Estudiante', 'Materia', 'Monto', 'Método']]
            for pago in pagos_mostrar:
                pagos_data.append([
                    pago['fecha'],
                    pago['estudiante'][:25],
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

        elements.append(Spacer(1, 30))
        elements.append(Paragraph("_" * 60, normal_style))
        elements.append(Paragraph(
            f"<para alignment='center' fontSize='8'>Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} por {current_user['cedula']}</para>",
            normal_style
        ))

        doc.build(elements)
        buffer.seek(0)

        nombre_archivo = f"reporte_tesoreria_{dias}dias_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando reporte de tesorería: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generando reporte: {str(e)}")


@router.get("/notas/{estudiante_id}", summary="Boletín de notas del estudiante")
async def boletin_notas(
    estudiante_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    logger.info(f"Boletín de notas solicitado para estudiante {estudiante_id} por {current_user['cedula']}")

    try:
        async with get_db() as conn:
            estudiante = await conn.fetchrow(
                """
                SELECT
                    u.id, u.cedula, u.first_name, u.last_name, u.email,
                    u.semestre_actual, u.promedio_acumulado,
                    c.nombre as carrera_nombre, c.codigo as carrera_codigo
                FROM public.usuarios u
                LEFT JOIN public.carreras c ON u.carrera_id = c.id
                WHERE u.id = $1 AND u.rol = 'estudiante'
                """,
                estudiante_id,
            )

            if not estudiante:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudiante no encontrado")

            est_dict = dict(estudiante)

            puede_ver = False
            if current_user['rol'] in ['director', 'coordinador', 'tesorero', 'administrativo']:
                puede_ver = True
            elif current_user['id'] == estudiante_id:
                puede_ver = True

            if not puede_ver:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso para ver este boletín")

            rows = await conn.fetch(
                """
                SELECT
                    i.id as inscripcion_id,
                    i.nota_final,
                    i.estado,
                    m.nombre as materia_nombre,
                    m.codigo as materia_codigo,
                    m.creditos,
                    m.semestre,
                    s.codigo as seccion_codigo,
                    p.nombre as periodo_nombre,
                    p.codigo as periodo_codigo,
                    ev.tipo_evaluacion,
                    ev.nota as nota_parcial,
                    ev.peso_porcentual
                FROM public.inscripciones i
                JOIN public.secciones s ON i.seccion_id = s.id
                JOIN public.materias m ON s.materia_id = m.id
                JOIN public.periodos_lectivos p ON s.periodo_id = p.id
                LEFT JOIN public.evaluaciones_parciales ev ON ev.inscripcion_id = i.id
                WHERE i.estudiante_id = $1
                ORDER BY p.codigo DESC, m.semestre, m.nombre, ev.tipo_evaluacion
                """,
                estudiante_id,
            )

        materias_dict = {}
        for row in rows:
            r = dict(row)
            iid = r['inscripcion_id']
            if iid not in materias_dict:
                materias_dict[iid] = {
                    'materia_nombre': r['materia_nombre'],
                    'materia_codigo': r['materia_codigo'],
                    'creditos': r['creditos'],
                    'semestre': r['semestre'],
                    'seccion': r['seccion_codigo'],
                    'periodo_nombre': r['periodo_nombre'],
                    'periodo_codigo': r['periodo_codigo'],
                    'nota_final': float(r['nota_final']) if r['nota_final'] else None,
                    'estado': r['estado'],
                    'evaluaciones': []
                }
            if r['tipo_evaluacion']:
                materias_dict[iid]['evaluaciones'].append({
                    'tipo': r['tipo_evaluacion'],
                    'nota': float(r['nota_parcial']) if r['nota_parcial'] else None,
                    'peso': float(r['peso_porcentual']) if r['peso_porcentual'] else None
                })

        materias = list(materias_dict.values())

        from io import BytesIO
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22,
                                     textColor=colors.HexColor('#1e40af'), spaceAfter=6, alignment=TA_CENTER)
        subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=13,
                                        textColor=colors.HexColor('#374151'), spaceAfter=20, alignment=TA_CENTER)
        header_style = ParagraphStyle('Header', parent=styles['Heading3'], fontSize=11,
                                      textColor=colors.HexColor('#1e40af'), spaceAfter=6)
        normal_style = ParagraphStyle('Normal2', parent=styles['Normal'], fontSize=10, spaceAfter=4)

        elements = []
        elements.append(Paragraph("INFO CAMPUS", title_style))
        elements.append(Paragraph("Boletín de Notas", subtitle_style))

        nombre_completo = f"{est_dict.get('first_name', '')} {est_dict.get('last_name', '')}".strip()

        info_data = [
            ['Campo', 'Valor'],
            ['Estudiante', nombre_completo],
            ['Cédula', est_dict.get('cedula', 'N/A')],
            ['Carrera', est_dict.get('carrera_nombre', 'N/A')],
            ['Semestre Actual', str(est_dict.get('semestre_actual', 'N/A'))],
            ['Promedio Acumulado', f"{float(est_dict['promedio_acumulado']):.2f}" if est_dict.get('promedio_acumulado') else 'N/A'],
            ['Fecha de Emisión', datetime.now().strftime('%d/%m/%Y %H:%M')],
        ]

        info_table = Table(info_data, colWidths=[2.5*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))

        periodos_vistos = []
        for m in materias:
            if m['periodo_codigo'] not in periodos_vistos:
                periodos_vistos.append(m['periodo_codigo'])

        for periodo_codigo in periodos_vistos:
            materias_periodo = [m for m in materias if m['periodo_codigo'] == periodo_codigo]
            if not materias_periodo:
                continue

            periodo_nombre = materias_periodo[0]['periodo_nombre']
            elements.append(Paragraph(f"<b>{periodo_nombre}</b>", header_style))

            tabla_data = [['Materia', 'Sec.', 'P1\n(25%)', 'P2\n(25%)', 'Tall.\n(20%)', 'Final\n(30%)', 'Nota\nFinal', 'Estado']]

            for m in materias_periodo:
                eval_map = {ev['tipo']: ev['nota'] for ev in m['evaluaciones'] if ev['nota'] is not None}
                p1 = f"{eval_map['parcial_1']:.1f}" if eval_map.get('parcial_1') is not None else '-'
                p2 = f"{eval_map['parcial_2']:.1f}" if eval_map.get('parcial_2') is not None else '-'
                talleres = f"{eval_map['talleres']:.1f}" if eval_map.get('talleres') is not None else '-'
                examen = f"{eval_map['examen_final']:.1f}" if eval_map.get('examen_final') is not None else '-'
                nota_final = f"{m['nota_final']:.2f}" if m['nota_final'] is not None else '-'

                estado_display = {
                    'aprobado': 'Aprobado',
                    'reprobado': 'Reprobado',
                    'activo': 'En Curso',
                    'inscrito': 'Inscrito',
                    'retirado': 'Retirado'
                }.get(m['estado'], m['estado'])

                tabla_data.append([
                    m['materia_nombre'][:28],
                    m['seccion'],
                    p1, p2, talleres, examen,
                    nota_final,
                    estado_display
                ])

            notas_table = Table(tabla_data, colWidths=[2.1*inch, 0.4*inch, 0.55*inch, 0.55*inch, 0.55*inch, 0.55*inch, 0.6*inch, 0.7*inch])
            notas_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (0, 1), (0, -1), 'LEFT'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f9fafb'), colors.white]),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
            ]))
            elements.append(notas_table)
            elements.append(Spacer(1, 16))

        elements.append(Spacer(1, 20))
        elements.append(Paragraph("_" * 60, normal_style))
        elements.append(Paragraph(
            f"<para alignment='center' fontSize='8'>Documento oficial generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} · Info Campus ERP</para>",
            normal_style
        ))

        doc.build(elements)
        buffer.seek(0)

        nombre_archivo = f"boletin_notas_{est_dict.get('cedula', estudiante_id)}_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={nombre_archivo}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando boletín de notas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generando boletín: {str(e)}")
