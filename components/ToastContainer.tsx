import React from 'react';
import { Toast, ToastType } from '../types';

interface ToastMessageProps {
  toast: Toast;
  onClose: (id: number) => void;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ toast, onClose }) => {
  const baseClasses = 'relative w-full max-w-sm p-4 rounded-lg shadow-2xl flex items-start space-x-4 transition-all duration-300 ease-in-out';
  
  const typeClasses: { [key in ToastType]: string } = {
    success: 'bg-green-100 dark:bg-green-900/80 border-l-4 border-green-500',
    error: 'bg-red-100 dark:bg-red-900/80 border-l-4 border-red-500',
    info: 'bg-blue-100 dark:bg-blue-900/80 border-l-4 border-blue-500',
  };

  // Fix: Replaced JSX.Element with React.ReactElement to resolve namespace issue.
  const icon: { [key in ToastType]: React.ReactElement } = {
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const textColor: { [key in ToastType]: string } = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    info: 'text-blue-800 dark:text-blue-200',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[toast.type]} animate-toast-in`}>
      <div className="flex-shrink-0">{icon[toast.type]}</div>
      <div className={`flex-grow ${textColor[toast.type]}`}>
        <p className="font-medium text-sm">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Close notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${textColor[toast.type]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};


interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in {
          animation: toast-in 0.3s ease-out forwards;
        }
      `}</style>
      <div className="fixed top-20 right-4 z-50 space-y-3">
        {toasts.map(toast => (
          <ToastMessage key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </>
  );
};

export default ToastContainer;