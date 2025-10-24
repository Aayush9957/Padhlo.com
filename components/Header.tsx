
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, SearchResult, User } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: SearchResult[];
  setView: (view: View) => void;
  onSettingsClick: () => void;
  goBack: () => void;
  currentViewName: string;
  currentView: View;
  user: User;
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  searchResults,
  setView,
  onSettingsClick,
  goBack,
  currentViewName,
  currentView,
  user
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const breadcrumbs = useMemo(() => {
    const homeCrumb = { label: 'Home', view: { name: 'home' } as View };
    let crumbs: { label: string; view?: View }[] = [homeCrumb];

    if (currentView.name === 'home') {
        return [{ label: 'Home' }]; // Just 'Home', non-clickable
    }

    // Base path for section/subject/chapter
    if ('sectionName' in currentView && currentView.sectionName) {
        crumbs.push({ label: currentView.sectionName, view: { name: 'section', sectionName: currentView.sectionName } });
    }
    if ('subjectName' in currentView && currentView.subjectName) {
        crumbs.push({ label: currentView.subjectName, view: { name: 'subject', sectionName: currentView.sectionName, subjectName: currentView.subjectName } });
    }

    // Specific endpoints
    switch (currentView.name) {
        case 'chapter':
            crumbs.push({ label: currentView.chapterName });
            break;
        case 'testSeries':
            crumbs.push({ label: 'Test Series' });
            break;
        case 'mockTest':
            crumbs.push({ label: 'Mock Test' });
            break;
        case 'tutor':
            crumbs.push({ label: 'AI Tutor' });
            break;
        case 'flashcardChapterList':
            crumbs.push({ label: 'Flashcards' });
            break;
        case 'flashcards':
            crumbs.push(
                { label: 'Flashcards', view: { name: 'flashcardChapterList', sectionName: currentView.sectionName, subjectName: currentView.subjectName } },
                { label: currentView.chapterName }
            );
            break;
        case 'testChapterSelection':
             crumbs.push(
                { label: 'Test Series', view: { name: 'testSeries', sectionName: currentView.sectionName, subjectName: currentView.subjectName } },
                { label: 'Chapter Selection' }
            );
            break;
        case 'longAnswer':
        case 'caseBased':
        case 'mcqs':
            const testLabels = { longAnswer: 'Long Answer Test', caseBased: 'Case-Based Test', mcqs: 'MCQs Practice' };
            crumbs.push(
                { label: 'Test Series', view: { name: 'testSeries', sectionName: currentView.sectionName, subjectName: currentView.subjectName } },
                { label: testLabels[currentView.name] }
            );
            break;
            
        // Standalone pages
        case 'downloadedNotes':
        case 'scoreBoard':
        case 'about':
        case 'account':
        case 'feedback':
            const standaloneLabels = {
                downloadedNotes: 'Downloads',
                scoreBoard: 'Score Board',
                about: 'About',
                account: 'Account',
                feedback: 'Feedback'
            };
            crumbs = [homeCrumb, { label: standaloneLabels[currentView.name] }];
            break;

        case 'subject':
        case 'chapterList':
        case 'section':
             // Base path builder already handled these.
            break;
        
        // No breadcrumbs for auth views
        case 'login':
        case 'signIn':
        case 'signUp':
        case 'forgotPassword':
        case 'resetPassword':
            return [];
    }

    // The last crumb should not be clickable
    if (crumbs.length > 0) {
        delete crumbs[crumbs.length - 1].view;
    }

    return crumbs;
  }, [currentView]);

  const handleResultClick = (result: SearchResult) => {
    setView({
      name: 'chapter',
      sectionName: result.sectionName,
      subjectName: result.subjectName,
      chapterName: result.chapterName,
    });
    onSearchChange(''); // Clear search query
    setIsFocused(false); // Hide results
  };

  const renderSettingsButton = () => {
    if (user.type === 'local' && user.picture) {
        return (
            <button
                onClick={onSettingsClick}
                className="h-10 w-10 rounded-full hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 dark:hover:ring-offset-slate-800 transition-all"
                aria-label="Open settings panel"
            >
                <img src={user.picture} alt="Profile" className="h-full w-full rounded-full object-cover" />
            </button>
        );
    }
    return (
        <button 
            onClick={onSettingsClick}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" 
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    );
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Left side: Buttons (if not home) + Title */}
        <div className="flex items-center space-x-4">
          {currentViewName !== 'home' && (
            <div className="flex items-center space-x-2">
              {/* Back Button */}
              <button
                onClick={goBack}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Go back"
              >
                <svg className="h-6 w-6 text-slate-600 dark:text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Home Button */}
              <button
                onClick={() => setView({ name: 'home' })}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Go to Home"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            </div>
          )}
          <div 
            onClick={() => setView({ name: 'home' })} 
            className="cursor-pointer"
          >
            <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">
              Padhlo.com
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your AI-Powered Study Partner</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div ref={searchContainerRef} className="relative w-full max-w-sm">
            <div className="relative">
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                className="w-full pl-10 pr-4 py-2 border rounded-full bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
              </div>
            </div>

            {isFocused && searchQuery.length > 1 && (
              <div className="absolute mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((result, index) => (
                      <li
                        key={`${result.sectionName}-${result.subjectName}-${result.chapterName}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{result.chapterName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {result.sectionName} &gt; {result.subjectName}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                    No results found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>
          
          {renderSettingsButton()}
        </div>
      </div>
      
      {/* Breadcrumb Trail */}
      {breadcrumbs.length > 1 && (
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 border-t border-slate-200 dark:border-slate-700" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 pt-3">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <li aria-hidden="true">
                    <svg className="h-5 w-5 flex-shrink-0 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </li>
                )}
                <li>
                  {crumb.view ? (
                    <button
                      onClick={() => setView(crumb.view!)}
                      className="hover:text-slate-700 dark:hover:text-slate-200 hover:underline"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-medium text-slate-700 dark:text-slate-200" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              </React.Fragment>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
};

export default Header;
