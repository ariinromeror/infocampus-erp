import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Persistencia: Al cargar la app, recuperamos al usuario
    useEffect(() => {
        const storedUser = localStorage.getItem('campus_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // PASO A: Obtener el Token
            const authResponse = await fetch(`${API_URL}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const tokens = await authResponse.json();

            if (!authResponse.ok) {
                return { 
                    success: false, 
                    message: tokens.detail || tokens.error || "Error de credenciales" 
                };
            }

            // ✅ CORRECCIÓN CRÍTICA: Usar 'Token' en lugar de 'Bearer'
            const profileResponse = await fetch(`${API_URL}/user/me/`, {
                headers: {
                    'Authorization': `Token ${tokens.access}`,  // ✅ CAMBIO AQUÍ
                    'Content-Type': 'application/json'
                },
            });

            const userData = await profileResponse.json();

            if (profileResponse.ok) {
                // Unificamos todo en un solo objeto de sesión
                const sessionData = {
                    ...userData,
                    access: tokens.access,
                    refresh: tokens.refresh
                };

                setUser(sessionData);
                localStorage.setItem('campus_user', JSON.stringify(sessionData));
                return { success: true };
            }

            return { 
                success: false, 
                message: "Error al recuperar perfil del usuario" 
            };

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

    // Helpers de estado (Derivados del estado actual)
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