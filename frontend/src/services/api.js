import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor para añadir token a cada request
api.interceptors.request.use(
    (config) => {
        const userData = localStorage.getItem('campus_user');
        if (userData) {
            const user = JSON.parse(userData);
            // ✅ CORREGIDO: Usar user.token que mapeamos en AuthContext
            if (user.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
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
        // Sesión expirada o no autorizado
        if (error.response?.status === 401) {
            localStorage.removeItem('campus_user');
            window.location.href = '/login';
        }
        
        // Acceso bloqueado por mora
        if (error.response?.status === 403) {
            const serverMsg = error.response.data.error || error.response.data.detail || "Acceso restringido por tesorería.";
            alert(`SISTEMA: ${serverMsg}`);
        }
        
        return Promise.reject(error);
    }
);

export default api;