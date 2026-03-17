import api from './api';

export const academicoService = {
    getPerfil: () => api.get('/auth/perfil'),

    getMisInscripciones: () => api.get('/inscripciones/estudiante/mis-inscripciones'),
    getMiHistorial: () => api.get('/inscripciones/estudiante/mis-inscripciones'),

    descargarPDF: async (estudianteId) => {
        const response = await api.get(`/reportes/estado-cuenta/${estudianteId}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Estado_Cuenta_${estudianteId}_${new Date().getTime()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    getReporteTesoreria: async (dias = 30) => {
        const response = await api.get(`/reportes/tesoreria?dias=${dias}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte_Tesoreria_${new Date().getTime()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    getReporteNotas: async (estudianteId) => {
        const response = await api.get(`/reportes/notas/${estudianteId}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Boletin_Notas_${estudianteId}_${new Date().getTime()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    getReporteInscripcion: async (inscripcionId) => {
        const response = await api.get(`/reportes/inscripcion/${inscripcionId}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Certificado_Inscripcion_${inscripcionId}_${new Date().getTime()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    getStatsProfesor: () => api.get('/dashboards/profesor'),
    getDetalleSeccionNotas: (seccionId) => api.get(`/inscripciones/seccion/${seccionId}/notas`),
    postNotasSeccion: (seccionId, data) => api.put(`/inscripciones/${seccionId}/nota`, data),
    corregirNota: (inscripcionId, data) => api.put(`/academico/inscripciones/${inscripcionId}/corregir-nota`, data),
    actualizarNota: (inscripcionId, data) => api.put(`/inscripciones/${inscripcionId}/nota`, data),

    getStatsFinanzas: () => api.get('/dashboards/finanzas'),
    registrarPago: (usuarioId, data) => api.post(`/estudiantes/${usuarioId}/registrar-pago`, data),

    getStatsInstitucional: () => api.get('/dashboards/institucional'),
    getIAContexto: () => api.get('/ia/contexto'),

    getMaterias: (params) => api.get('/academico/materias', { params }),
    getCarreras: () => api.get('/academico/carreras'),
    getEstudiante: (id) => api.get(`/estudiantes/${id}`),
    getEstadoCuenta: (id) => api.get(`/estudiantes/${id}/estado-cuenta`),
    getHorarioEstudiante: (id) => api.get(`/estudiante/${id}/horario`),

    cerrarCiclo: () => api.post('/periodos/cerrar-ciclo'),

    getPeriodos: () => api.get('/academico/periodos'),
    getPeriodoActivo: () => api.get('/periodos/activo'),
    getPeriodoEstadisticas: (id) => api.get(`/periodos/${id}/estadisticas`),
    crearPeriodo: (data) => api.post('/academico/periodos', data),
    actualizarPeriodo: (id, data) => api.put(`/academico/periodos/${id}`, data),

    getSecciones: (params) => api.get('/academico/secciones', { params }),
    crearSeccion: (data) => api.post('/academico/secciones', data),
    actualizarSeccion: (id, data) => api.put(`/academico/secciones/${id}`, data),
    getInscripcion: (id) => api.get(`/inscripciones/${id}`),

    getEstudiantesSeccion: (seccionId) => api.get(`/academico/secciones/${seccionId}/estudiantes`),

    getEstudiantes: (params) => api.get('/academico/estudiantes', { params }),

    getProfesores: (params) => api.get('/academico/profesores', { params }),
    getProfesorSecciones: (id) => api.get(`/profesor/${id}/secciones`),
    getProfesorAlumnos: (profesorId, seccionId) => api.get(`/profesor/${profesorId}/seccion/${seccionId}/alumnos`),
    getProfesorEvaluaciones: (profesorId, seccionId) => api.get(`/profesor/${profesorId}/seccion/${seccionId}/evaluaciones`),
    getProfesorAsistenciaHistorica: (profesorId, seccionId) => api.get(`/profesor/${profesorId}/seccion/${seccionId}/asistencia-historica`),
    getRendimientoProfesor: (profesorId, periodoId) => api.get(`/academico/profesores/${profesorId}/rendimiento`, { params: { periodo_id: periodoId } }),
    getHorarios: (params) => api.get('/academico/horarios', { params }),

    getUsuarios: (params) => api.get('/administrativo/usuarios', { params }),
    crearUsuario: (data) => api.post('/administrativo/usuarios', data),
    actualizarUsuario: (id, data) => api.put(`/administrativo/usuarios/${id}`, data),
    inscribirEstudiante: (data) => api.post('/administrativo/inscribir-estudiante', data),

    getTesoreroKpis: () => api.get('/tesorero/resumen-kpis'),
    getTesoreroPagos: (params) => api.get('/tesorero/pagos', { params }),
    getTesoreroMora: () => api.get('/tesorero/estudiantes-mora'),
    getTesoreroIngresos: () => api.get('/tesorero/ingresos-por-periodo'),
    buscarEstudiante: (q) => api.get('/tesorero/buscar-estudiante', { params: { q } }),

    actualizarCarrera: (id, data) => api.put(`/academico/carreras/${id}`, data),
    actualizarConvenio: (estudianteId, data) => api.put(`/estudiantes/${estudianteId}/convenio`, data),

    asignarProfesor: (seccionId, data) => api.put(`/academico/secciones/${seccionId}`, data),

    // ── Director ──────────────────────────────────────────────────────────────
    getHistorialNotas:       (params) => api.get('/director/historial-notas', { params }),
    getConfiguracion:        ()        => api.get('/director/configuracion'),
    actualizarConfiguracion: (data)    => api.put(`/director/configuracion/${data.clave}`, data),
};