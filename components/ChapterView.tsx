

import React, { useState, useEffect } from 'react';
import { generateChapterNotesStream } from '../services/geminiService';
import { View, DownloadedNote, UserProfile } from '../types';
import SkeletonLoader from './SkeletonLoader';
import BackButton from './BackButton';
import ErrorMessage from './ErrorMessage';
import InlineSpinner from './InlineSpinner';

// Add type definitions for window properties from CDNs to satisfy TypeScript
declare global {
  interface Window {
    marked: {
      parse(markdown: string): string;
    };
    mermaid: {
      run(): void;
    };
    jspdf: any;
    html2canvas: any;
  }
}

const PROFILE_STORAGE_KEY = 'padhlo-user-profile';

interface ChapterViewProps {
  sectionName: string;
  subjectName: string;
  chapterName: string;
  setView: (view: View) => void;
  goBack: () => void;
  offlineContent?: string;
}

const ChapterView: React.FC<ChapterViewProps> = ({ sectionName, subjectName, chapterName, setView, goBack, offlineContent }) => {
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // State for feedback mechanism
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  const feedbackKey = `feedback-${sectionName}-${subjectName}-${chapterName}`;
  const completionKey = `completion-${sectionName}-${subjectName}-${chapterName}`;

  useEffect(() => {
    if (offlineContent) {
      setStreamedContent(offlineContent);
      setIsStreamComplete(true);
      setLoading(false);
      return;
    }

    // Check for existing feedback on component mount
    if (localStorage.getItem(feedbackKey)) {
        setFeedbackSubmitted(true);
    }
    
    // Reset state for new chapter
    setStreamedContent('');
    setIsStreamComplete(false);
    setLoading(true);
    setError(null);

    // Load profile and then fetch notes
    let profile: UserProfile | null = null;
    try {
        const savedProfileRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedProfileRaw) {
            profile = JSON.parse(savedProfileRaw);
        }
    } catch (error) {
        console.error("Failed to load user profile for note generation", error);
    }

    const fetchNotes = async () => {
      await generateChapterNotesStream(
        sectionName,
        subjectName,
        chapterName,
        profile,
        (chunk) => {
          if (loading) setLoading(false);
          setStreamedContent(prev => prev + chunk);
        },
        (fullText) => { // onComplete
          setIsStreamComplete(true);
        },
        (errorMsg) => { // onError
          setError(errorMsg);
          setLoading(false);
        }
      );
    };

    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName, subjectName, chapterName, offlineContent]);
  
  useEffect(() => {
    const savedStatus = localStorage.getItem(completionKey);
    setIsCompleted(savedStatus === 'true');
  }, [completionKey]);

  // Effect to run Mermaid parser after notes are rendered
  useEffect(() => {
    if (isStreamComplete && streamedContent && window.mermaid) {
      // Use a timeout to ensure the DOM is updated before Mermaid runs
      const timer = setTimeout(() => {
        try {
          // This will find all elements with class="mermaid" and render them
          window.mermaid.run();
        } catch (e) {
          console.error("Error rendering mermaid diagram:", e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isStreamComplete, streamedContent]);


  const handleRatingSubmit = (rating: 'helpful' | 'not_helpful') => {
    const feedbackData = {
      rating,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(feedbackKey, JSON.stringify(feedbackData));
    setFeedbackSubmitted(true);
    setShowDetailedFeedback(false);
  };

  const handleDetailedFeedbackSubmit = () => {
    if (feedbackText.trim() === '') return;
    
    const existingFeedbackRaw = localStorage.getItem(feedbackKey);
    const existingFeedback = existingFeedbackRaw ? JSON.parse(existingFeedbackRaw) : {};

    const feedbackData = {
        ...existingFeedback,
        text: feedbackText,
        timestamp: new Date().toISOString(), // update timestamp
    };
    localStorage.setItem(feedbackKey, JSON.stringify(feedbackData));
    setFeedbackSubmitted(true);
    setShowDetailedFeedback(false);
  };
  
  const handleDownload = async () => {
    if (!streamedContent || !isStreamComplete || isDownloading) return;

    // First, save the raw markdown to localStorage for offline viewing
    const STORAGE_KEY = 'padhlo-downloaded-notes';
    try {
      const notesRaw = localStorage.getItem(STORAGE_KEY);
      const notes: DownloadedNote[] = notesRaw ? JSON.parse(notesRaw) : [];
      
      const noteId = `${sectionName}-${subjectName}-${chapterName}`;
      const existingNoteIndex = notes.findIndex(n => n.id === noteId);

      const newNote: DownloadedNote = {
        id: noteId,
        sectionName,
        subjectName,
        chapterName,
        content: streamedContent,
        downloadedAt: new Date().toISOString()
      };

      if (existingNoteIndex > -1) {
        notes[existingNoteIndex] = newNote;
      } else {
        notes.unshift(newNote);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error("Failed to save note to local storage", e);
      alert('Failed to save note for offline access.');
      return;
    }
    
    // Now, generate and download the PDF
    setIsDownloading(true);
    const contentElement = document.querySelector<HTMLElement>('.printable-content');
    if (!contentElement) {
        alert('Could not find content to download.');
        setIsDownloading(false);
        return;
    }
    
    // Temporarily apply styles for better PDF output
    const style = document.createElement('style');
    style.innerHTML = `
        .printable-content img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid;
        }
        /* Ensure code blocks wrap correctly in the PDF */
        .printable-content pre {
            white-space: pre-wrap !important;
            word-break: break-all !important;
        }
    `;
    document.head.appendChild(style);
    
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
    }

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4',
            putOnlyUsedFonts: true,
        });

        await pdf.html(contentElement, {
            margin: [40, 40, 40, 40], // Increased margins for better layout
            autoPaging: 'text',
            html2canvas: {
                scale: 1.5, // Balance between quality and performance
                useCORS: true,
            },
            width: 515, // A4 width (595.28) - horizontal margins (40*2)
            windowWidth: 900, // Use a fixed width for consistent layout
        });
        
        pdf.save(`${chapterName.replace(/ /g, '_')}.pdf`);
        alert('Note saved for offline access! Your PDF download will begin shortly.');

    } catch (error) {
        console.error("Failed to generate PDF", error);
        alert("Sorry, an error occurred while creating the PDF.");
    } finally {
        // Cleanup: remove temporary styles and restore theme
        document.head.removeChild(style);
        if (isDark) {
            document.documentElement.classList.add('dark');
        }
        setIsDownloading(false);
    }
  };
  
  const handleToggleCompletion = () => {
    const newStatus = !isCompleted;
    setIsCompleted(newStatus);
    if (newStatus) {
        localStorage.setItem(completionKey, 'true');
    } else {
        localStorage.removeItem(completionKey);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <SkeletonLoader type="text" />;
    }
    if (error) {
      return <ErrorMessage title="Failed to Load Notes" message={error} />;
    }
    if (isStreamComplete || offlineContent) {
      return (
        <article
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: window.marked.parse(streamedContent) }}
        />
      );
    }
    // During streaming, show raw text in a styled way that respects whitespace
    return (
      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
        {streamedContent}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="no-print">
        <BackButton onClick={goBack} />
      </div>
      
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2 mt-6 print:mt-0">{chapterName}</h2>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">Notes for {subjectName}</p>
      
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 min-h-[300px] printable-content"
        aria-live="polite"
        aria-busy={loading || (!isStreamComplete && !error)}
      >
        {renderContent()}
      </div>

      {(isStreamComplete || offlineContent) && !error && (
        <div className="mt-8 flex flex-wrap justify-center items-center gap-4 no-print">
          {!offlineContent && (
            <button
              onClick={handleToggleCompletion}
              className={`flex items-center gap-2 px-6 py-2 font-semibold rounded-md transition-colors ${
                isCompleted
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900'
              }`}
            >
              {isCompleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {isCompleted ? 'Marked as Complete' : 'Mark as Complete'}
            </button>
          )}
          {!offlineContent && (
            <button
              onClick={() => setView({ name: 'flashcards', sectionName, subjectName, chapterName })}
              className="flex items-center justify-center gap-2 px-6 py-2 w-48 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm10 2a2 2 0 012 2v8a2 2 0 01-2 2h-1v-2h1V8h-1V6h1z" />
              </svg>
              <span>Flashcards</span>
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-6 py-2 w-48 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition-colors disabled:bg-slate-400"
          >
            {isDownloading ? (
              <>
                <InlineSpinner />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Feedback Section - disabled in offline mode */}
      {!offlineContent && isStreamComplete && !error && (
        <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-800/50 rounded-lg shadow-inner no-print">
            {feedbackSubmitted ? (
                <p className="text-center font-semibold text-green-600 dark:text-green-400">Thank you for your feedback!</p>
            ) : (
                <>
                    { !showDetailedFeedback ? (
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Was this helpful?</span>
                            <button 
                                onClick={() => handleRatingSubmit('helpful')} 
                                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-transparent rounded-full hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition-colors"
                                aria-label="Mark as helpful"
                            >
                                👍 Helpful
                            </button>
                            <button 
                                onClick={() => handleRatingSubmit('not_helpful')} 
                                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-full hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 transition-colors"
                                aria-label="Mark as not helpful"
                            >
                                👎 Not Helpful
                            </button>
                            <button 
                                onClick={() => setShowDetailedFeedback(true)} 
                                className="text-blue-600 hover:underline text-sm font-medium"
                            >
                                Provide details
                            </button>
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="feedback-textarea" className="block text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Provide more details:
                            </label>
                            <textarea
                                id="feedback-textarea"
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                rows={4}
                                placeholder="What did you like or dislike? How can we improve?"
                            />
                            <div className="mt-4 flex items-center space-x-4">
                                <button 
                                    onClick={handleDetailedFeedbackSubmit} 
                                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-colors"
                                >
                                    Submit Feedback
                                </button>
                                <button 
                                    onClick={() => setShowDetailedFeedback(false)} 
                                    className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      )}
    </div>
  );
};

export default ChapterView;