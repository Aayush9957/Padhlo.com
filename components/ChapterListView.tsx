

import React, { useState, useEffect, useRef } from 'react';
import { Subject, View, UserProfile } from '../types';
import { generateChapterNotesText } from '../services/geminiService';
import BackButton from './BackButton';
import InlineSpinner from './InlineSpinner';

const PROFILE_STORAGE_KEY = 'padhlo-user-profile';

interface ChapterListViewProps {
  sectionName: string;
  subject: Subject;
  setView: (view: View) => void;
  goBack: () => void;
}

const ChapterListView: React.FC<ChapterListViewProps> = ({ sectionName, subject, setView, goBack }) => {
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chapterName: string } | null>(null);
  const [downloadingChapter, setDownloadingChapter] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  
  const updateCompletedStatus = () => {
    const completed = new Set<string>();
    subject.chapters.forEach(chapter => {
      const completionKey = `completion-${sectionName}-${subject.name}-${chapter.name}`;
      if (localStorage.getItem(completionKey) === 'true') {
        completed.add(chapter.name);
      }
    });
    setCompletedChapters(completed);
  };

  useEffect(() => {
    updateCompletedStatus();
  }, [sectionName, subject.name, subject.chapters]);
  
  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setContextMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent, chapterName: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chapterName });
  };

  const handleTouchStart = (e: React.TouchEvent, chapterName: string) => {
    longPressTimerRef.current = window.setTimeout(() => {
        const touch = e.touches[0];
        setContextMenu({ x: touch.clientX, y: touch.clientY, chapterName });
        longPressTimerRef.current = null;
    }, 700); // 700ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
    }
  };
  
  const handleDownload = async (chapterName: string) => {
    if (downloadingChapter) return;
    setDownloadingChapter(chapterName);
    setContextMenu(null);
    try {
        let profile: UserProfile | null = null;
        const savedProfileRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedProfileRaw) profile = JSON.parse(savedProfileRaw);

        const content = await generateChapterNotesText(sectionName, subject.name, chapterName, profile);
        
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${chapterName.replace(/ /g, '_')}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert(`Failed to download notes: ${(error as Error).message}`);
    } finally {
        setDownloadingChapter(null);
    }
  };

  const handleToggleCompletion = (chapterName: string) => {
    const completionKey = `completion-${sectionName}-${subject.name}-${chapterName}`;
    const isCompleted = completedChapters.has(chapterName);
    if (isCompleted) {
        localStorage.removeItem(completionKey);
    } else {
        localStorage.setItem(completionKey, 'true');
    }
    updateCompletedStatus();
    setContextMenu(null);
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <BackButton onClick={goBack} />
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{subject.name} Chapters</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Select a chapter to get notes. Right-click or long-press for more options.</p>
      <ul className="space-y-3">
        {subject.chapters.map((chapter) => (
          <li
            key={chapter.name}
            role="button"
            tabIndex={0}
            onClick={() => setView({ name: 'chapter', sectionName, subjectName: subject.name, chapterName: chapter.name })}
            onKeyDown={(e) => handleKeyDown(e, () => setView({ name: 'chapter', sectionName, subjectName: subject.name, chapterName: chapter.name }))}
            onContextMenu={(e) => handleContextMenu(e, chapter.name)}
            onTouchStart={(e) => handleTouchStart(e, chapter.name)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd} // Cancel long press if finger moves
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 flex justify-between items-center"
          >
            <span className="text-slate-800 dark:text-slate-200">{chapter.name}</span>
            <div className="flex items-center space-x-2">
                {downloadingChapter === chapter.name && <InlineSpinner />}
                {completedChapters.has(chapter.name) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-label="Completed">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
            </div>
          </li>
        ))}
      </ul>
      
      {contextMenu && (
        <div
            ref={menuRef}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-2 z-50 border border-slate-200 dark:border-slate-700"
        >
            <ul className="space-y-1">
                <li>
                    <button onClick={() => handleDownload(contextMenu.chapterName)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                        Download
                    </button>
                </li>
                 <li>
                    <button onClick={() => handleToggleCompletion(contextMenu.chapterName)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                        {completedChapters.has(contextMenu.chapterName) ? 'Mark as Unread' : 'Mark as Read'}
                    </button>
                </li>
            </ul>
        </div>
      )}
    </div>
  );
};

export default ChapterListView;