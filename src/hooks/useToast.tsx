import React, { useState, useEffect, createContext, useContext } from 'react';

// Tipos
export type ToastVariant = 'default' | 'destructive' | 'success';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  toasts: Toast[];
}

// Contexto
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Componente Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = (newToast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, ...newToast }]);
  };

  const dismiss = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ show, dismiss, toasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Hook para usar o Toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Componente Container
const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-end justify-start p-4 pointer-events-none space-y-4 max-h-screen overflow-hidden">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
};

// Componente Item
const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const { title, description, variant = 'default', duration = 5000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-500 text-white';
      case 'success':
        return 'bg-green-500 text-white';
      default:
        return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-lg shadow-lg ${getVariantClasses()} border border-gray-200 dark:border-gray-700 p-4 transform transition-all duration-300 ease-in-out`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-1">
          {title && <div className="font-semibold">{title}</div>}
          {description && <div className="mt-1 text-sm">{description}</div>}
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 inline-flex shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <span className="sr-only">Close</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}; 