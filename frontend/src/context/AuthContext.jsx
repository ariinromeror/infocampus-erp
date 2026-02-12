import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);


const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

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
        const authResponse = await fetch(`${API_URL.replace(/\/$/, '')}/login`, {  
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

        
        const sessionData = {
            ...loginData.user,
            access: loginData.access_token  
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