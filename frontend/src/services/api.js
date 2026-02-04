import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: { 'Content-Type': 'application/json' },
});


api.interceptors.request.use(
    (config) => {
        const userData = localStorage.getItem('campus_user');
        if (userData) {
            const user = JSON.parse(userData);
            if (user.access) config.headers.Authorization = `Token ${user.access}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


api.interceptors.response.use(
    (response) => response,
    (error) => {
        
        if (error.response?.status === 401) {
            localStorage.removeItem('campus_user');
            window.location.href = '/login';
        }
        
        
        if (error.response?.status === 403) {
            const serverMsg = error.response.data.error || "Acceso restringido por tesorería.";
            alert(`SISTEMA: ${serverMsg}`);
        }
        
        return Promise.reject(error);
    }
);

export default api;