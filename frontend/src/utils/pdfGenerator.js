import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarCertificadoInscripcion = (estudiante, carrera, secciones, periodo, fechaInscripcion) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Colors
  const primaryColor = [79, 70, 229]; // indigo-600
  const darkColor = [30, 41, 59]; // slate-800
  const grayColor = [100, 116, 139]; // slate-500

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICADO DE INSCRIPCIÓN', pageWidth / 2, 12, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INFOCAMPUS - Educación Superior', pageWidth / 2, 18, { align: 'center' });

  // Infobox - Student and Enrollment info
  const infoBoxY = 32;
  
  // Left box - Student info
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, infoBoxY, (pageWidth - margin * 3) / 2, 30, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL ESTUDIANTE', margin + 5, infoBoxY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  
  const nombreCompleto = `${estudiante.first_name || ''} ${estudiante.last_name || ''}`.trim();
  doc.text(`Nombre: ${nombreCompleto}`, margin + 5, infoBoxY + 14);
  doc.text(`Cédula: ${estudiante.cedula || '—'}`, margin + 5, infoBoxY + 20);
  doc.text(`Carrera: ${carrera?.nombre || '—'}`, margin + 5, infoBoxY + 26);

  // Right box - Enrollment info
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth / 2 + margin / 2, infoBoxY, (pageWidth - margin * 3) / 2, 30, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DE INSCRIPCIÓN', pageWidth / 2 + margin / 2 + 5, infoBoxY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  
  const fechaFormateada = fechaInscripcion ? new Date(fechaInscripcion).toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleString('es-EC');
  
  doc.text(`Fecha: ${fechaFormateada}`, pageWidth / 2 + margin / 2 + 5, infoBoxY + 14);
  doc.text(`Período: ${periodo?.nombre || '—'}`, pageWidth / 2 + margin / 2 + 5, infoBoxY + 20);
  doc.text(`Código: INS-${new Date().getFullYear()}-${String(estudiante.id || Date.now()).slice(-4)}`, pageWidth / 2 + margin / 2 + 5, infoBoxY + 26);

  // Table of subjects
  const tableY = 68;
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MATERIAS INSCRITAS', margin, tableY - 3);

  const tableData = secciones.map((sec, index) => [
    index + 1,
    sec.codigo || '—',
    sec.materia || sec.nombre || '—',
    sec.creditos || sec.creditos || '—',
    sec.aula || '—',
    sec.horario || '—'
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [['#', 'Código', 'Materia', 'Créditos', 'Aula', 'Horario']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkColor
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto'
  });

  // Summary
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalCreditos = secciones.reduce((sum, sec) => sum + (sec.creditos || 0), 0);
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 20, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN', margin + 5, finalY + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Materias: ${secciones.length}`, margin + 5, finalY + 14);
  doc.text(`Total Créditos: ${totalCreditos}`, margin + 60, finalY + 14);
  doc.text(`Valor por Crédito: $${carrera?.precio_credito || 0}`, margin + 120, finalY + 14);
  
  const totalPagar = totalCreditos * (carrera?.precio_credito || 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total a Pagar: $${totalPagar.toFixed(2)}`, pageWidth - margin - 60, finalY + 14);

  // Footer with declaration
  const footerY = pageHeight - 45;
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('DECLARACIÓN', margin, footerY + 7);
  
  doc.setFont('helvetica', 'normal');
  const declaracion = `Yo, ${nombreCompleto}, declaro que he leído la malla curricular de la carrera de ${carrera?.nombre || '—'} y acepto cursar todas las materias descritas. Entiendo que debo completar todas las materias en el orden establecido para obtener mi título profesional.`;
  const declaracionLines = doc.splitTextToSize(declaracion, pageWidth - margin * 2 - 20);
  doc.text(declaracionLines, margin, footerY + 13);

  // Signature area
  const sigY = footerY + 30;
  
  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.3);
  
  // Left signature
  doc.line(margin, sigY + 15, margin + 70, sigY + 15);
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text('Firma del Estudiante', margin + 35, sigY + 20, { align: 'center' });
  doc.text('Fecha: _______________', margin + 35, sigY + 26, { align: 'center' });
  
  // Right signature
  doc.line(pageWidth - margin - 70, sigY + 15, pageWidth - margin, sigY + 15);
  doc.text('Firma del Responsable', pageWidth - margin - 35, sigY + 20, { align: 'center' });
  doc.text('Fecha: _______________', pageWidth - margin - 35, sigY + 26, { align: 'center' });

  // Footer watermark
  doc.setFontSize(6);
  doc.setTextColor(200, 200, 200);
  doc.text(`Documento generado el ${new Date().toLocaleString('es-EC')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save
  const fileName = `INSCRIPCION_${estudiante.cedula || Date.now()}_${new Date().getFullYear()}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

export const generarMallaCurricularPDF = (carrera, semestres) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  const primaryColor = [79, 70, 229];
  const darkColor = [30, 41, 59];
  const grayColor = [100, 116, 139];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MALLA CURRICULAR', pageWidth / 2, 10, { align: 'center' });
  doc.setFontSize(10);
  doc.text(carrera?.nombre || '', pageWidth / 2, 16, { align: 'center' });

  // Summary info
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.text(`Total Créditos: ${carrera?.creditos_totales || 0}`, margin, 28);
  doc.text(`Precio por Crédito: $${carrera?.precio_credito || 0}`, margin + 60, 28);
  doc.text(`Duración: ${carrera?.duracion_semestres || 0} semestres`, margin + 120, 28);

  let currentY = 35;

  // Table for all semesters
  semestres.forEach((semestre) => {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    // Semester header
    doc.setFillColor(...darkColor);
    doc.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`SEMESTRE ${semestre.numero} - ${semestre.creditos} créditos`, margin + 5, currentY + 5.5);

    currentY += 10;

    // Subjects table
    const tableData = semestre.materias.map((materia) => [
      materia.codigo,
      materia.nombre,
      materia.creditos,
      materia.prerrequisitos?.map(p => p.codigo).join(', ') || '—'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Materia', 'Créditos', 'Prerrequisitos']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkColor
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: margin, right: margin },
      tableWidth: 'auto'
    });

    currentY = doc.lastAutoTable.finalY + 8;
  });

  // Footer
  doc.setFontSize(6);
  doc.setTextColor(200, 200, 200);
  doc.text(`Malla Curricular - ${carrera?.nombre || ''} - Generado el ${new Date().toLocaleDateString('es-EC')}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

  const fileName = `MALLA_${carrera?.nombre?.replace(/\s+/g, '_') || 'CARRERA'}.pdf`;
  doc.save(fileName);
  
  return fileName;
};
