
import React, { useState, useRef, useEffect } from 'react';
import { View, SearchResult } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: SearchResult[];
  setView: (view: View) => void;
  onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearchChange, searchResults, setView, onSettingsClick }) => {
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

  return (
    <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div 
          onClick={() => setView({ name: 'home' })} 
          className="cursor-pointer"
        >
          <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-white">
            Padhlo.com
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your AI-Powered Study Partner</p>
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
        </div>
      </div>
    </header>
  );
};

export default Header;