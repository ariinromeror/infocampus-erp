/**
 * API client with JWT interceptor. Token from localStorage is attached to every request.
 * 401 on auth endpoints (/auth/login, /auth/verify, /auth/perfil) triggers logout + redirect.
 * 403 shows toast with server message.
 */
import axios from 'axios';
import { notificationService } from './notificationService';

const api = axios.create({
    // En producción configurar VITE_API_URL con la URL del backend en Render/Railway.
    // En desarrollo local cae a localhost sin proxy (CORS permitido en backend).
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
    headers: { 'Content-Type': 'application/json' },
    // FIX: aumentado de 30s a 60s — Supabase free tier puede tardar en despertar
    // y las queries con JOIN sobre muchas tablas pueden tardar 5-15s.
    timeout: 60000,
});

// Interceptor para añadir token a cada request
api.interceptors.request.use(
    (config) => {
        const userData = localStorage.getItem('campus_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            } catch {
                // localStorage corrupto — limpiar silenciosamente
                localStorage.removeItem('campus_user');
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // FIX: Solo cerrar sesión si el error viene de endpoints de autenticación.
            // Antes, cualquier 401 (incluso de endpoints opcionales del dashboard)
            // destruía la sesión y expulsaba al usuario aunque su token fuera válido.
            const url = error.config?.url || '';
            const esCritico =
                url.includes('/auth/login') ||
                url.includes('/auth/verify') ||
                url.includes('/auth/perfil');

            if (esCritico) {
                localStorage.removeItem('campus_user');
                window.location.href = '/login';
            } else {
                // Para endpoints no críticos solo logear, no expulsar
                console.warn(`[API] 401 en endpoint no crítico: ${url}`);
            }
        }

        // Acceso bloqueado por mora u otro 403
        if (error.response?.status === 403) {
            const serverMsg =
                error.response.data?.error ||
                error.response.data?.detail ||
                'Acceso restringido.';
            const url = error.config?.url || '';
            if (!url.includes('/dashboards/')) {
                notificationService.error(serverMsg);
            }
        }

        // FIX: Timeout — mostrar mensaje amigable en lugar de pantalla en blanco
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.warn(`[API] Timeout en: ${error.config?.url}`);
            // No expulsamos al usuario, solo dejamos que el componente maneje el error
        }

        return Promise.reject(error);
    }
);

export default api;