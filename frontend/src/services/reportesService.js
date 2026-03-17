import api from './api';

export const reportesService = {
    getReporteTesoreria: async (dias = 30) => {
        const response = await api.get(`/reportes/tesoreria?dias=${dias}`, { responseType: 'blob' });
        return response.data;
    },

    getCertificadoInscripcion: async (inscripcionId) => {
        const response = await api.get(`/reportes/inscripcion/${inscripcionId}`, { responseType: 'blob' });
        return response.data;
    },

    getEstadoCuenta: async (estudianteId) => {
        const response = await api.get(`/reportes/estado-cuenta/${estudianteId}`, { responseType: 'blob' });
        return response.data;
    },

    getBoletinNotas: async (estudianteId) => {
        const response = await api.get(`/reportes/notas/${estudianteId}`, { responseType: 'blob' });
        return response.data;
    },
};
