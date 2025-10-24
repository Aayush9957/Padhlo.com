
import React, { useState, useEffect, useMemo } from 'react';
import { View, Flashcard } from '../types';
import { generateFlashcards, getApiErrorMessage } from '../services/geminiService';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';
import LoadingView from './LoadingView';

interface FlashcardViewProps {
  sectionName: string;
  subjectName: string;
  chapterName: string;
  setView: (view: View) => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ sectionName, subjectName, chapterName, setView }) => {
  const [allFlashcards, setAllFlashcards] = useState<Flashcard[]>([]);
  const [currentDeck, setCurrentDeck] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [masteredIndices, setMasteredIndices] = useState<Set<number>>(new Set());
  const [reviewIndices, setReviewIndices] = useState<Set<number>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  const progressStorageKey = useMemo(() => 
    `flashcard-progress-${sectionName}-${subjectName}-${chapterName}`,
    [sectionName, subjectName, chapterName]
  );

  useEffect(() => {
    const fetchAndSetupFlashcards = async () => {
      try {
        setLoading(true);
        setError(null);
        const generated = await generateFlashcards(sectionName, subjectName, chapterName);
        const cards: Flashcard[] = JSON.parse(generated);
        setAllFlashcards(cards);
        setCurrentDeck(cards);
        
        // Load progress from localStorage
        const savedProgressRaw = localStorage.getItem(progressStorageKey);
        if (savedProgressRaw) {
          const savedProgress = JSON.parse(savedProgressRaw);
          setMasteredIndices(new Set(savedProgress.mastered || []));
          setReviewIndices(new Set(savedProgress.review || []));
        }

      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to generate flashcards.'));
      } finally {
        setLoading(false);
      }
    };
    fetchAndSetupFlashcards();
  }, [sectionName, subjectName, chapterName, progressStorageKey]);

  // Save progress whenever it changes
  useEffect(() => {
    if (allFlashcards.length > 0) {
      const progress = {
        mastered: Array.from(masteredIndices),
        review: Array.from(reviewIndices),
      };
      localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    }
  }, [masteredIndices, reviewIndices, progressStorageKey, allFlashcards]);

  const currentCard = currentDeck.length > 0 ? currentDeck[currentIndex] : null;

  const goToNext = () => {
    setIsFlipped(false);
    if (currentIndex < currentDeck.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const goToPrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  const getCardIndexInFullDeck = (card: Flashcard): number => {
    return allFlashcards.findIndex(c => c.term === card.term && c.definition === card.definition);
  };

  const handleMarkMastered = () => {
    if (!currentCard) return;
    const originalIndex = getCardIndexInFullDeck(currentCard);
    setMasteredIndices(prev => new Set(prev).add(originalIndex));
    setReviewIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(originalIndex);
      return newSet;
    });
    goToNext();
  };

  const handleMarkReview = () => {
    if (!currentCard) return;
    const originalIndex = getCardIndexInFullDeck(currentCard);
    setReviewIndices(prev => new Set(prev).add(originalIndex));
    setMasteredIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(originalIndex);
      return newSet;
    });
    goToNext();
  };
  
  const handleReviewMarked = () => {
    const reviewDeck = allFlashcards.filter((_, index) => reviewIndices.has(index));
    if (reviewDeck.length > 0) {
      setCurrentDeck(reviewDeck);
      setCurrentIndex(0);
      setShowSummary(false);
      setIsFlipped(false);
    } else {
      alert("You haven't marked any cards for review!");
    }
  };
  
  const handleRestart = () => {
    setCurrentDeck(allFlashcards);
    setCurrentIndex(0);
    setShowSummary(false);
    setIsFlipped(false);
  };
  
  const handleResetAll = () => {
    if (window.confirm("Are you sure you want to reset all progress for this chapter's flashcards?")) {
        setMasteredIndices(new Set());
        setReviewIndices(new Set());
        handleRestart();
    }
  };

  const getCardStatusStyle = () => {
    if (!currentCard) return '';
    const originalIndex = getCardIndexInFullDeck(currentCard);
    if (masteredIndices.has(originalIndex)) {
        return 'shadow-green-500/50 dark:shadow-green-400/50 border-green-500 dark:border-green-400';
    }
    if (reviewIndices.has(originalIndex)) {
        return 'shadow-yellow-500/50 dark:shadow-yellow-400/50 border-yellow-500 dark:border-yellow-400';
    }
    return 'shadow-slate-400/30 dark:shadow-black/50 border-transparent';
  };
  
  if (loading) return <LoadingView loadingText="Generating flashcards..." />;
  if (error) return <div className="p-8"><ErrorMessage title="Error" message={error} /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-[calc(100vh-80px)]">
      <style>{`
        .perspective { perspective: 1000px; }
        .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; }
        .is-flipped { transform: rotateY(180deg); }
        .card-front, .card-back { position: absolute; width: 100%; height: 100%; -webkit-backface-visibility: hidden; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; padding: 2rem; text-align: center; }
        .card-back { transform: rotateY(180deg); }
      `}</style>
      
      <div className="flex-shrink-0">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">Flashcards: {chapterName}</h2>
      </div>

      {currentDeck.length > 0 && !showSummary && (
          <div className="w-full max-w-2xl mx-auto my-4">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full">
                  <div 
                      className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / currentDeck.length) * 100}%`}}
                  ></div>
              </div>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Card {currentIndex + 1} of {currentDeck.length}
              </p>
          </div>
      )}

      <div className="flex-grow flex items-center justify-center">
        {showSummary ? (
          <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Session Complete!</h3>
              <p className="mt-4 text-slate-600 dark:text-slate-400">
                  You've mastered {masteredIndices.size} out of {allFlashcards.length} cards.
              </p>
              {reviewIndices.size > 0 &&
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                    You have {reviewIndices.size} card(s) marked for review.
                </p>
              }
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {reviewIndices.size > 0 &&
                  <button onClick={handleReviewMarked} className="px-6 py-2 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600 transition-colors">
                      Review {reviewIndices.size} Card(s)
                  </button>
                }
                <button onClick={handleRestart} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    Restart All
                </button>
                 <button onClick={handleResetAll} className="px-6 py-2 bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    Reset Progress
                </button>
              </div>
          </div>
        ) : currentCard && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            {/* Flashcard */}
            <div className="w-full h-80 perspective" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`card-inner ${isFlipped ? 'is-flipped' : ''}`}>
                {/* Front */}
                <div className={`card-front bg-white dark:bg-slate-800 rounded-lg shadow-2xl cursor-pointer border-2 ${getCardStatusStyle()}`}>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200">{currentCard.term}</h3>
                </div>
                {/* Back */}
                <div className={`card-back bg-slate-50 dark:bg-slate-700 rounded-lg shadow-2xl cursor-pointer border-2 ${getCardStatusStyle()}`}>
                  <p className="text-md md:text-lg text-slate-700 dark:text-slate-300">{currentCard.definition}</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                <button onClick={handleMarkReview} className="p-4 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors">
                    Needs Review
                </button>
                <button onClick={handleMarkMastered} className="p-4 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 font-semibold rounded-lg hover:bg-green-200 dark:hover:bg-green-900 transition-colors">
                    Mastered
                </button>
            </div>
            <div className="mt-6 flex justify-between w-full">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Previous
                </button>
                <button onClick={goToNext} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Next
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardView;
