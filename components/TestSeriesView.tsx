

import React from 'react';
import { View } from '../types';

interface TestSeriesViewProps {
  sectionName: string;
  subjectName: string;
  setView: (view: View) => void;
}

const TestSeriesView: React.FC<TestSeriesViewProps> = ({ sectionName, subjectName, setView }) => {
  const options = [
    { name: 'MCQs Practice', type: 'mcqs', description: 'Test your knowledge with multiple-choice questions.' },
    { name: 'Mock Test', type: 'mockTest', description: 'Full-length tests in the official exam pattern.' },
    { name: 'Long Answer Questions', type: 'longAnswer', description: 'Improve your writing with detailed questions.' },
    { name: 'Case-Based Questions', type: 'caseBased', description: 'Analyze scenarios with case-based questions.' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const handleOptionClick = (option: typeof options[0]) => {
    if (option.type === 'mockTest') {
        setView({ name: 'mockTest', sectionName, subjectName });
    } else {
        setView({ name: 'testChapterSelection', sectionName, subjectName, testType: option.type as 'longAnswer' | 'caseBased' | 'mcqs' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Test Series: {subjectName}</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Select a category to start practicing.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {options.map((option) => (
          <div
            key={option.name}
            role="button"
            tabIndex={0}
            onClick={() => handleOptionClick(option)}
            onKeyDown={(e) => handleKeyDown(e, () => handleOptionClick(option))}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl hover:border-blue-500 border-2 border-transparent transition-all duration-300 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
          >
            <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{option.name}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
            </div>
          </div>
        ))}
        <div
          key="score-board"
          role="button"
          tabIndex={0}
          onClick={() => setView({ name: 'scoreBoard' })}
          onKeyDown={(e) => handleKeyDown(e, () => setView({ name: 'scoreBoard' }))}
          className="md:col-span-2 mt-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl hover:border-yellow-500 border-2 border-transparent transition-all duration-300 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:focus:ring-offset-slate-900"
        >
          <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Score Board</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review your past test performance and scores.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSeriesView;
