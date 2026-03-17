import api from './api';

export const administrativoService = {
    getUsuarios: (params) => api.get('/administrativo/usuarios', { params }),
    crearUsuario: (data) => api.post('/administrativo/usuarios', data),
    actualizarUsuario: (id, data) => api.put(`/administrativo/usuarios/${id}`, data),
    inscribirEstudiante: (data) => api.post('/administrativo/inscribir-estudiante', data),
    primeraMatricula: (data) => api.post('/administrativo/primera-matricula', data),
};
