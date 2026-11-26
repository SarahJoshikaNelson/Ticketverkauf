import React, { createContext, useContext, useState } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { NotificationType, NotificationState } from '../types';

interface NotificationContextType {
  showNotification: (type: NotificationType, title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};

const config: Record<NotificationType, { icon: React.ReactNode; borderColor: string; iconColor: string; bgColor: string }> = {
  success: {
    icon: <CheckCircle size={48} />,
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  error: {
    icon: <AlertCircle size={48} />,
    borderColor: 'border-red-500/30',
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  info: {
    icon: <Info size={48} />,
    borderColor: 'border-primary/30',
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
  },
};

const NotificationModal: React.FC<{ notification: NotificationState | null; onClose: () => void }> = ({ notification, onClose }) => {
  if (!notification) return null;
  const { icon, borderColor, iconColor, bgColor } = config[notification.type];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-background border-2 ${borderColor} rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`${bgColor} p-6 flex justify-center`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="p-8 flex flex-col items-center text-center gap-3">
          <h3 className="text-2xl font-black text-foreground">{notification.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{notification.message}</p>
          <button
            onClick={onClose}
            className="mt-4 bg-primary text-primary-foreground px-10 py-3 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all w-full shadow-lg"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const showNotification = (type: NotificationType, title: string, message: string) =>
    setNotification({ type, title, message });

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationModal notification={notification} onClose={() => setNotification(null)} />
    </NotificationContext.Provider>
  );
};
