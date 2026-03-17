import api from './api';

export const tesoreroService = {
    getPeriodos: () => api.get('/tesorero/periodos'),
    getBecados: () => api.get('/tesorero/becas'),
    asignarBeca: (estudianteId, porcentajeBeca, tipoBeca) => 
        api.post(`/tesorero/becas/${estudianteId}`, { 
            porcentaje_beca: porcentajeBeca, 
            tipo_beca: tipoBeca 
        }),
};
