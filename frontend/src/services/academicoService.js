import api from './api';

export const academicoService = {
    // ==========================================
    // 1. AUTENTICACIÓN Y PERFIL
    // ==========================================
    getPerfil: () => api.get('user/me/'),

    // ==========================================
    // 2. ESTUDIANTE (Poderes Académicos y Financieros)
    // ==========================================
    // Ver materias inscritas y notas actuales
    getMisInscripciones: () => api.get('inscripciones/'),
    
    // Historial académico completo
    getMiHistorial: () => api.get('inscripciones/mi_historial/'),
    
    // EL PODER DEL PDF: Descarga el estado de cuenta real
    descargarPDF: async () => {
        try {
            const response = await api.get('finanzas/estado-cuenta/', {
                responseType: 'blob', // Crítico para archivos
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Estado_Cuenta_${new Date().getTime()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error al descargar el PDF:", error);
            throw error;
        }
    },

    // ==========================================
    // 3. PROFESOR (Gestión de Clases y Notas)
    // ==========================================
    // Ver secciones asignadas y estadísticas
    getStatsProfesor: () => api.get('profesor/dashboard/'),
    
    // Ver lista de alumnos de una sección para poner notas
    getDetalleSeccionNotas: (seccionId) => api.get(`profesor/seccion/${seccionId}/notas/`),
    
    // GUARDAR NOTAS: El poder de calificar
    postNotasSeccion: (seccionId, data) => api.post(`profesor/seccion/${seccionId}/notas/`, data),

    // ==========================================
    // 4. TESORERÍA (Control de Dinero)
    // ==========================================
    // Dashboard financiero y lista de cobranza
    getStatsFinanzas: () => api.get('finanzas/dashboard/'),
    
    // EL PODER DE COBRAR: Registra un pago en el sistema
    registrarPago: (usuarioId) => api.post(`finanzas/registrar-pago/${usuarioId}/`),

    // ==========================================
    // 5. DIRECCIÓN Y COORDINACIÓN (Poderes de Administración)
    // ==========================================
    // Métricas globales (Alumnos, Carreras, Retención)
    getStatsInstitucional: () => api.get('institucional/dashboard/'),
    
    // Ver TODAS las materias (Malla Curricular)
    getMaterias: () => api.get('materias/'),
    
    // DETALLE DE ESTUDIANTE: Ver ficha técnica de cualquier alumno
    getEstudiante: (id) => api.get(`estudiante/${id}/`),
    
    // CERRAR CICLO: El poder de finalizar el semestre y procesar aprobados/reprobados
    cerrarCiclo: () => api.post('institucional/cerrar-ciclo/'),
};