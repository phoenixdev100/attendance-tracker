import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const hideToast = () => setToast(null);

  const toastClass = toast
    ? {
        success: 'bg-green-500 text-white',
        error: 'bg-rose-500 text-slate-50',
        warning: 'bg-yellow-500 text-gray-900',
        info: 'bg-blue-500 text-white',
      }[toast.type] || 'bg-rose-500 text-slate-50'
    : '';

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium z-50 ${toastClass}`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
