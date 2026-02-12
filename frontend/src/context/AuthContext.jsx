import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

/**
 * CONFIGURACIÓN DE LA API
 * -----------------------
 * 1. Obtiene la URL de las variables de entorno o usa localhost por defecto.
 * 2. .replace(/\/$/, '') -> ESTO ES CRÍTICO: Elimina cualquier barra "/" al final
 * para asegurar que la concatenación de rutas siempre sea perfecta.
 */
const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, '');

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Al cargar la app, verificamos si ya hay sesión guardada
    useEffect(() => {
        const storedUser = localStorage.getItem('campus_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Error al leer sesión guardada", e);
                localStorage.removeItem('campus_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // Construcción segura de la URL: .../api/login
            // Backend espera: POST a /api/login (definido en auth.py con prefix="" y main.py con prefix="/api")
            const targetUrl = `${API_BASE}/login`;
            
            console.log(`📡 Intentando login en: ${targetUrl}`);

            const authResponse = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const loginData = await authResponse.json();

            if (!authResponse.ok) {
                console.warn("⚠️ Login fallido:", loginData);
                return { 
                    success: false, 
                    message: loginData.detail || "Credenciales incorrectas" 
                };
            }

            // Normalización de datos para el frontend
            const sessionData = {
                ...loginData.user,
                access: loginData.access_token // Guardamos el token junto al usuario
            };

            setUser(sessionData);
            localStorage.setItem('campus_user', JSON.stringify(sessionData));
            
            return { success: true };

        } catch (err) {
            console.error("❌ Error de red o servidor:", err);
            return { 
                success: false, 
                message: "No se pudo conectar con el servidor. Verifica tu conexión." 
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('campus_user');
        // Redirección forzada al login para limpiar estado visual
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            loading,
            // Helpers directos para evitar lógica en las vistas
            isAdmin: user?.rol === 'director' || user?.rol === 'coordinador',
            isStudent: user?.rol === 'estudiante',
            isTeacher: user?.rol === 'profesor'
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);