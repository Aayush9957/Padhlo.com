
import React, { useState, useEffect } from 'react';
import { generateChapterNotesStream, generateDiagram, getApiErrorMessage, generateChapterNotesText, generateVideoSummary } from '../services/geminiService';
import { View, DownloadedItem, UserProfile, DownloadedVideo } from '../types';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import InlineSpinner from './InlineSpinner';
import Spinner from './Spinner';

// Fix: Removed duplicate global type declarations for `window.aistudio`.
// These types are assumed to be defined elsewhere in the project's global scope,
// and redeclaring them was causing compilation errors.
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
    aistudio: {
        hasSelectedApiKey(): Promise<boolean>;
        openSelectKey(): Promise<void>;
    };
  }
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve((reader.result as string).split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


interface DiagramState {
  loading: boolean;
  content: string | null;
  error: string | null;
}

const DiagramPlaceholder: React.FC<{ prompt: string }> = ({ prompt }) => {
    const [diagram, setDiagram] = useState<DiagramState>({
        loading: false,
        content: null,
        error: null,
    });

    const loadDiagram = async () => {
        setDiagram({ loading: true, content: null, error: null });
        try {
            const diagramMarkdown = await generateDiagram(prompt);
            setDiagram({ loading: false, content: diagramMarkdown, error: null });
        } catch (e) {
            const errorMessage = getApiErrorMessage(e, 'Failed to load diagram.');
            setDiagram({ loading: false, content: null, error: errorMessage });
        }
    };

    if (diagram.loading) {
        return (
            <div className="flex flex-col items-center justify-center p-4 my-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg min-h-[120px]">
                <InlineSpinner />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Generating diagram...</p>
            </div>
        );
    }

    if (diagram.error) {
        return <ErrorMessage title="Diagram Error" message={diagram.error} />;
    }
    
    if (diagram.content) {
        return <div dangerouslySetInnerHTML={{ __html: window.marked.parse(diagram.content) }} />;
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 my-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg min-h-[120px] border-2 border-dashed border-slate-300 dark:border-slate-600">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 text-center">Diagram placeholder: "{prompt}"</p>
            <button
                onClick={loadDiagram}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
            >
                Load Diagram
            </button>
        </div>
    );
};


interface ChapterViewProps {
  sectionName: string;
  subjectName: string;
  chapterName: string;
  setView: (view: View) => void;
  offlineContent?: string;
  userProfile: UserProfile | null;
  completionData: { completed: boolean; feedback?: any } | null;
  onToggleCompletion: (newStatus: boolean) => void;
  onFeedbackSubmit: (feedback: any) => void;
}

const ChapterView: React.FC<ChapterViewProps> = ({
  sectionName,
  subjectName,
  chapterName,
  setView,
  offlineContent,
  userProfile,
  completionData,
  onToggleCompletion,
  onFeedbackSubmit,
}) => {
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatusMessage, setVideoStatusMessage] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string; blob: Blob } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isCompleted = completionData?.completed || false;
  const feedbackSubmitted = !!completionData?.feedback;
  
  useEffect(() => {
    if (offlineContent) {
      setStreamedContent(offlineContent);
      setIsStreamComplete(true);
      setLoading(false);
      return;
    }
    
    setStreamedContent('');
    setIsStreamComplete(false);
    setLoading(true);
    setError(null);

    const fetchNotes = async () => {
      await generateChapterNotesStream(
        sectionName, subjectName, chapterName, userProfile,
        (chunk) => {
          if (loading) setLoading(false);
          setStreamedContent(prev => prev + chunk);
        },
        (fullText) => {
          setIsStreamComplete(true);
        },
        (errorMsg) => {
          setError(errorMsg);
          setLoading(false);
        }
      );
    };

    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionName, subjectName, chapterName, offlineContent, userProfile]);
  
  useEffect(() => {
    if ((isStreamComplete || offlineContent) && streamedContent && window.mermaid) {
      const timer = setTimeout(() => {
        try {
          window.mermaid.run();
        } catch (e) {
          console.error("Error rendering mermaid diagram:", e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isStreamComplete, streamedContent, offlineContent]);

  const handleRatingSubmit = (rating: 'helpful' | 'not_helpful') => {
    onFeedbackSubmit({ rating, timestamp: new Date().toISOString() });
    setShowDetailedFeedback(false);
  };

  const handleDetailedFeedbackSubmit = () => {
    if (feedbackText.trim() === '') return;
    const existingFeedback = completionData?.feedback || {};
    const feedbackData = { ...existingFeedback, text: feedbackText, timestamp: new Date().toISOString() };
    onFeedbackSubmit(feedbackData);
    setShowDetailedFeedback(false);
  };
  
   const handleDownload = async () => {
    if (!isStreamComplete || isDownloading) return;
    
    const STORAGE_KEY = 'padhlo-downloads';
    try {
      const textToSave = await generateChapterNotesText(sectionName, subjectName, chapterName, userProfile);

      const itemsRaw = localStorage.getItem(STORAGE_KEY);
      const items: DownloadedItem[] = itemsRaw ? JSON.parse(itemsRaw) : [];
      
      const noteId = `note-${sectionName}-${subjectName}-${chapterName}`;
      const existingItemIndex = items.findIndex(n => n.id === noteId);

      // Fix: Changed type from unimported 'DownloadedNote' to the already imported 'DownloadedItem' union type.
      const newItem: DownloadedItem = {
        id: noteId, type: 'note', sectionName, subjectName, chapterName,
        content: textToSave, downloadedAt: new Date().toISOString()
      };

      if (existingItemIndex > -1) {
        items[existingItemIndex] = newItem;
      } else {
        items.unshift(newItem);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      alert('Note saved for offline access!');
    } catch (e) {
      console.error("Failed to save note to local storage", e);
      alert('Failed to save note for offline access.');
    }
  };
  
    const handleGenerateVideo = async () => {
        if (isGeneratingVideo) return;
        
        try {
            if (!window.aistudio || typeof window.aistudio.hasSelectedApiKey !== 'function') {
                throw new Error("API key selection mechanism is not available.");
            }
            
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await window.aistudio.openSelectKey();
            }
        
            setIsGeneratingVideo(true);
            setVideoError(null);
            setGeneratedVideo(null);
            
            const videoUrl = await generateVideoSummary(
                chapterName,
                streamedContent,
                (status) => setVideoStatusMessage(status)
            );
            
            const response = await fetch(videoUrl);
            const videoBlob = await response.blob();

            setGeneratedVideo({ url: videoUrl, blob: videoBlob });

        } catch (e: any) {
            console.error("Video generation failed", e);
            setVideoError(e.message || "An unknown error occurred during video generation.");
        } finally {
            setIsGeneratingVideo(false);
            setVideoStatusMessage('');
        }
    };

    const handleSaveVideo = async () => {
        if (!generatedVideo) return;

        const STORAGE_KEY = 'padhlo-downloads';
        try {
            const base64Content = await blobToBase64(generatedVideo.blob);
            
            const itemsRaw = localStorage.getItem(STORAGE_KEY);
            const items: DownloadedItem[] = itemsRaw ? JSON.parse(itemsRaw) : [];

            const videoId = `video-${sectionName}-${subjectName}-${chapterName}`;
            const existingItemIndex = items.findIndex(item => item.id === videoId);

            const newItem: DownloadedVideo = {
                id: videoId,
                type: 'video',
                sectionName,
                subjectName,
                chapterName,
                content: base64Content,
                videoMimeType: generatedVideo.blob.type,
                downloadedAt: new Date().toISOString()
            };

            if (existingItemIndex > -1) {
                items[existingItemIndex] = newItem;
            } else {
                items.unshift(newItem);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            alert('Video saved for offline access!');

        } catch (e) {
            console.error("Failed to save video to local storage", e);
            alert('Failed to save video.');
        }
    };

  const renderContent = () => {
    if (loading) {
      return <SkeletonLoader type="text" />;
    }
    if (error) {
      return <ErrorMessage title="Failed to Load Notes" message={error} />;
    }

    const diagramPlaceholderRegex = /\[LOAD_DIAGRAM_PROMPT:"(.*?)"\]/g;
    const parts = streamedContent.split(diagramPlaceholderRegex);

    return (
        <article className="prose dark:prose-invert max-w-none">
            {parts.map((part, index) => {
                if (index % 2 === 1) { // This is a diagram prompt
                    return <DiagramPlaceholder key={index} prompt={part} />;
                } else { // This is regular markdown text
                    return <div key={index} dangerouslySetInnerHTML={{ __html: window.marked.parse(part) }} />;
                }
            })}
             {!isStreamComplete && !offlineContent && <div className="animate-pulse">...</div>}
        </article>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2 print:mt-0">{chapterName}</h2>
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
              onClick={() => onToggleCompletion(!isCompleted)}
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
          <button
            onClick={handleDownload}
            disabled={isDownloading || !isStreamComplete}
            className="flex items-center justify-center gap-2 px-6 py-2 w-52 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition-colors disabled:bg-slate-400"
          >
            {isDownloading ? (
              <>
                <InlineSpinner />
                <span>Saving Note...</span>
              </>
            ) : (
              <>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Save Note for Offline</span>
              </>
            )}
          </button>
            <button
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || !isStreamComplete}
                className="flex items-center justify-center gap-2 px-6 py-2 w-52 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 transition-colors disabled:bg-slate-400"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
                <span>Generate Video Summary</span>
            </button>
        </div>
      )}
      
      {/* Video Generation UI */}
        <div className="mt-6 no-print">
            {isGeneratingVideo && (
                <div className="p-6 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-center shadow-inner">
                    <Spinner />
                    <p className="mt-4 text-lg text-blue-800 dark:text-blue-300 font-semibold">{videoStatusMessage || "Initializing..."}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Please keep this tab open. Video generation can take several minutes.</p>
                </div>
            )}
            {videoError && !isGeneratingVideo && (
                <ErrorMessage title="Video Generation Failed" message={videoError} />
            )}
            {generatedVideo && !isGeneratingVideo && (
                <div className="p-6 bg-green-50 dark:bg-green-900/50 rounded-lg shadow-inner">
                    <h3 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">Video Summary Ready!</h3>
                    <video controls src={generatedVideo.url} className="w-full rounded-md shadow-lg" />
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={handleSaveVideo}
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Save Video for Offline
                        </button>
                    </div>
                </div>
            )}
        </div>


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