

import React from 'react';
import { Section, View } from '../types';

interface SectionViewProps {
  section: Section;
  setView: (view: View) => void;
}

const SectionView: React.FC<SectionViewProps> = ({ section, setView }) => {
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{section.name}</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Select a subject to view chapters.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {section.subjects.map((subject) => (
          <div
            key={subject.name}
            role="button"
            tabIndex={0}
            onClick={() => setView({ name: 'subject', sectionName: section.name, subjectName: subject.name })}
            onKeyDown={(e) => handleKeyDown(e, () => setView({ name: 'subject', sectionName: section.name, subjectName: subject.name }))}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl hover:border-blue-500 border-2 border-transparent transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
          >
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{subject.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionView;
