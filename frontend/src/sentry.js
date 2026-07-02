// Inicialización opcional de Sentry (captura de errores en frontend).
//
// Sin VITE_SENTRY_DSN configurado (por defecto en desarrollo local), esta
// función no hace nada y la app funciona exactamente igual, solo sin
// reporte de errores. En producción, define VITE_SENTRY_DSN en las
// variables de entorno de Vercel para activarlo.
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Trazas de performance a una tasa baja: suficiente para detectar
    // degradación sin generar volumen excesivo de eventos en el plan free.
    tracesSampleRate: 0.1,
    // No se capturan reproducciones de sesión (session replay) para evitar
    // filtrar datos sensibles de estudiantes/pagos en pantalla.
    sendDefaultPii: false,
  });
}

/**
 * Adjunta contexto mínimo de usuario (id + rol, nunca datos sensibles) a
 * los eventos de Sentry, para poder correlacionar errores por rol sin
 * exponer nombres, cédulas ni credenciales.
 */
export function setSentryUserContext(user) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: String(user.id ?? user.usuario_id ?? 'unknown'), role: user.rol });
}

export { Sentry };
