
import React, { useState, useRef } from 'react';
import { View, LocalUser } from '../types';

interface SignInViewProps {
  onSignIn: (email: string, pass: string) => string | null;
  setView: (view: View) => void;
  onGuestLogin: () => void;
  savedAccounts: LocalUser[];
  onForgetUser: (email: string) => void;
}

const SignInView: React.FC<SignInViewProps> = ({ onSignIn, setView, onGuestLogin, savedAccounts, onForgetUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    const result = onSignIn(email, password);
    if (result) {
      setError(result);
    }
  };

  const handleAccountSelect = (account: LocalUser) => {
      setEmail(account.email);
      setSelectedAccountEmail(account.email);
      setPassword(''); // Clear password field
      passwordInputRef.current?.focus();
  };
  
  const handleForgetClick = (e: React.MouseEvent, email: string) => {
    e.stopPropagation(); // prevent selecting the account
    onForgetUser(email);
    if (selectedAccountEmail === email) {
      setSelectedAccountEmail(null);
      setEmail('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-5.75-8.494v5.494a2 2 0 002 2h7.5a2 2 0 002-2v-5.494M12 6.253V4.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003M4.25 8.253V6.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003" />
          </svg>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-4">Sign In to Padhlo.com</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
          {savedAccounts && savedAccounts.length > 0 && (
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-center text-slate-700 dark:text-slate-300 mb-4">Choose an account</h2>
                <div className="flex flex-wrap justify-center gap-4">
                    {savedAccounts.map(account => (
                        <div key={account.email} className="relative group">
                          <button
                              type="button"
                              onClick={() => handleAccountSelect(account)}
                              className={`p-3 border-2 rounded-lg flex flex-col items-center w-28 text-center transition-all ${selectedAccountEmail === account.email ? 'border-blue-500 bg-blue-50 dark:bg-slate-700' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                          >
                              <img src={account.picture} alt={account.name} className="w-16 h-16 rounded-full mb-2" />
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate w-full">{account.name.split(' ')[0]}</span>
                          </button>
                          <button 
                              onClick={(e) => handleForgetClick(e, account.email)}
                              className="absolute -top-1 -right-1 bg-slate-200 dark:bg-slate-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                              aria-label={`Forget ${account.name}`}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                          </button>
                        </div>
                    ))}
                </div>
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
                </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative mt-1">
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-sm text-right mt-2">
                <button
                    type="button"
                    onClick={() => setView({ name: 'forgotPassword' })}
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Forgot password?
                </button>
              </div>
            </div>
            
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </form>
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
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <button onClick={() => setView({ name: 'signUp' })} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInView;
