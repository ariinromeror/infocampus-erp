import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

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
            // CORRECCIÓN 1: La ruta real es /api + /auth + /login
            const targetUrl = "https://infocampus-backend.onrender.com/api/auth/login";
            
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, message: data.detail || "Credenciales incorrectas" };
            }

            // CORRECCIÓN 2: Tu backend devuelve 'access_token', no 'access' ni 'token'
            const sessionData = {
                ...data.user,
                token: data.access_token 
            };

            setUser(sessionData);
            localStorage.setItem('campus_user', JSON.stringify(sessionData));
            return { success: true };

        } catch (err) {
            console.error("Login error:", err);
            return { success: false, message: "Error de conexión" };
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