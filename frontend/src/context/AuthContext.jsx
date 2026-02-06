import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);
const API_URL = "https://infocampus-backend.onrender.com/api";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('campus_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const authResponse = await fetch(`${API_URL}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const loginData = await authResponse.json();

            if (!authResponse.ok) {
                return { 
                    success: false, 
                    message: loginData.detail || loginData.error || "Error de credenciales" 
                };
            }

            // ✅ El login ya retorna 'user' con todos los datos
            const sessionData = {
                ...loginData.user,
                access: loginData.access
            };

            setUser(sessionData);
            localStorage.setItem('campus_user', JSON.stringify(sessionData));
            return { success: true };

        } catch (err) {
            console.error("Error en login:", err);
            return { 
                success: false, 
                message: "Error de conexión con el servidor" 
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('campus_user');
        window.location.href = '/login';
    };

    const isAdmin = user?.rol === 'director' || user?.rol === 'coordinador';
    const isStudent = user?.rol === 'estudiante';
    const isBlocked = user?.en_mora === true;

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            logout, 
            loading, 
            isAdmin, 
            isStudent, 
            isBlocked 
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);