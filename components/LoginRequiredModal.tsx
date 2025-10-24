import React from 'react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ isOpen, onClose, onLogin }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      aria-labelledby="login-required-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full m-4 p-8 text-center" role="document">
        <h2 id="login-required-title" className="text-2xl font-bold text-slate-900 dark:text-white">
          Account Access
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          You need to be logged in to view your account details and saved progress.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <button
            onClick={onLogin}
            className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg transition-colors"
          >
            Sign In / Sign Up
          </button>
          <button
            onClick={onClose}
            className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRequiredModal;
