import React from 'react';
import { View, Subject, SubscriptionType } from '../types';

interface SubjectViewProps {
  sectionName: string;
  subject: Subject;
  parentSubjectName?: string;
  setView: (view: View) => void;
  canAccessTestSeries: boolean;
  canAccessTutor: boolean;
  onPremiumFeatureClick: (view: View) => void;
}

const SubjectView: React.FC<SubjectViewProps> = ({ sectionName, subject, parentSubjectName, setView, canAccessTestSeries, canAccessTutor, onPremiumFeatureClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  if (subject.subSubjects && subject.subSubjects.length > 0) {
    // This is a parent subject (e.g., Social Studies), so list its sub-subjects.
    return (
        <div className="p-4 sm:p-6 lg:p-8">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{subject.name}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Select a discipline to continue.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subject.subSubjects.map((subSubject) => (
              <div
                key={subSubject.name}
                role="button"
                tabIndex={0}
                onClick={() => setView({ name: 'subject', sectionName: sectionName, parentSubjectName: subject.name, subjectName: subSubject.name })}
                onKeyDown={(e) => handleKeyDown(e, () => setView({ name: 'subject', sectionName: sectionName, parentSubjectName: subject.name, subjectName: subSubject.name }))}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl hover:border-blue-500 border-2 border-transparent transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
              >
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{subSubject.name}</h3>
              </div>
            ))}
          </div>
        </div>
      );
  }

  // This is a regular or sub-subject, so show the learning paths.
  const learningPaths = [
    {
      title: 'Study Notes',
      description: 'Access detailed notes for every chapter.',
      action: () => setView({ name: 'chapterList', sectionName, subjectName: subject.name, parentSubjectName }),
      isPremium: false,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-5.75-8.494v5.494a2 2 0 002 2h7.5a2 2 0 002-2v-5.494" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253V4.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003M4.25 8.253V6.25a2 2 0 012-2h3.5a2 2 0 012 2v2.003" />
        </svg>
      )
    },
     {
      title: 'Test Series',
      description: 'Practice with mock tests, MCQs, and more.',
      action: () => onPremiumFeatureClick({ name: 'testSeries', sectionName, subjectName: subject.name, parentSubjectName }),
      isPremium: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    },
    {
      title: 'Flashcards',
      description: 'Review key concepts with interactive flashcards.',
      action: () => onPremiumFeatureClick({ name: 'flashcardChapterList', sectionName, subjectName: subject.name, parentSubjectName }),
      isPremium: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-500 mb-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm10 2a2 2 0 012 2v8a2 2 0 01-2 2h-1v-2h1V8h-1V6h1z" />
        </svg>
      )
    },
    {
      title: 'AI Tutor',
      description: 'Ask questions and get instant help.',
      action: () => onPremiumFeatureClick({ name: 'tutor', sectionName, subjectName: subject.name, parentSubjectName }),
      isPremium: true,
      icon: (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
  ];

  const isLocked = (path: typeof learningPaths[0]) => {
    if (!path.isPremium) return false;
    if (path.title === 'AI Tutor' || path.title === 'Flashcards') {
        return !canAccessTutor;
    }
    // For Test Series
    return !canAccessTestSeries;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{subject.name}</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Choose your learning path.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {learningPaths.map(path => (
            <div
                key={path.title}
                role="button"
                tabIndex={0}
                onClick={path.action}
                onKeyDown={(e) => handleKeyDown(e, path.action)}
                className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 flex flex-col items-center text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
            >
                {isLocked(path) && (
                    <div className="absolute top-3 right-3 bg-yellow-400 dark:bg-yellow-500 p-2 rounded-full shadow-md" title="Premium Feature">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
                {path.icon}
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{path.title}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{path.description}</p>
            </div>
        ))}
      </div>
    </div>
  );
};

export default SubjectView;