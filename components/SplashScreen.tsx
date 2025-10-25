import React, { useState, useEffect } from 'react';

const SplashScreen: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // This timer handles the final fade-out of the entire component.
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4500); // Start fade out slightly before the 5s mark for a smoother transition

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="logo-container">
        {/* Simple book-like SVG logo */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-5.75-8.494v5.494a2 2 0 002 2h7.5a2 2 0 002-2v-5.494M12 6.253V4.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003M4.25 8.253V6.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003" />
        </svg>
      </div>
      <div className="relative mt-6">
        <h1 className="typewriter text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-200">
            Padhlo.com
        </h1>
      </div>
       <p className="subtitle mt-2 text-md sm:text-lg text-slate-500 dark:text-slate-400">
            Your AI-Powered Study Partner
        </p>

      {/* Embedded CSS for animations */}
      <style>{`
        @keyframes pulse {
          50% { 
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        .logo-container {
          animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .typewriter {
            display: inline-block;
            overflow: hidden;
            border-right: .15em solid #3b82f6; /* Tailwind blue-500 */
            white-space: nowrap;
            letter-spacing: .1em;
            animation:
                typing 2.5s steps(10, end),
                blink-caret .75s step-end infinite;
            width: 12ch;
        }

        @keyframes typing {
            from { width: 0 }
            to { width: 12ch; }
        }

        @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: #3b82f6; }
        }
        
        .subtitle {
            opacity: 0;
            animation: fade-in 1s ease-out 2.6s forwards; /* Start after typing animation */
        }

        @keyframes fade-in {
            to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;