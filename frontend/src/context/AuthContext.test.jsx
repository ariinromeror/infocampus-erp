/**
 * Tests de `AuthContext` (RQ-04 del PRD, fase frontend): login, logout y
 * restauración/expiración de sesión desde localStorage.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../services/api';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/api', () => ({
    default: { get: vi.fn(), post: vi.fn() },
}));

function Probe() {
    const { user, login, logout, loading } = useAuth();
    return (
        <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="user">{user ? user.rol : 'ninguno'}</span>
            <button onClick={() => login('juan', 'clave123')}>login</button>
            <button onClick={() => logout()}>logout</button>
        </div>
    );
}

function renderWithProvider() {
    return render(
        <AuthProvider>
            <Probe />
        </AuthProvider>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('login exitoso guarda el usuario en el contexto y en localStorage', async () => {
        api.post.mockResolvedValueOnce({
            data: {
                access_token: 'token-123',
                user: { id: 1, rol: 'tesorero', cedula: '001', email: 'juan@test.com', nombre_completo: 'Juan Test' },
            },
        });

        renderWithProvider();
        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

        await act(async () => {
            screen.getByText('login').click();
        });

        expect(screen.getByTestId('user')).toHaveTextContent('tesorero');
        const stored = JSON.parse(localStorage.getItem('campus_user'));
        expect(stored.token).toBe('token-123');
        expect(stored.rol).toBe('tesorero');
    });

    it('login fallido no guarda sesión y devuelve el mensaje de error del servidor', async () => {
        api.post.mockRejectedValueOnce({ response: { data: { detail: 'Credenciales inválidas' } } });

        let resultado;
        function ProbeConResultado() {
            const { login } = useAuth();
            return (
                <button
                    onClick={async () => {
                        resultado = await login('juan', 'mala-clave');
                    }}
                >
                    login
                </button>
            );
        }

        render(
            <AuthProvider>
                <ProbeConResultado />
            </AuthProvider>
        );

        await act(async () => {
            screen.getByText('login').click();
        });

        expect(resultado).toEqual({ success: false, error: 'Credenciales inválidas' });
        expect(localStorage.getItem('campus_user')).toBeNull();
    });

    it('logout limpia el usuario del contexto y de localStorage', async () => {
        localStorage.setItem(
            'campus_user',
            JSON.stringify({ token: 'token-123', rol: 'tesorero' })
        );
        api.get.mockResolvedValueOnce({ data: { valid: true } });
        api.post.mockResolvedValueOnce({ data: { detail: 'Sesión cerrada' } });

        renderWithProvider();
        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('tesorero'));

        await act(async () => {
            screen.getByText('logout').click();
        });

        expect(screen.getByTestId('user')).toHaveTextContent('ninguno');
        expect(localStorage.getItem('campus_user')).toBeNull();
    });

    it('si /auth/verify responde 401 al restaurar sesión, se limpia el usuario', async () => {
        localStorage.setItem(
            'campus_user',
            JSON.stringify({ token: 'token-expirado', rol: 'estudiante' })
        );
        api.get.mockRejectedValueOnce({ response: { status: 401 } });

        renderWithProvider();

        await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('ninguno'));
        expect(localStorage.getItem('campus_user')).toBeNull();
    });

    it('si /auth/verify falla por red (no 401), la sesión local se conserva', async () => {
        localStorage.setItem(
            'campus_user',
            JSON.stringify({ token: 'token-valido', rol: 'director' })
        );
        api.get.mockRejectedValueOnce({ response: { status: 500 } });

        renderWithProvider();

        await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
        expect(screen.getByTestId('user')).toHaveTextContent('director');
        expect(localStorage.getItem('campus_user')).not.toBeNull();
    });
});
