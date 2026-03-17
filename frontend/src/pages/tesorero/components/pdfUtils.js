/**
 * Utilidades para generar PDFs de Tesorería
 * Genera PDFs directamente en el cliente usando window.print()
 */

const fmtMonto = (n) => new Intl.NumberFormat('es-EC', { 
  style: 'currency', 
  currency: 'USD',
  minimumFractionDigits: 2 
}).format(n || 0);

const fmtFecha = (f) => f 
  ? new Date(f).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
  : '—';

export const generarEstadoCuentaPDF = ({ estudiante, pagos, inscripciones, deudaTotal }) => {
  const fecha = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const filasPagos = (pagos || []).map(p => `
    <tr>
      <td>${fmtFecha(p.fecha_pago)}</td>
      <td>${p.concepto || 'Pago de inscripción'}</td>
      <td class="center">${fmtMonto(p.monto)}</td>
      <td class="center"><span class="badge badge-success">${p.estado || 'completado'}</span></td>
    </tr>
  `).join('');

  const filasInscripciones = (inscripciones || []).map(i => `
    <tr>
      <td>${i.materia_nombre || '—'}</td>
      <td>${i.seccion || '—'}</td>
      <td class="center">${i.periodo || '—'}</td>
      <td class="center"><span class="badge ${i.pagado ? 'badge-success' : 'badge-warning'}">${i.pagado ? 'Pagado' : 'Pendiente'}</span></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Estado de Cuenta — ${estudiante?.nombre || 'Estudiante'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 900; font-style: italic; }
    .logo span { color: #0d9488; }
    .fecha { font-size: 11px; color: #64748b; text-align: right; }
    .titulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }

    .estudiante-card { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
    .estudiante-nombre { font-size: 18px; font-weight: 900; font-style: italic; text-transform: uppercase; margin-bottom: 4px; }
    .estudiante-meta { font-size: 11px; color: #64748b; }

    .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .resumen-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; }
    .resumen-valor { font-size: 24px; font-weight: 900; font-style: italic; line-height: 1; }
    .resumen-label { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-top: 4px; }
    .verde { color: #0d9488; }
    .rojo { color: #dc2626; }
    .amarillo { color: #d97706; }

    .seccion-titulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 20px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; background: #f1f5f9; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    .center { text-align: center; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }

    @media print { body { padding: 20px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Info<span>Campus</span></div>
      <div style="margin-top:4px; text-align:left; font-size:10px; color:#64748b;">Sistema de Gestión Académica</div>
    </div>
    <div class="fecha">
      <div class="titulo">Estado de Cuenta</div>
      <div style="margin-top:4px;">${fecha}</div>
    </div>
  </div>

  <div class="estudiante-card">
    <div class="estudiante-nombre">${estudiante?.nombre || '—'}</div>
    <div class="estudiante-meta">
      Cédula: ${estudiante?.cedula || '—'} · Email: ${estudiante?.email || '—'}
      ${estudiante?.carrera ? ` · Carrera: ${estudiante.carrera}` : ''}
    </div>
  </div>

  <div class="resumen">
    <div class="resumen-box">
      <div class="resumen-valor verde">${fmtMonto(deudaTotal || 0)}</div>
      <div class="resumen-label">Deuda Total</div>
    </div>
    <div class="resumen-box">
      <div class="resumen-valor">${pagos?.length || 0}</div>
      <div class="resumen-label">Pagos Realizados</div>
    </div>
    <div class="resumen-box">
      <div class="resumen-valor">${inscripciones?.length || 0}</div>
      <div class="resumen-label">Inscripciones</div>
    </div>
  </div>

  <div class="seccion-titulo">Inscripciones</div>
  <table>
    <thead>
      <tr>
        <th>Materia</th>
        <th>Sección</th>
        <th class="center">Período</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filasInscripciones || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Sin inscripciones</td></tr>'}
    </tbody>
  </table>

  <div class="seccion-titulo">Historial de Pagos</div>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Concepto</th>
        <th class="center">Monto</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filasPagos || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">Sin pagos registrados</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>InfoCampus ERP — Tesorería</span>
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
  setTimeout(() => ventana.print(), 500);
};

export const generarReciboPagoPDF = ({ estudiante, pago, monto }) => {
  const fecha = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Pago — ${estudiante?.nombre || 'Estudiante'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 32px; max-width: 500px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 900; font-style: italic; }
    .logo span { color: #0d9488; }
    .titulo { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #0d9488; margin-top: 8px; }

    .recibo-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .estudiante-info { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0; }
    .estudiante-nombre { font-size: 16px; font-weight: 900; font-style: italic; text-transform: uppercase; }
    .estudiante-meta { font-size: 11px; color: #64748b; margin-top: 4px; }

    .monto-box { text-align: center; padding: 20px; background: #f0fdfa; border-radius: 8px; }
    .monto-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    .monto-valor { font-size: 36px; font-weight: 900; font-style: italic; color: #0d9488; margin-top: 8px; }

    .detalle { margin-top: 20px; }
    .detalle-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    .detalle-row:last-child { border-bottom: none; }
    .detalle-label { color: #64748b; }
    .detalle-valor { font-weight: bold; }

    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }

    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Info<span>Campus</span></div>
    <div class="titulo">Recibo de Pago</div>
  </div>

  <div class="recibo-box">
    <div class="estudiante-info">
      <div class="estudiante-nombre">${estudiante?.nombre || '—'}</div>
      <div class="estudiante-meta">
        Cédula: ${estudiante?.cedula || '—'} · ${estudiante?.carrera || ''}
      </div>
    </div>

    <div class="monto-box">
      <div class="monto-label">Monto Pagado</div>
      <div class="monto-valor">${fmtMonto(monto || pago?.monto)}</div>
    </div>

    <div class="detalle">
      <div class="detalle-row">
        <span class="detalle-label">Fecha de Pago</span>
        <span class="detalle-valor">${fmtFecha(pago?.fecha_pago || new Date().toISOString())}</span>
      </div>
      <div class="detalle-row">
        <span class="detalle-label">Hora</span>
        <span class="detalle-valor">${hora}</span>
      </div>
      <div class="detalle-row">
        <span class="detalle-label">Método</span>
        <span class="detalle-valor">${pago?.metodo_pago || 'Efectivo'}</span>
      </div>
      <div class="detalle-row">
        <span class="detalle-label">Referencia</span>
        <span class="detalle-valor">${pago?.referencia || '—'}</span>
      </div>
      <div class="detalle-row">
        <span class="detalle-label">Estado</span>
        <span class="detalle-valor" style="color:#059669;">COMPLETADO</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div> Sistema de Gestión Académica InfoCampus</div>
    <div style="margin-top:4px;">Documento generado el ${fecha} a las ${hora}</div>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=500,height=700');
  if (!ventana) {
    alert('Por favor permite las ventanas emergentes para generar el PDF.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 500);
};

export const generarReporteMoraPDF = ({ estudiantes, totalDeuda, fechaReporte }) => {
  const fecha = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const filas = (estudiantes || []).map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${e.nombre || '—'}</td>
      <td>${e.cedula || '—'}</td>
      <td>${e.carrera || '—'}</td>
      <td class="center">${fmtMonto(e.deuda_total)}</td>
      <td class="center">${e.inscripciones_pendientes || 0}</td>
      <td class="center"><span class="badge ${e.convenio_activo ? 'badge-success' : 'badge-warning'}">${e.convenio_activo ? 'Convenio' : 'Sin convenio'}</span></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Mora</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #dc2626; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 900; font-style: italic; }
    .logo span { color: #dc2626; }
    .fecha { font-size: 11px; color: #64748b; text-align: right; }
    .titulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }

    .resumen { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .resumen-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .resumen-valor { font-size: 28px; font-weight: 900; font-style: italic; line-height: 1; }
    .resumen-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-top: 4px; }
    .rojo { color: #dc2626; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; background: #dc2626; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
    .center { text-align: center; }

    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }

    @media print { body { padding: 20px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Info<span>Campus</span></div>
      <div style="margin-top:4px; text-align:left; font-size:10px; color:#64748b;">Sistema de Gestión Académica</div>
    </div>
    <div class="fecha">
      <div class="titulo">Reporte de Mora</div>
      <div style="margin-top:4px;">${fecha}</div>
    </div>
  </div>

  <div class="resumen">
    <div class="resumen-box">
      <div class="resumen-valor rojo">${estudiantes?.length || 0}</div>
      <div class="resumen-label">Estudiantes en Mora</div>
    </div>
    <div class="resumen-box">
      <div class="resumen-valor rojo">${fmtMonto(totalDeuda || 0)}</div>
      <div class="resumen-label">Deuda Total</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Estudiante</th>
        <th>Cédula</th>
        <th>Carrera</th>
        <th class="center">Deuda</th>
        <th class="center">Materias</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px;">Sin estudiantes en mora</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>InfoCampus ERP — Tesorería</span>
    <span>${fecha}</span>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=900,height=700');
  if (!ventana) {
    alert('Por favor permite las ventanas emergentes para generar el PDF.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 500);
};

export const generarReporteIngresosPDF = ({ periodos, ingresosTotales, pagosCompletados }) => {
  const fecha = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const filas = (periodos || []).map((p, i) => `
    <tr>
      <td>${p.codigo || '—'}</td>
      <td>${p.nombre || '—'}</td>
      <td class="center">${p.pagos_completados || 0}</td>
      <td class="center">${p.pagos_pendientes || 0}</td>
      <td class="center">${fmtMonto(p.ingresos_totales)}</td>
      <td class="center"><span class="badge ${p.activo ? 'badge-success' : ''}">${p.activo ? 'Activo' : 'Cerrado'}</span></td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Ingresos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 900; font-style: italic; }
    .logo span { color: #0d9488; }
    .fecha { font-size: 11px; color: #64748b; text-align: right; }
    .titulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }

    .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .resumen-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
    .resumen-valor { font-size: 28px; font-weight: 900; font-style: italic; line-height: 1; }
    .resumen-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-top: 4px; }
    .verde { color: #0d9488; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; background: #0d9488; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
    .center { text-align: center; }

    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; }
    .badge-success { background: #d1fae5; color: #065f46; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }

    @media print { body { padding: 20px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Info<span>Campus</span></div>
      <div style="margin-top:4px; text-align:left; font-size:10px; color:#64748b;">Sistema de Gestión Académica</div>
    </div>
    <div class="fecha">
      <div class="titulo">Reporte de Ingresos</div>
      <div style="margin-top:4px;">${fecha}</div>
    </div>
  </div>

  <div class="resumen">
    <div class="resumen-box">
      <div class="resumen-valor verde">${periodos?.length || 0}</div>
      <div class="resumen-label">Períodos</div>
    </div>
    <div class="resumen-box">
      <div class="resumen-valor verde">${pagosCompletados || 0}</div>
      <div class="resumen-label">Pagos Completados</div>
    </div>
    <div class="resumen-box">
      <div class="resumen-valor verde">${fmtMonto(ingresosTotales || 0)}</div>
      <div class="resumen-label">Ingresos Totales</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Período</th>
        <th class="center">Pagos</th>
        <th class="center">Pendientes</th>
        <th class="center">Ingresos</th>
        <th class="center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">Sin datos</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>InfoCampus ERP — Tesorería</span>
    <span>${fecha}</span>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=900,height=700');
  if (!ventana) {
    alert('Por favor permite las ventanas emergentes para generar el PDF.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 500);
};
