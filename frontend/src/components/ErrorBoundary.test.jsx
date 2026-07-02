/**
 * RQ-10 (docs/PRD.md): el ErrorBoundary debe reportar a Sentry cualquier
 * error de React no manejado (además de mostrar la pantalla de fallback).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Sentry } from '../services/sentry';
import ErrorBoundary from './ErrorBoundary';

vi.mock('../services/sentry', () => ({
    Sentry: { captureException: vi.fn() },
}));

function BombaDeRenderizado() {
    throw new Error('Boom de prueba');
}

describe('ErrorBoundary', () => {
    it('renderiza normalmente cuando no hay errores', () => {
        render(
            <ErrorBoundary>
                <div>contenido normal</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('contenido normal')).toBeInTheDocument();
    });

    it('muestra el fallback y reporta el error a Sentry cuando un hijo lanza', () => {
        // React logea el error en consola durante el render de prueba; se
        // silencia aquí para no ensuciar la salida del test runner.
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <BombaDeRenderizado />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
        expect(Sentry.captureException.mock.calls[0][0].message).toBe('Boom de prueba');

        consoleErrorSpy.mockRestore();
    });
});
