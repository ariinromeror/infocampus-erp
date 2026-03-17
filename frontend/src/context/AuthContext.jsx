import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider — Manages authentication state and session restoration.
 * Blocks the component tree until localStorage is read to prevent race conditions
 * where child components would fire API requests without a token (causing 401s).
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const storedUser = localStorage.getItem('campus_user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser?.token && parsedUser?.rol) {
                        try {
                            await api.get('/auth/verify');
                            setUser(parsedUser);
                        } catch (verifyError) {
                            if (verifyError.response?.status === 401) {
                                localStorage.removeItem('campus_user');
                                setUser(null);
                            } else {
                                setUser(parsedUser);
                            }
                        }
                    } else {
                        localStorage.removeItem('campus_user');
                    }
                }
            } catch {
                localStorage.removeItem('campus_user');
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    const login = useCallback(async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const loginResponse = response.data;

            const userData = {
                username: loginResponse.user.email || loginResponse.user.cedula,
                rol:      loginResponse.user.rol,
                role:     loginResponse.user.rol,
                token:    loginResponse.access_token,
                id:       loginResponse.user.id,
                email:    loginResponse.user.email,
                cedula:   loginResponse.user.cedula,
                nombre:   loginResponse.user.nombre_completo,
                carrera:  loginResponse.user.carrera_nombre || null,
            };

            setUser(userData);
            localStorage.setItem('campus_user', JSON.stringify(userData));

            return { success: true, rol: loginResponse.user.rol };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || 'Error de conexión con el servidor',
            };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const storedUser = localStorage.getItem('campus_user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed?.token) {
                    await api.post('/auth/logout', {}, {
                        headers: { Authorization: `Bearer ${parsed.token}` }
                    });
                }
            }
        } catch {
            // Ignore logout API errors; still clear local state
        } finally {
            setUser(null);
            localStorage.removeItem('campus_user');
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {loading ? (
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);