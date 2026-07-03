/**
 * Tests del interceptor de axios (RQ-04 del PRD, fase frontend).
 *
 * `api.js` no expone los handlers de los interceptores directamente, así que
 * se accede a `api.interceptors.<request|response>.handlers[0]` — un patrón
 * estándar para testear interceptores de axios sin levantar un servidor real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { notificationService } from './notificationService';

vi.mock('./notificationService', () => ({
    notificationService: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import api from './api';

function getRequestInterceptor() {
    return api.interceptors.request.handlers[0];
}

function getResponseInterceptor() {
    return api.interceptors.response.handlers[0];
}

describe('api request interceptor', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('adjunta el token Bearer si hay un usuario en localStorage', async () => {
        localStorage.setItem('campus_user', JSON.stringify({ token: 'abc123', rol: 'estudiante' }));

        const config = await getRequestInterceptor().fulfilled({ headers: {} });

        expect(config.headers.Authorization).toBe('Bearer abc123');
    });

    it('no adjunta Authorization si no hay usuario en localStorage', async () => {
        const config = await getRequestInterceptor().fulfilled({ headers: {} });
        expect(config.headers.Authorization).toBeUndefined();
    });

    it('limpia localStorage corrupto sin lanzar excepción', async () => {
        localStorage.setItem('campus_user', '{esto no es json valido');

        const config = await getRequestInterceptor().fulfilled({ headers: {} });

        expect(config.headers.Authorization).toBeUndefined();
        expect(localStorage.getItem('campus_user')).toBeNull();
    });
});

describe('api response interceptor — manejo de 401', () => {
    let originalLocation;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        originalLocation = window.location;
        delete window.location;
        window.location = { ...originalLocation, href: '' };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    it('un 401 en /auth/verify limpia la sesión y redirige a /login', async () => {
        localStorage.setItem('campus_user', JSON.stringify({ token: 'abc123', rol: 'estudiante' }));
        const error = {
            response: { status: 401, data: {} },
            config: { url: '/auth/verify' },
        };

        await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error);

        expect(localStorage.getItem('campus_user')).toBeNull();
        expect(window.location.href).toBe('/login');
    });

    it('un 401 en un endpoint no crítico NO destruye la sesión', async () => {
        localStorage.setItem('campus_user', JSON.stringify({ token: 'abc123', rol: 'estudiante' }));
        const error = {
            response: { status: 401, data: {} },
            config: { url: '/dashboards/finanzas' },
        };

        await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error);

        expect(localStorage.getItem('campus_user')).not.toBeNull();
        expect(window.location.href).toBe('');
    });

    it('un 403 muestra un toast con el mensaje del servidor', async () => {
        const error = {
            response: { status: 403, data: { detail: 'Acceso restringido por mora' } },
            config: { url: '/estudiantes/1/registrar-pago' },
        };

        await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error);

        expect(notificationService.error).toHaveBeenCalledWith('Acceso restringido por mora');
    });

    it('un 403 en endpoints de dashboards no muestra toast (ya se maneja en la UI)', async () => {
        const error = {
            response: { status: 403, data: { detail: 'Sin permiso' } },
            config: { url: '/dashboards/finanzas' },
        };

        await expect(getResponseInterceptor().rejected(error)).rejects.toBe(error);

        expect(notificationService.error).not.toHaveBeenCalled();
    });
});
