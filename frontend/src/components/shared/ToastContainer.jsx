import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

const ICONS = {
  success: { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  error: { Icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  info: { Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
};

const ToastItem = ({ notification, onClose }) => {
  const { Icon, color, bg } = ICONS[notification.type] || ICONS.info;

  useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => onClose(notification.id), notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg ${bg} max-w-sm`}
    >
      <Icon size={18} className={color} />
      <p className="text-sm font-medium text-slate-700 flex-1">{notification.message}</p>
      <button onClick={() => onClose(notification.id)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
        <X size={14} className="text-slate-400" />
      </button>
    </motion.div>
  );
};

const ToastContainer = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [...prev, notification]);
    });
    return unsubscribe;
  }, []);

  const handleClose = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <ToastItem notification={n} onClose={handleClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
