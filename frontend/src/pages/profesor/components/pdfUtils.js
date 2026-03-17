/**
 * Genera e imprime un PDF del perfil/boletín de un alumno
 * directamente en el cliente, sin depender del backend.
 * Usa la API nativa window.print() con estilos de impresión.
 */

const TIPOS_LABEL = {
  parcial_1: 'Parcial 1',
  parcial_2: 'Parcial 2',
  talleres: 'Talleres',
  examen_final: 'Examen Final',
};

export const generarBoletinPDF = ({ alumno, evaluaciones, seccionNombre, periodo }) => {
  const evals = evaluaciones || [];
  const nota = alumno.nota_final != null ? parseFloat(alumno.nota_final).toFixed(2) : '—';
  const aprobado = alumno.nota_final != null && parseFloat(alumno.nota_final) >= 7;
  const asistencia = alumno.porcentaje_asistencia != null ? `${alumno.porcentaje_asistencia}%` : '—';
  const fecha = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });

  const filasEvals = evals
    .filter(e => e.nota != null)
    .map(e => `
      <tr>
        <td>${TIPOS_LABEL[e.tipo] || e.tipo}</td>
        <td class="center">${parseFloat(e.nota).toFixed(2)}</td>
        <td class="center">${e.peso != null ? `${e.peso}%` : '—'}</td>
        <td class="center ${parseFloat(e.nota) >= 7 ? 'aprobado' : 'reprobado'}">${parseFloat(e.nota) >= 7 ? 'Aprobado' : 'Reprobado'}</td>
      </tr>
    `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boletín — ${alumno.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 900; font-style: italic; letter-spacing: -0.5px; }
    .logo span { color: #4f46e5; }
    .fecha { font-size: 11px; color: #64748b; text-align: right; }
    .titulo { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }

    .alumno-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
    .alumno-nombre { font-size: 20px; font-weight: 900; font-style: italic; text-transform: uppercase; margin-bottom: 4px; }
    .alumno-meta { font-size: 12px; color: #64748b; }

    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }
    .stat-valor { font-size: 28px; font-weight: 900; font-style: italic; line-height: 1; }
    .stat-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-top: 4px; }
    .verde { color: #059669; }
    .rojo { color: #dc2626; }
    .azul { color: #4f46e5; }

    .seccion-titulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; border-top: 1px solid #e2e8f0; padding-top: 16px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; background: #f1f5f9; padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .center { text-align: center; }
    .aprobado { color: #059669; font-weight: bold; }
    .reprobado { color: #dc2626; font-weight: bold; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }

    .estado-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
    .estado-aprobado { background: #d1fae5; color: #065f46; }
    .estado-reprobado { background: #fee2e2; color: #991b1b; }
    .estado-pendiente { background: #f1f5f9; color: #475569; }

    @media print {
      body { padding: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Info<span>Campus</span></div>
      <div class="fecha" style="margin-top:4px; text-align:left; font-size:11px; color:#64748b;">Sistema de Gestión Académica</div>
    </div>
    <div class="fecha">
      <div class="titulo">Boletín Académico</div>
      <div style="margin-top:4px;">${fecha}</div>
      ${periodo ? `<div style="margin-top:2px;">Período: ${periodo}</div>` : ''}
    </div>
  </div>

  <div class="alumno-card">
    <div class="alumno-nombre">${alumno.nombre}</div>
    <div class="alumno-meta">
      Cédula: ${alumno.cedula || '—'}
      ${seccionNombre ? ` · Sección: ${seccionNombre}` : ''}
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-valor ${alumno.nota_final != null ? (aprobado ? 'verde' : 'rojo') : ''}">${nota}</div>
      <div class="stat-label">Nota Final</div>
    </div>
    <div class="stat">
      <div class="stat-valor ${alumno.porcentaje_asistencia != null && alumno.porcentaje_asistencia < 75 ? 'rojo' : 'verde'}">${asistencia}</div>
      <div class="stat-label">Asistencia</div>
    </div>
    <div class="stat">
      <div class="stat-valor azul">${evals.length}</div>
      <div class="stat-label">Evaluaciones</div>
    </div>
  </div>

  <div class="seccion-titulo">Estado del Alumno</div>
  <p style="margin-bottom:20px;">
    <span class="estado-badge ${alumno.nota_final != null ? (aprobado ? 'estado-aprobado' : 'estado-reprobado') : 'estado-pendiente'}">
      ${alumno.nota_final != null ? (aprobado ? '✓ Aprobado' : '✗ Reprobado') : 'Nota pendiente'}
    </span>
    ${alumno.porcentaje_asistencia != null && alumno.porcentaje_asistencia < 75
      ? '<span class="estado-badge estado-reprobado" style="margin-left:8px;">⚠ Riesgo de asistencia</span>'
      : ''}
  </p>

  ${evals.length > 0 ? `
  <div class="seccion-titulo">Evaluaciones Parciales</div>
  <table>
    <thead>
      <tr>
        <th>Evaluación</th>
        <th class="center">Nota</th>
        <th class="center">Peso</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filasEvals}
    </tbody>
  </table>
  ` : '<p style="color:#94a3b8; font-size:12px; margin-bottom:20px;">Sin evaluaciones parciales registradas.</p>'}

  <div class="footer">
    <span>InfoCampus ERP — Documento generado automáticamente</span>
    <span>${fecha}</span>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=850,height=700');
  if (!ventana) {
    alert('Por favor permite las ventanas emergentes para generar el PDF.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => {
    ventana.print();
  }, 500);
};

export default generarBoletinPDF;
