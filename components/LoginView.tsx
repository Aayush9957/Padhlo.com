import React from 'react';
import { View } from '../types';

interface LoginViewProps {
  setView: (view: View) => void;
  onGuestLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ setView, onGuestLogin }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 text-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-5.75-8.494v5.494a2 2 0 002 2h7.5a2 2 0 002-2v-5.494M12 6.253V4.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003M4.25 8.253V6.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003" />
            </svg>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200 mt-4">Welcome to Padhlo.com</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Your AI-Powered Study Partner</p>
        </div>

        <div className="space-y-4">
            <button
              onClick={() => setView({ name: 'signIn'})}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>

             <button
              onClick={() => setView({ name: 'signUp'})}
              className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-semibold text-slate-700 dark:text-slate-200"
            >
              Sign Up
            </button>
            
            <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
                <span className="flex-shrink mx-4 text-slate-500 dark:text-slate-400 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            </div>

            <button
              onClick={onGuestLogin}
              className="w-full py-3 px-4 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors"
            >
              Continue as Guest
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;