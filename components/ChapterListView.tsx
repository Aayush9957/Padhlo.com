
import React, { useState, useEffect, useRef } from 'react';
import { Subject, View, UserProfile, ChapterProgress, ToastType } from '../types';
// Fix: Updated imports to use exported modules from geminiService.
import { NoteGenerator } from '../services/geminiService';
import InlineSpinner from './InlineSpinner';

interface ChapterListViewProps {
  sectionName: string;
  subject: Subject;
  setView: (view: View) => void;
  completionStatus: { [key: string]: { completed: boolean } };
  destination?: 'notes' | 'flashcards';
  userProfile: UserProfile | null;
  parentSubjectName?: string;
  chapterProgress?: { [key: string]: ChapterProgress };
  addToast: (message: string, type: ToastType) => void;
}

const ChapterListView: React.FC<ChapterListViewProps> = ({ sectionName, subject, setView, completionStatus, destination = 'notes', userProfile, parentSubjectName, chapterProgress, addToast }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chapterName: string } | null>(null);
  const [downloadingChapter, setDownloadingChapter] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);

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

  const handleChapterClick = async (chapterName: string) => {
    if (destination === 'flashcards') {
        setView({ name: 'flashcards', sectionName, subjectName: subject.name, chapterName, parentSubjectName });
    } else { // 'notes'
        setView({ name: 'chapter', sectionName, subjectName: subject.name, chapterName, parentSubjectName });
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
        // Fix: Prefixed with the exported NoteGenerator module.
        const content = await NoteGenerator.generateChapterNotesText(sectionName, subject.name, chapterName, userProfile);
        
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
        addToast(`Failed to download notes: ${(error as Error).message}`, 'error');
    } finally {
        setDownloadingChapter(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{subject.name} Chapters</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Select a chapter to get {destination}. Right-click or long-press for more options.</p>
      <ul className="space-y-3">
        {subject.chapters && subject.chapters.map((chapter) => {
          const completionKey = `completion-${sectionName}-${parentSubjectName || ''}-${subject.name}-${chapter.name}`;
          const isCompleted = completionStatus[completionKey]?.completed;
          const progressKey = `progress-${sectionName}-${parentSubjectName || ''}-${subject.name}-${chapter.name}`;
          const progress = chapterProgress?.[progressKey];
          const scrollPercentage = progress?.scrollPercentage || 0;

          return (
          <li
            key={chapter.name}
            role="button"
            tabIndex={0}
            onClick={() => handleChapterClick(chapter.name)}
            onKeyDown={(e) => handleKeyDown(e, () => handleChapterClick(chapter.name))}
            onContextMenu={(e) => handleContextMenu(e, chapter.name)}
            onTouchStart={(e) => handleTouchStart(e, chapter.name)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd} // Cancel long press if finger moves
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 flex justify-between items-center"
          >
            <div className="flex-grow pr-4">
                <span className="text-slate-800 dark:text-slate-200">{chapter.name}</span>
                {scrollPercentage > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${scrollPercentage}%` }}></div>
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{scrollPercentage}%</span>
                  </div>
                )}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                {downloadingChapter === chapter.name && <InlineSpinner />}
                {isCompleted && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-label="Completed">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
            </div>
          </li>
        )})}
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
            </ul>
        </div>
      )}
    </div>
  );
};

export default ChapterListView;