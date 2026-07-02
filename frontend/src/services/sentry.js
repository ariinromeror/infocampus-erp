/**
 * Error tracking (RQ-10 del PRD): completamente opcional. Sin
 * `VITE_SENTRY_DSN` configurado, `initSentry()` no hace nada y
 * `Sentry.captureException` se vuelve un no-op seguro (no lanza).
 */
import * as Sentry from '@sentry/react';

export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
        console.info('[Sentry] VITE_SENTRY_DSN no configurado: error tracking deshabilitado.');
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        // Proyecto portafolio: solo error tracking, sin muestreo de performance/session replay.
        tracesSampleRate: 0,
    });
}

export { Sentry };
