
import React, { useState, useEffect, useRef } from 'react';
// Fix: Updated imports to use exported modules from geminiService.
import { NoteGenerator, DiagramGenerator, getApiErrorMessage } from '../services/geminiService';
import { View, UserProfile, SubscriptionType, ToastType } from '../types';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import InlineSpinner from './InlineSpinner';
import Spinner from './Spinner';
import MarkdownContent from './MarkdownContent';

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
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const loadDiagram = async () => {
        if (!isMounted.current) return;
        setDiagram({ loading: true, content: null, error: null });
        try {
            // Fix: Prefixed with the exported DiagramGenerator module.
            const diagramMarkdown = await DiagramGenerator.generateDiagram(prompt);
            if (isMounted.current) {
                setDiagram({ loading: false, content: diagramMarkdown, error: null });
            }
        } catch (e) {
            const errorMessage = getApiErrorMessage(e, 'Failed to load diagram.');
             if (isMounted.current) {
                setDiagram({ loading: false, content: null, error: errorMessage });
            }
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
        // The container for the diagram needs to be un-columned to prevent breaking
        return <div className="break-inside-avoid" dangerouslySetInnerHTML={{ __html: window.marked.parse(diagram.content) }} />;
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 my-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg min-h-[120px] border-2 border-dashed border-slate-300 dark:border-slate-600 break-inside-avoid">
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
  parentSubjectName?: string;
  onUpdateProgress: (chapterKey: string, scrollPercentage: number) => void;
  subscription: SubscriptionType;
  onPremiumFeatureClick: (view: View) => void;
  addToast: (message: string, type: ToastType) => void;
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
  parentSubjectName,
  onUpdateProgress,
  subscription,
  onPremiumFeatureClick,
  addToast,
}) => {
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });

  const isCompleted = completionData?.completed || false;
  const feedbackSubmitted = !!completionData?.feedback;
  const isPremium = subscription === 'full';

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const throttleTimer = useRef<number | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  
  const chapterKey = `progress-${sectionName}-${parentSubjectName || ''}-${subjectName}-${chapterName}`;

  const calculatePagination = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const totalPages = Math.max(1, Math.ceil(scrollHeight / clientHeight));
      const currentPage = Math.min(totalPages, Math.max(1, Math.floor(scrollTop / clientHeight) + 1));
      
      setPagination({ currentPage, totalPages });
  };
  
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
      // Fix: Prefixed with the exported NoteGenerator module.
      await NoteGenerator.generateChapterNotesStream(
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
    if ((isStreamComplete || offlineContent) && streamedContent) {
      const timer = setTimeout(() => {
        try {
          if (window.mermaid) {
            window.mermaid.run();
          }
          calculatePagination(); // Recalculate after mermaid renders
        } catch (e) {
          console.error("Error rendering mermaid diagram:", e);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isStreamComplete, streamedContent, offlineContent]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Set up resize observer to recalculate pagination on size changes
    resizeObserver.current = new ResizeObserver(() => {
        calculatePagination();
    });
    resizeObserver.current.observe(container);
    
    // Also recalculate when new diagram images load
    const handleImageLoad = (event: Event) => {
        if((event.target as HTMLElement).tagName === 'IMG') {
            calculatePagination();
        }
    };
    container.addEventListener('load', handleImageLoad, true);


    return () => {
        if (resizeObserver.current) {
            resizeObserver.current.disconnect();
        }
        container.removeEventListener('load', handleImageLoad, true);
    };
  }, [streamedContent]);


  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || offlineContent) return;

    const handleScroll = () => {
        calculatePagination();
        if (throttleTimer.current) return;

        throttleTimer.current = window.setTimeout(() => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight) {
                onUpdateProgress(chapterKey, 100);
                throttleTimer.current = null;
                return;
            };

            const scrollPercentage = Math.round(
                ((scrollTop + clientHeight) / scrollHeight) * 100
            );
            
            onUpdateProgress(chapterKey, Math.min(100, scrollPercentage));

            throttleTimer.current = null;
        }, 250);
    };

    container.addEventListener('scroll', handleScroll);
    calculatePagination(); // Initial calculation

    return () => {
        container.removeEventListener('scroll', handleScroll);
        if (throttleTimer.current) {
            clearTimeout(throttleTimer.current);
        }
    };
  }, [streamedContent, offlineContent, chapterKey, onUpdateProgress]);


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
  
   const handleDownloadPdf = async () => {
        if (!contentRef.current || isDownloadingPdf) return;
        setIsDownloadingPdf(true);
        addToast("Preparing your PDF... This might take a moment.", 'info');

        const printContainer = document.createElement('div');
        document.body.appendChild(printContainer);

        // --- Styling for Print ---
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.width = '210mm';
        printContainer.style.padding = '15mm';
        printContainer.style.background = 'white';
        printContainer.style.color = 'black'; // Ensure text is black
        printContainer.style.boxSizing = 'border-box';
        printContainer.className = 'prose'; // Apply base typography styles

        const contentToPrint = contentRef.current.cloneNode(true) as HTMLElement;
        contentToPrint.classList.remove('lg:columns-2'); // Remove multi-column layout
        printContainer.appendChild(contentToPrint);

        try {
            const { jsPDF } = window.jspdf;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for render

            const canvas = await window.html2canvas(printContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
            });
            
            document.body.removeChild(printContainer);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgHeightInPdf = pdfWidth / ratio;
            
            let heightLeft = imgHeightInPdf;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
                heightLeft -= pdfHeight;
            }
            
            const pageCount = pdf.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(9);
                pdf.setTextColor(150);
                pdf.text(
                    `Page ${i} of ${pageCount} - Padhlo.com`,
                    pdf.internal.pageSize.getWidth() / 2,
                    pdf.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
            
            const safeFileName = chapterName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            pdf.save(`padhlo_com_${safeFileName}_notes.pdf`);
            addToast("Download complete!", 'success');

        } catch (error) {
            console.error("Error generating PDF:", error);
            addToast("Sorry, an error occurred while generating the PDF.", 'error');
            if (document.body.contains(printContainer)) {
                document.body.removeChild(printContainer);
            }
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleDownloadPdfClick = () => {
        if (isPremium) {
            handleDownloadPdf();
        } else {
            // The key 'downloadedNotes' is just an identifier for this premium feature.
            onPremiumFeatureClick({ name: 'chapter', sectionName, subjectName, chapterName });
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
        <article ref={contentRef} className="prose dark:prose-invert max-w-none 
          lg:columns-2 lg:gap-x-12 
          prose-headings:break-inside-avoid prose-p:text-justify prose-ul:break-inside-avoid prose-ol:break-inside-avoid
        ">
            {parts.map((part, index) => {
                if (index % 2 === 1) { // This is a diagram prompt
                    return <DiagramPlaceholder key={index} prompt={part} />;
                } else { // This is regular markdown text
                    return <MarkdownContent key={index} content={part} />;
                }
            })}
             {!isStreamComplete && !offlineContent && <div className="animate-pulse">...</div>}
        </article>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
       <style>{`
          .prose {
             --tw-prose-bullets: #3b82f6;
             --tw-prose-invert-bullets: #60a5fa;
          }
          .prose ul > li::before {
             content: '•';
             color: var(--tw-prose-bullets);
             font-weight: bold;
          }
          .dark .prose ul > li::before {
             color: var(--tw-prose-invert-bullets);
          }
           .prose blockquote {
             font-style: normal;
             border-left-color: #3b82f6;
             background-color: #f0f9ff;
             padding: 0.5em 1em;
             border-radius: 0.25rem;
           }
           .dark .prose blockquote {
              border-left-color: #60a5fa;
              background-color: #1e293b;
           }
       `}</style>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2 print:mt-0">{chapterName}</h2>
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">Notes for {subjectName}</p>
      
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl printable-content overflow-hidden"
      >
        <div
          ref={scrollContainerRef}
          className="p-8 min-h-[300px] max-h-[70vh] overflow-y-auto"
          aria-live="polite"
          aria-busy={loading || (!isStreamComplete && !error)}
        >
          {renderContent()}
        </div>
        
        { (isStreamComplete || offlineContent) &&
            <div className="absolute bottom-4 right-6 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full text-xs font-mono text-slate-500 dark:text-slate-400 shadow-md no-print">
                Page {pagination.currentPage} / {pagination.totalPages}
            </div>
        }
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
            onClick={handleDownloadPdfClick}
            disabled={isDownloadingPdf || !isStreamComplete}
            className="flex items-center justify-center gap-2 px-6 py-2 w-52 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition-colors disabled:bg-slate-400"
          >
            {isDownloadingPdf ? (
              <>
                <InlineSpinner />
                <span>Generating PDF...</span>
              </>
            ) : (
                isPremium ? (
                     <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download as PDF</span>
                      </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span>Download as PDF</span>
                    </>
                )
            )}
          </button>
        </div>
      )}
      
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