import React from 'react';
import { View, User } from '../types';

type FontSize = 'sm' | 'base' | 'lg';

// Fix: Add isDarkMode and updateTheme to props to align with App.tsx state management.
interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  setView: (view: View) => void;
  isDarkMode: boolean;
  updateTheme: (isDark: boolean) => void;
  fontSize: FontSize;
  updateFontSize: (size: FontSize) => void;
  onLogout: () => void;
  onSubscriptionClick: () => void;
  user: User;
  onOpenLoginRequiredModal: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  isOpen, 
  onClose, 
  setView,
  isDarkMode,
  updateTheme,
  fontSize, 
  updateFontSize, 
  onLogout, 
  onSubscriptionClick,
  user,
  onOpenLoginRequiredModal
}) => {
  const handleThemeToggle = () => {
    updateTheme(!isDarkMode);
  };

  const handleNavigation = (view: View) => {
    setView(view);
    onClose();
  };
  
  const handleAccountClick = () => {
    if (user.type === 'guest') {
      onOpenLoginRequiredModal();
      onClose();
    } else {
      handleNavigation({ name: 'account' });
    }
  };
  
  const handleSubscriptionClick = () => {
    onSubscriptionClick();
    onClose();
  };

  const handleDecreaseFont = () => {
    if (fontSize === 'lg') updateFontSize('base');
    else if (fontSize === 'base') updateFontSize('sm');
  };

  const handleIncreaseFont = () => {
    if (fontSize === 'sm') updateFontSize('base');
    else if (fontSize === 'base') updateFontSize('lg');
  };
  
  const handleLogout = () => {
    onLogout();
    onClose();
  };


  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
        aria-label="Close settings"
      ></div>

      {/* Panel */}
      <div 
        className={`absolute top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Settings</h2>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close settings panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-grow p-4 overflow-y-auto">
            <nav className="space-y-2">
              <button 
                onClick={handleAccountClick}
                className="w-full flex items-center p-3 text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-slate-700 dark:text-slate-300">Account</span>
              </button>
               <button 
                onClick={handleSubscriptionClick}
                className="w-full flex items-center p-3 text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-slate-700 dark:text-slate-300">Subscription</span>
              </button>
              <button 
                onClick={() => handleNavigation({ name: 'scoreBoard' })}
                className="w-full flex items-center p-3 text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-slate-700 dark:text-slate-300">Score Board</span>
              </button>
              <div className="w-full flex items-center justify-between p-3 text-left">
                  <div className="flex items-center">
                      {isDarkMode ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                      ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                      )}
                      <span className="text-slate-700 dark:text-slate-300">Theme</span>
                  </div>
                  <button
                      onClick={handleThemeToggle}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${isDarkMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                  >
                      <span
                          className={`${ isDarkMode ? 'translate-x-6' : 'translate-x-1' } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
                      />
                  </button>
              </div>
              <div className="w-full flex items-center justify-between p-3 text-left">
                  <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="text-slate-700 dark:text-slate-300">Font Size</span>
                  </div>
                  <div className="flex items-center space-x-1">
                      <button 
                          onClick={handleDecreaseFont} 
                          disabled={fontSize === 'sm'}
                          className="px-3 py-1 text-sm rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Decrease font size"
                      >
                          A-
                      </button>
                       <button 
                          onClick={handleIncreaseFont} 
                          disabled={fontSize === 'lg'}
                          className="px-3 py-1 text-sm rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Increase font size"
                      >
                          A+
                      </button>
                  </div>
              </div>
              <button 
                onClick={() => handleNavigation({ name: 'about' })}
                className="w-full flex items-center p-3 text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-slate-700 dark:text-slate-300">About Us</span>
              </button>
              <button 
                onClick={() => handleNavigation({ name: 'feedback' })}
                className="w-full flex items-center p-3 text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-slate-700 dark:text-slate-300">Feedback / Suggestion</span>
              </button>
              <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center p-3 text-left rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-semibold text-red-500">Logout</span>
                </button>
              </div>
            </nav>
          </div>
          
          {/* Watermark */}
          <div className="p-4 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">made by-AAYUSH KUMAR</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;