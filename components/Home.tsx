


import React from 'react';
import { Section, View, User } from '../types';

interface HomeProps {
  sections: Section[];
  setView: (view: View) => void;
  user: User;
}

const Home: React.FC<HomeProps> = ({ sections, setView, user }) => {
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
  
  const welcomeName = user.type === 'local' ? user.name.split(' ')[0] : 'Guest';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Welcome, {welcomeName}!</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Choose Your Section to get started.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {sections.map((section) => (
          <div
            key={section.name}
            role="button"
            tabIndex={0}
            onClick={() => setView({ name: 'section', sectionName: section.name })}
            onKeyDown={(e) => handleKeyDown(e, () => setView({ name: 'section', sectionName: section.name }))}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
          >
            <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">{section.name}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{section.description}</p>
          </div>
        ))}
      </div>
      <footer className="text-center mt-12">
        <p className="text-sm text-slate-500 dark:text-slate-400">made by-AAYUSH KUMAR</p>
      </footer>
    </div>
  );
};

export default React.memo(Home);