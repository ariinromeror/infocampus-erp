const listeners = [];

export const notificationService = {
  emit: (type, message, duration = 5000) => {
    listeners.forEach(cb => cb({ type, message, duration, id: Date.now() }));
  },
  subscribe: (callback) => {
    listeners.push(callback);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    };
  },
  success: (msg) => notificationService.emit('success', msg),
  error: (msg) => notificationService.emit('error', msg),
  warning: (msg) => notificationService.emit('warning', msg),
  info: (msg) => notificationService.emit('info', msg),
};
