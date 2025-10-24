
import React, { useState } from 'react';
import { View } from '../types';

interface ResetPasswordViewProps {
  email: string;
  onResetPassword: (email: string, otp: string, newPass: string) => string | null;
  setView: (view: View) => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ email, onResetPassword, setView }) => {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!otp.trim() || !newPassword.trim()) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
     if (newPassword.length < 6) {
        setError("New password must be at least 6 characters long.");
        return;
    }
    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
        const result = onResetPassword(email, otp, newPassword);
        if (result) {
          setError(result);
          setLoading(false);
        } else {
            setSuccess("Password successfully reset. Redirecting to sign in...");
            setTimeout(() => {
                setView({ name: 'signIn' });
            }, 2500); // Wait 2.5 seconds to allow user to read message
        }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-4">Reset Your Password</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Enter the OTP from the console and your new password.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300">OTP Code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={!!success}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="new-password"className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={!!success}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
             <div>
              <label htmlFor="confirm-new-password"className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!!success}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>
            
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:bg-slate-400"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
           <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <button onClick={() => setView({ name: 'signIn' })} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
