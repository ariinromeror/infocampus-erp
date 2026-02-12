import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

// Usamos la variable de Vercel que ya auditamos
const API_BASE = (import.meta.env.VITE_API_URL || "https://infocampus-backend.onrender.com/api").replace(/\/$/, '');

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('campus_user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } 
            catch (e) { localStorage.removeItem('campus_user'); }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // IMPORTANTE: Se agrega la barra "/" final para coincidir con tu ruta @app.post("/api/login/")
            const targetUrl = `${API_BASE}/login/`;
            
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, message: data.detail || "Credenciales incorrectas" };
            }

            // Mapeo según tu TokenResponse de Python: usamos data.access
            const sessionData = {
                ...data.user,
                token: data.access 
            };

            setUser(sessionData);
            localStorage.setItem('campus_user', JSON.stringify(sessionData));
            return { success: true };

        } catch (err) {
            return { success: false, message: "Servidor no disponible" };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('campus_user');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ 
            user, login, logout, loading,
            isAdmin: user?.rol === 'director' || user?.rol === 'coordinador',
            isStudent: user?.rol === 'estudiante'
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);