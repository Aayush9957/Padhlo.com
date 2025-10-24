

import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen'; // This should not be lazy-loaded
import LoadingView from './components/LoadingView'; // Used for Suspense fallback
import { STUDY_SECTIONS } from './components/constants';
import { View, SearchResult } from './types';

// --- Lazy-loaded View Components ---
// By loading components only when they are needed, we reduce the initial bundle size,
// making the app load much faster.
const Home = lazy(() => import('./components/Home'));
const SectionView = lazy(() => import('./components/SectionView'));
const SubjectView = lazy(() => import('./components/SubjectView'));
const ChapterListView = lazy(() => import('./components/ChapterListView'));
const ChapterView = lazy(() => import('./components/ChapterView'));
const TestSeriesView = lazy(() => import('./components/TestSeriesView'));
const LongAnswerView = lazy(() => import('./components/LongAnswerView'));
const MockTestView = lazy(() => import('./components/MockTestView'));
const TutorView = lazy(() => import('./components/TutorView'));
const CaseBasedView = lazy(() => import('./components/CaseBasedView'));
const TestChapterSelectionView = lazy(() => import('./components/TestChapterSelectionView'));
const ScoreBoardView = lazy(() => import('./components/ScoreBoardView'));
const DownloadedNotesView = lazy(() => import('./components/DownloadedNotesView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AboutView = lazy(() => import('./components/AboutView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const FeedbackView = lazy(() => import('./components/FeedbackView'));
const MCQsView = lazy(() => import('./components/MCQsView'));
const FlashcardView = lazy(() => import('./components/FlashcardView'));


const FONT_SIZE_KEY = 'padhlo-font-size';
type FontSize = 'sm' | 'base' | 'lg';

const App: React.FC = () => {
  const [viewHistory, setViewHistory] = useState<View[]>([{ name: 'home' }]);
  const currentView = viewHistory[viewHistory.length - 1];
  
  // Show splash only if 'splashShown' is not in sessionStorage
  const [showSplash, setShowSplash] = useState(!sessionStorage.getItem('splashShown'));
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // State for settings panel
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // State for accessibility font size
  const [fontSize, setFontSize] = useState<FontSize>('base');

  // Apply theme on initial load
  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply font size on initial load
    const savedSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
    if (savedSize && ['sm', 'base', 'lg'].includes(savedSize)) {
        setFontSize(savedSize);
    }
  }, []);

  // Effect to apply font size changes to the document
  useEffect(() => {
      const sizeMap = { sm: '14px', base: '16px', lg: '18px' };
      document.documentElement.style.fontSize = sizeMap[fontSize];
      localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  const updateFontSize = (size: FontSize) => {
      setFontSize(size);
  };


  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem('splashShown', 'true');
      }, 5000); // Display for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Effect for handling search logic with debouncing
  useEffect(() => {
    // This effect runs whenever the `searchQuery` changes.
    // We use a timeout to "debounce" the search function. This means we wait
    // for the user to stop typing for a brief moment (300ms) before
    // actually performing the search. This prevents the search from running
    // on every single keystroke, which improves performance.
    
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const performSearch = () => {
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      STUDY_SECTIONS.forEach(section => {
        section.subjects.forEach(subject => {
          subject.chapters.forEach(chapter => {
            if (
              subject.name.toLowerCase().includes(query) ||
              chapter.name.toLowerCase().includes(query)
            ) {
              results.push({
                sectionName: section.name,
                subjectName: subject.name,
                chapterName: chapter.name,
              });
            }
          });
        });
      });
      setSearchResults(results);
    };

    // Set a timer to perform the search after 300ms of inactivity
    const debounceTimer = setTimeout(() => {
        performSearch();
    }, 300); // Increased delay for better performance

    // Cleanup function: If the user types again before the 300ms is up,
    // we clear the previous timer and start a new one.
    return () => clearTimeout(debounceTimer);

  }, [searchQuery]);

  const handleSetView = (view: View) => {
    // Reset history when going home
    if (view.name === 'home') {
        setViewHistory([{ name: 'home' }]);
    } else {
        setViewHistory(prev => [...prev, view]);
    }
  };

  const handleGoBack = () => {
    setViewHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };


  if (showSplash) {
    return <SplashScreen />;
  }

  const renderContent = () => {
    const section = 'sectionName' in currentView ? STUDY_SECTIONS.find(s => s.name === currentView.sectionName) : undefined;
    const subject = (section && 'subjectName' in currentView) ? section.subjects.find(sub => sub.name === currentView.subjectName) : undefined;
    const offlineContent = ('offlineContent' in currentView && currentView.offlineContent) ? currentView.offlineContent : undefined;

    switch (currentView.name) {
      case 'home':
        return <Home sections={STUDY_SECTIONS} setView={handleSetView} />;
      
      case 'section':
        if (!section) return <p>Section not found</p>;
        return <SectionView section={section} setView={handleSetView} goBack={handleGoBack} />;
        
      case 'subject':
        return <SubjectView sectionName={currentView.sectionName} subjectName={currentView.subjectName} setView={handleSetView} goBack={handleGoBack}/>;

      case 'chapterList':
         if (!subject) return <p>Subject not found</p>;
         return <ChapterListView sectionName={currentView.sectionName} subject={subject} setView={handleSetView} goBack={handleGoBack} />;

      case 'chapter':
        return (
          <ChapterView
            sectionName={currentView.sectionName}
            subjectName={currentView.subjectName}
            chapterName={currentView.chapterName}
            setView={handleSetView}
            goBack={handleGoBack}
            offlineContent={offlineContent}
          />
        );
      
      case 'testSeries':
        return <TestSeriesView sectionName={currentView.sectionName} subjectName={currentView.subjectName} setView={handleSetView} goBack={handleGoBack}/>;

      case 'testChapterSelection':
        if (!subject) return <p>Subject not found</p>;
        return <TestChapterSelectionView sectionName={currentView.sectionName} subject={subject} testType={currentView.testType} setView={handleSetView} goBack={handleGoBack} />;
        
      case 'longAnswer':
        return <LongAnswerView sectionName={currentView.sectionName} subjectName={currentView.subjectName} chapters={currentView.chapters} setView={handleSetView} goBack={handleGoBack} />;

      case 'caseBased':
        return <CaseBasedView sectionName={currentView.sectionName} subjectName={currentView.subjectName} chapters={currentView.chapters} setView={handleSetView} goBack={handleGoBack} />;

      case 'mcqs':
        return <MCQsView sectionName={currentView.sectionName} subjectName={currentView.subjectName} chapters={currentView.chapters} setView={handleSetView} goBack={handleGoBack} />;
      
      case 'flashcards':
        return <FlashcardView sectionName={currentView.sectionName} subjectName={currentView.subjectName} chapterName={currentView.chapterName} setView={handleSetView} goBack={handleGoBack} />;

      case 'mockTest':
        return <MockTestView sectionName={currentView.sectionName} subjectName={currentView.subjectName} setView={handleSetView} goBack={handleGoBack} />;

      case 'tutor':
        return <TutorView sectionName={currentView.sectionName} subjectName={currentView.subjectName} setView={handleSetView} goBack={handleGoBack} />;
      
      case 'downloadedNotes':
        return <DownloadedNotesView setView={handleSetView} goBack={handleGoBack} />;

      case 'scoreBoard':
        return <ScoreBoardView setView={handleSetView} goBack={handleGoBack} />;
      
      case 'about':
        return <AboutView setView={handleSetView} goBack={handleGoBack} />;

      case 'profile':
        return <ProfileView setView={handleSetView} goBack={handleGoBack} />;
      
      case 'feedback':
        return <FeedbackView setView={handleSetView} goBack={handleGoBack} />;

      default:
        return <Home sections={STUDY_SECTIONS} setView={handleSetView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        setView={handleSetView}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      {/* Suspense with a null fallback can be used for components that don't need a visible loader, like a settings panel */}
      <Suspense fallback={null}>
        <SettingsView 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          setView={handleSetView}
          fontSize={fontSize}
          updateFontSize={updateFontSize}
        />
      </Suspense>
      <main>
        {/* Suspense provides a fallback UI while the lazy-loaded component is fetched */}
        <Suspense fallback={<LoadingView loadingText="Loading page..." />}>
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </Suspense>
      </main>
    </div>
  );
};

export default App;