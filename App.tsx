
import React, { useState, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen'; // This should not be lazy-loaded
import LoadingView from './components/LoadingView'; // Used for Suspense fallback
import { STUDY_SECTIONS } from './components/constants';
import { View, SearchResult, User, LocalUser, GuestUser, SubscriptionType, UserProfile, ScoreRecord } from './types';
import SettingsView from './components/SettingsView';
import SubscriptionModal from './components/SubscriptionModal';
import LoginRequiredModal from './components/LoginRequiredModal';


// --- Lazy-loaded View Components ---
const LoginView = lazy(() => import('./components/LoginView'));
const SignInView = lazy(() => import('./components/SignInView'));
const SignUpView = lazy(() => import('./components/SignUpView'));
const ForgotPasswordView = lazy(() => import('./components/ForgotPasswordView'));
const ResetPasswordView = lazy(() => import('./components/ResetPasswordView'));
const Home = lazy(() => import('./components/Home'));
const SectionView = lazy(() => import('./components/SectionView'));
const SubjectView = lazy(() => import('./components/SubjectView'));
const ChapterListView = lazy(() => import('./components/ChapterListView'));
const ChapterView = lazy(() => import('./components/ChapterView'));
const TestSeriesView = lazy(() => import('./components/TestSeriesView'));
const TestChapterSelectionView = lazy(() => import('./components/TestChapterSelectionView'));
const LongAnswerView = lazy(() => import('./components/LongAnswerView'));
const MockTestView = lazy(() => import('./components/MockTestView'));
const TutorView = lazy(() => import('./components/TutorView'));
const CaseBasedView = lazy(() => import('./components/CaseBasedView'));
const MCQsView = lazy(() => import('./components/MCQsView'));
const FlashcardView = lazy(() => import('./components/FlashcardView'));
const DownloadsView = lazy(() => import('./components/DownloadsView'));
const ScoreBoardView = lazy(() => import('./components/ScoreBoardView'));
const AboutView = lazy(() => import('./components/AboutView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const FeedbackView = lazy(() => import('./components/FeedbackView'));


// Storage keys
const USER_SESSION_KEY = 'padhlo-user-session';
const ACCOUNTS_STORAGE_KEY = 'padhlo-accounts';
const THEME_STORAGE_KEY = 'padhlo-theme';
const FONT_SIZE_KEY = 'padhlo-font-size';


type FontSize = 'sm' | 'base' | 'lg';

const App: React.FC = () => {
  const [appLoading, setAppLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<LocalUser[]>([]);
  
  const [currentView, setCurrentView] = useState<View>({ name: 'home' });
  const [isViewDirty, setIsViewDirty] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Settings panel state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('base');

  // Subscription state
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [pendingPremiumView, setPendingPremiumView] = useState<View | null>(null);
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  
  // Password Reset State
  const [otpState, setOtpState] = useState<{ email: string; otp: string; timestamp: number } | null>(null);

  // --- History API Integration ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isViewDirty) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to leave? This action cannot be undone.")) {
          // User cancelled, so push the state back to where it was
          window.history.pushState(currentView, '');
          return;
        }
      }
      // If user confirms, or if not dirty, proceed
      setIsViewDirty(false);
      if (event.state) {
        setCurrentView(event.state);
      }
    };
    window.addEventListener('popstate', handlePopState);
    // On initial load, replace the history state
    window.history.replaceState(currentView, '');
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isViewDirty, currentView]);
  
    // Add beforeunload listener to prevent accidental tab close/reload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (isViewDirty) {
            event.preventDefault();
            // Standard for most browsers requires returnValue to be set.
            event.returnValue = '';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isViewDirty]);


  // --- Initialization and State Management ---
  useEffect(() => {
    const timer = setTimeout(() => setAppLoading(false), 5000);
    
    // Load saved accounts
    try {
        const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        const accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
        setSavedAccounts(accounts);
    } catch(e) {
        console.error("Failed to load saved accounts", e);
        setSavedAccounts([]);
    }

    let initialView: View = { name: 'login' };
    // Validate session on load
    try {
      const sessionUserRaw = localStorage.getItem(USER_SESSION_KEY);
      if (sessionUserRaw) {
        const sessionUser: LocalUser = JSON.parse(sessionUserRaw);
        const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        const accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
        const dbUser = accounts.find(acc => acc.email === sessionUser.email);
        
        // Single-device login check
        if (dbUser && dbUser.sessionToken === sessionUser.sessionToken) {
          setUser(dbUser); // Load the most up-to-date user data
          initialView = { name: 'home' };
        } else {
          // Session is invalid (logged in elsewhere), so log out
          setUser(null);
          localStorage.removeItem(USER_SESSION_KEY);
          sessionStorage.clear();
        }
      } else {
        // No session, ensure user is logged out and show auth screen
        setUser(null);
      }
    } catch (e) { 
      console.error("Failed to validate user session", e);
      setUser(null);
      localStorage.removeItem(USER_SESSION_KEY);
      sessionStorage.clear();
    }
    
    setCurrentView(initialView);
    window.history.replaceState(initialView, '');

    // Load UI preferences
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
            updateTheme(savedTheme === 'dark', false);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            updateTheme(prefersDark, false);
        }
    } catch(e) { console.error("Failed to load theme", e); }
    
    try {
      const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize;
      if (savedFontSize && ['sm', 'base', 'lg'].includes(savedFontSize)) {
        updateFontSize(savedFontSize, false);
      }
    } catch (e) { console.error("Failed to load font size", e); }
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setView = (view: View) => {
    if (isViewDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave? This action cannot be undone.")) {
        return;
    }
    setIsViewDirty(false); // Reset dirty state on navigation
    setCurrentView(view);
    window.history.pushState(view, '');
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (isViewDirty && !window.confirm("You have unsaved changes. Are you sure you want to leave? This action cannot be undone.")) {
        return;
    }
    setIsViewDirty(false); // Reset dirty state on navigation
    window.history.back();
  };

  // --- Data Persistence ---
  const updateAndPersistUser = (updatedUser: LocalUser) => {
    setUser(updatedUser);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
    
    try {
      const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      const accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
      const userIndex = accounts.findIndex(acc => acc.email === updatedUser.email);
      if (userIndex > -1) {
        accounts[userIndex] = updatedUser;
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        setSavedAccounts(accounts);
      }
    } catch (e) {
      console.error("Failed to persist user data to accounts list", e);
    }
  };

  // --- Handlers ---
  const handleSignUp = (name: string, email: string, pass: string): string | null => {
      try {
        const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        const accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
        if (accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase())) {
            return "An account with this email already exists.";
        }
        
        const sessionToken = Date.now().toString();
        const newUserAccount: LocalUser = {
            type: 'local', name, email, password: pass,
            picture: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
            sessionToken,
            profile: { displayName: name, standard: '', exams: [] },
            subscription: 'none',
            scoreboard: [],
            completion: {},
        };
        accounts.push(newUserAccount);
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        setSavedAccounts(accounts);
        
        const { password, ...loggedInUser } = newUserAccount;
        setUser(loggedInUser);
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(loggedInUser));
        
        if (pendingPremiumView) {
            setCurrentView(pendingPremiumView);
            window.history.replaceState(pendingPremiumView, '');
            setPendingPremiumView(null);
        } else {
            const homeView: View = { name: 'home' };
            setCurrentView(homeView);
            window.history.replaceState(homeView, '');
        }
        return null;
      } catch (e) {
        console.error("Sign up failed", e);
        return "An unexpected error occurred during sign up.";
      }
  };

  const handleSignIn = (email: string, pass: string): string | null => {
      try {
        const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        const accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
        const accountIndex = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());
        
        if (accountIndex === -1 || accounts[accountIndex].password !== pass) {
            return "Invalid email or password.";
        }

        const sessionToken = Date.now().toString();
        const updatedAccount = { ...accounts[accountIndex], sessionToken };
        accounts[accountIndex] = updatedAccount;
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        setSavedAccounts(accounts);

        const { password, ...loggedInUser } = updatedAccount;
        setUser(loggedInUser);
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(loggedInUser));

        if (pendingPremiumView) {
            setCurrentView(pendingPremiumView);
            window.history.replaceState(pendingPremiumView, '');
            setPendingPremiumView(null);
        } else {
            const homeView: View = { name: 'home' };
            setCurrentView(homeView);
            window.history.replaceState(homeView, '');
        }
        return null;
      } catch (e) {
        console.error("Sign in failed", e);
        return "An unexpected error occurred during sign in.";
      }
  };
  
  const handleGuestLogin = () => {
    const guestUser: GuestUser = { type: 'guest' };
    setUser(guestUser);
    const homeView: View = { name: 'home' };
    setCurrentView(homeView);
    window.history.replaceState(homeView, '');
  };
  
  const handleLogout = (navigate = true) => {
    setUser(null);
    localStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.clear();
    if (navigate) {
      const loginView: View = { name: 'login' };
      setCurrentView(loginView);
      window.history.replaceState(loginView, '');
    }
  };
  
  const handleLoginRedirect = () => {
    setIsLoginRequiredModalOpen(false);
    handleLogout();
  };
  
  const handleForgotPasswordRequest = (email: string): string | null => {
    try {
        const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        const accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
        const accountExists = accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase());

        if (!accountExists) {
            return "No account found with this email address.";
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const timestamp = Date.now();
        setOtpState({ email, otp, timestamp });

        console.log(`%c[PADHLO.COM] Password Reset OTP for ${email}: ${otp}`, 'color: #3b82f6; font-weight: bold; font-size: 16px;');
        
        setView({ name: 'resetPassword', email });
        return null;
    } catch (e) {
        console.error("Forgot password request failed", e);
        return "An unexpected error occurred.";
    }
  };
  
  const handleResetPassword = (email: string, otp: string, newPass: string): string | null => {
    try {
        if (!otpState || otpState.email.toLowerCase() !== email.toLowerCase()) {
            return "Invalid session. Please request a new OTP.";
        }

        const timeElapsed = Date.now() - otpState.timestamp;
        if (timeElapsed > 10 * 60 * 1000) { // 10 minutes expiry
            setOtpState(null);
            return "OTP has expired. Please request a new one.";
        }

        if (otpState.otp !== otp) {
            return "Invalid OTP. Please try again.";
        }

        const accountsRaw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        let accounts: LocalUser[] = accountsRaw ? JSON.parse(accountsRaw) : [];
        const accountIndex = accounts.findIndex(acc => acc.email.toLowerCase() === email.toLowerCase());

        if (accountIndex === -1) {
            return "An unexpected error occurred: could not find account to update.";
        }

        accounts[accountIndex].password = newPass;
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        setSavedAccounts(accounts);

        setOtpState(null);
        return null; // Success! The UI component will handle the message and redirect.

    } catch (e) {
        console.error("Password reset failed", e);
        return "An unexpected error occurred during password reset.";
    }
  };

  const handleSubscribe = (plan: SubscriptionType) => {
    if (user?.type !== 'local') return; // Should be handled by modal, but defensive check
    const updatedUser = { ...user, subscription: plan };
    updateAndPersistUser(updatedUser);
    setIsSubscriptionModalOpen(false);
    if (pendingPremiumView) {
        setView(pendingPremiumView);
        setPendingPremiumView(null);
    }
  };

  const handlePremiumFeatureClick = (view: View) => {
    if (user?.type === 'guest') {
      setPendingPremiumView(view);
      setIsSubscriptionModalOpen(true);
      return;
    }
    if (user?.type !== 'local') return;

    const canAccessTestSeries = user.subscription === 'test_only' || user.subscription === 'full';
    const canAccessTutor = user.subscription === 'full';

    let hasPermission = false;
    switch (view.name) {
        case 'testSeries':
        case 'testChapterSelection':
        case 'longAnswer':
        case 'caseBased':
        case 'mcqs':
        case 'mockTest':
            hasPermission = canAccessTestSeries;
            break;
        case 'tutor':
        case 'flashcardChapterList':
        case 'flashcards':
            hasPermission = canAccessTutor;
            break;
    }

    if (hasPermission) {
        setView(view);
    } else {
        setPendingPremiumView(view);
        setIsSubscriptionModalOpen(true);
    }
  };
  
  const updateTheme = (isDark: boolean, save = true) => {
    setIsDarkMode(isDark);
    if (save) localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  };

  const updateFontSize = (size: FontSize, save = true) => {
    setFontSize(size);
    if(save) localStorage.setItem(FONT_SIZE_KEY, size);
    document.documentElement.style.fontSize = { sm: '14px', base: '16px', lg: '18px' }[size];
  };

  const handleSaveProfile = (profile: UserProfile) => {
    if (user?.type !== 'local') return;
    const updatedUser = { ...user, profile };
    updateAndPersistUser(updatedUser);
  };

  const handleSaveScore = (scoreData: Omit<ScoreRecord, 'id' | 'date'>) => {
    if (user?.type !== 'local') return;
    const newRecord: ScoreRecord = {
      ...scoreData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updatedUser = { ...user, scoreboard: [newRecord, ...user.scoreboard] };
    updateAndPersistUser(updatedUser);
  };

  const handleClearScores = () => {
    if (user?.type !== 'local') return;
    const updatedUser = { ...user, scoreboard: [] };
    updateAndPersistUser(updatedUser);
  };
  
  const handleForgetUser = (email: string) => {
    if (!window.confirm("Are you sure you want to remove this account from this device? This will not delete your account.")) return;
    try {
        const updatedAccounts = savedAccounts.filter(acc => acc.email !== email);
        setSavedAccounts(updatedAccounts);
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
        
        if (user?.type === 'local' && user.email === email) {
            handleLogout();
        }
    } catch (e) {
        console.error("Failed to forget user", e);
        alert("An error occurred while removing the account.");
    }
  };

  const handleToggleCompletion = (key: string, newStatus: boolean) => {
     if (user?.type !== 'local') return;
     const updatedCompletion = { ...user.completion, [key]: { ...user.completion[key], completed: newStatus } };
     const updatedUser = { ...user, completion: updatedCompletion };
     updateAndPersistUser(updatedUser);
  };
  
  const handleFeedbackSubmit = (key: string, feedback: any) => {
    if (user?.type !== 'local') return;
    const updatedCompletion = { ...user.completion, [key]: { ...user.completion[key], feedback } };
    const updatedUser = { ...user, completion: updatedCompletion };
    updateAndPersistUser(updatedUser);
  };


  useEffect(() => {
    if (searchQuery.length > 1) {
      const results: SearchResult[] = [];
      STUDY_SECTIONS.forEach(section => {
        section.subjects.forEach(subject => {
          subject.chapters.forEach(chapter => {
            if (chapter.name.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({ sectionName: section.name, subjectName: subject.name, chapterName: chapter.name });
            }
          });
        });
      });
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // --- Content Rendering ---
  const renderMainContent = () => {
    if (!user) return null;
    if (user.type === 'local') {
      // Logged-in user flow
      const { subscription, scoreboard, completion, profile } = user;
      const canAccessTestSeries = subscription === 'test_only' || subscription === 'full';
      const canAccessTutor = subscription === 'full';
      
      switch (currentView.name) {
        case 'home':
          return <Home sections={STUDY_SECTIONS} setView={setView} user={user} />;
        case 'section': {
          const section = STUDY_SECTIONS.find(s => s.name === currentView.sectionName);
          return section ? <SectionView section={section} setView={setView} /> : <p>Section not found</p>;
        }
        case 'subject':
          return <SubjectView {...currentView} setView={setView} canAccessTestSeries={canAccessTestSeries} canAccessTutor={canAccessTutor} onPremiumFeatureClick={handlePremiumFeatureClick} />;
        case 'chapterList': {
          const section = STUDY_SECTIONS.find(s => s.name === currentView.sectionName);
          const subject = section?.subjects.find(sub => sub.name === currentView.subjectName);
          return subject ? <ChapterListView sectionName={section.name} subject={subject} setView={setView} completionStatus={completion} userProfile={profile} /> : <p>Chapters not found</p>;
        }
        case 'chapter': {
          const completionKey = `completion-${currentView.sectionName}-${currentView.subjectName}-${currentView.chapterName}`;
          return <ChapterView {...currentView} setView={setView} userProfile={profile} completionData={completion[completionKey]} onToggleCompletion={(newStatus) => handleToggleCompletion(completionKey, newStatus)} onFeedbackSubmit={(feedback) => handleFeedbackSubmit(completionKey, feedback)} />;
        }
        case 'testSeries':
          return <TestSeriesView {...currentView} setView={setView} />;
        case 'testChapterSelection': {
          const section = STUDY_SECTIONS.find(s => s.name === currentView.sectionName);
          const subject = section?.subjects.find(sub => sub.name === currentView.subjectName);
          return subject ? <TestChapterSelectionView {...currentView} subject={subject} setView={setView} /> : <p>Subject not found</p>;
        }
        case 'longAnswer':
          return <LongAnswerView {...currentView} setView={setView} onSaveScore={handleSaveScore} setIsViewDirty={setIsViewDirty} />;
        case 'mockTest':
          return <MockTestView {...currentView} setView={setView} onSaveScore={handleSaveScore} setIsViewDirty={setIsViewDirty} />;
        case 'tutor':
          return <TutorView {...currentView} setView={setView} setIsViewDirty={setIsViewDirty} />;
        case 'caseBased':
          return <CaseBasedView {...currentView} setView={setView} onSaveScore={handleSaveScore} setIsViewDirty={setIsViewDirty} />;
        case 'mcqs':
          return <MCQsView {...currentView} setView={setView} onSaveScore={handleSaveScore} setIsViewDirty={setIsViewDirty} />;
        case 'flashcardChapterList': {
          const section = STUDY_SECTIONS.find(s => s.name === currentView.sectionName);
          const subject = section?.subjects.find(sub => sub.name === currentView.subjectName);
          return subject ? <ChapterListView sectionName={section.name} subject={subject} setView={setView} completionStatus={completion} destination="flashcards" userProfile={profile} /> : <p>Chapters not found</p>;
        }
        case 'flashcards':
          return <FlashcardView {...currentView} setView={setView} />;
        case 'downloadedNotes':
          return <DownloadsView setView={setView} />;
        case 'scoreBoard':
          return <ScoreBoardView setView={setView} scores={scoreboard} onClearScores={handleClearScores} />;
        case 'about':
          return <AboutView setView={setView} />;
        case 'account':
          return <ProfileView setView={setView} user={user} profile={profile} onSaveProfile={handleSaveProfile} setIsViewDirty={setIsViewDirty} />;
        case 'feedback':
          return <FeedbackView setView={setView} />;
        default:
          return <Home sections={STUDY_SECTIONS} setView={setView} user={user} />;
      }
    } else {
      // Guest user flow
      switch (currentView.name) {
        case 'home': return <Home sections={STUDY_SECTIONS} setView={setView} user={user} />;
        case 'section': { const s = STUDY_SECTIONS.find(s => s.name === currentView.sectionName); return s ? <SectionView section={s} setView={setView} /> : null; }
        case 'subject': return <SubjectView {...currentView} setView={setView} canAccessTestSeries={false} canAccessTutor={false} onPremiumFeatureClick={handlePremiumFeatureClick} />;
        case 'chapterList': { const s = STUDY_SECTIONS.find(s => s.name === currentView.sectionName); const sub = s?.subjects.find(sub => sub.name === currentView.subjectName); return sub ? <ChapterListView sectionName={s.name} subject={sub} setView={setView} completionStatus={{}} userProfile={null} /> : null; }
        case 'chapter': return <ChapterView {...currentView} setView={setView} userProfile={null} completionData={null} onToggleCompletion={() => {}} onFeedbackSubmit={() => {}} />;
        case 'downloadedNotes': return <DownloadsView setView={setView} />;
        case 'about': return <AboutView setView={setView} />;
        case 'account': return <ProfileView setView={setView} user={user} profile={{displayName: 'Guest', standard: '', exams: []}} onSaveProfile={() => {}} setIsViewDirty={setIsViewDirty} />;
        case 'feedback': return <FeedbackView setView={setView} />;
        default: setView({name: 'home'}); return null;
      }
    }
  };

  if (appLoading) {
    return <SplashScreen />;
  }
  
  // Auth Flow Screens
  if (!user) {
    let authView;
    switch (currentView.name) {
      case 'login':
        authView = <LoginView setView={setView} onGuestLogin={handleGuestLogin} />;
        break;
      case 'signIn':
        authView = <SignInView onSignIn={handleSignIn} setView={setView} onGuestLogin={handleGuestLogin} savedAccounts={savedAccounts} onForgetUser={handleForgetUser} />;
        break;
      case 'signUp':
        authView = <SignUpView onSignUp={handleSignUp} setView={setView} />;
        break;
      case 'forgotPassword':
        authView = <ForgotPasswordView onForgotPasswordRequest={handleForgotPasswordRequest} setView={setView} />;
        break;
      case 'resetPassword':
        authView = <ResetPasswordView email={currentView.email} onResetPassword={handleResetPassword} setView={setView} />;
        break;
      default:
        authView = <LoginView setView={setView} onGuestLogin={handleGuestLogin} />;
    }
     return (
        <Suspense fallback={<LoadingView />}>
            {authView}
        </Suspense>
    );
  }
  
  const subscriptionType = user.type === 'local' ? user.subscription : 'none';

  // Main App Screen
  return (
    <>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        setView={setView}
        onSettingsClick={() => setIsSettingsOpen(true)}
        goBack={goBack}
        currentViewName={currentView.name}
        currentView={currentView}
        user={user}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingView />}>
          {renderMainContent()}
        </Suspense>
      </main>
      <SettingsView
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        setView={setView}
        isDarkMode={isDarkMode}
        updateTheme={(isDark) => updateTheme(isDark, true)}
        fontSize={fontSize}
        updateFontSize={(s) => updateFontSize(s, true)}
        onLogout={handleLogout}
        onSubscriptionClick={() => setIsSubscriptionModalOpen(true)}
        user={user}
        onOpenLoginRequiredModal={() => setIsLoginRequiredModalOpen(true)}
      />
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSubscribe={handleSubscribe}
        currentPlan={subscriptionType}
        user={user}
        onSignInClick={() => { setIsSubscriptionModalOpen(false); handleLogout(); }}
      />
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
        onLogin={handleLoginRedirect}
      />
    </>
  );
};

export default App;
