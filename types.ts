export interface Chapter {
  name: string;
}

export interface Subject {
  name:string;
  chapters?: Chapter[];
  subSubjects?: Subject[];
}

export interface Section {
  name: string;
  description: string;
  subjects: Subject[];
}

// Type for Flashcards
export interface Flashcard {
  term: string;
  definition: string;
}

export type View = 
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'signIn' }
  | { name: 'signUp' }
  | { name: 'forgotPassword' }
  | { name: 'resetPassword'; email: string }
  | { name: 'section'; sectionName: string }
  | { name: 'subject'; sectionName: string; subjectName: string; parentSubjectName?: string }
  | { name: 'chapterList'; sectionName: string; subjectName: string; parentSubjectName?: string }
  | { name: 'chapter'; sectionName: string; subjectName: string; chapterName: string; offlineContent?: string; parentSubjectName?: string }
  | { name: 'testSeries'; sectionName: string; subjectName: string; parentSubjectName?: string }
  | { name: 'testChapterSelection'; sectionName: string; subjectName: string; testType: 'longAnswer' | 'caseBased' | 'mcqs'; parentSubjectName?: string }
  | { name: 'longAnswer'; sectionName: string; subjectName: string; chapters: string[]; parentSubjectName?: string }
  | { name: 'mockTest'; sectionName: string; subjectName: string; parentSubjectName?: string }
  | { name: 'tutor'; sectionName: string; subjectName: string; parentSubjectName?: string }
  | { name: 'caseBased'; sectionName: string; subjectName: string; chapters: string[]; parentSubjectName?: string }
  | { name: 'mcqs'; sectionName: string; subjectName: string; chapters: string[]; parentSubjectName?: string }
  | { name: 'flashcardChapterList'; sectionName: string; subjectName: string; parentSubjectName?: string }
  | { name: 'flashcards'; sectionName: string; subjectName: string; chapterName: string; parentSubjectName?: string }
  | { name: 'scoreBoard' }
  | { name: 'about' }
  | { name: 'account' }
  | { name: 'feedback' };

// Type for search results
export interface SearchResult {
  sectionName: string;
  subjectName: string;
  chapterName: string;
  parentSubjectName?: string;
}

// Types for AI-generated test content
export interface CaseStudy {
  case: string;
  questions: string[];
}

export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}


// Types for Interactive Mock Tests
export interface MockTestTextQuestion {
    type: 'SHORT_ANSWER' | 'LONG_ANSWER' | 'CASE_BASED';
    question: string;
    marks: number;
}

export type MockTestQuestion = MockTestTextQuestion;

export interface MockTestSection {
    title: string;
    instructions: string;
    questions: MockTestQuestion[];
}

export interface MockTestFormat {
    title: string;
    subject: string;
    totalMarks: number;
    duration: string;
    sections: MockTestSection[];
}

// Type for Score Board entries
export interface ScoreRecord {
  id: string;
  date: string;
  testCategory: string;
  score: number;
  totalMarks: number;
}

// Type for User Profile
export interface UserProfile {
  displayName: string;
  exams: ('NEET' | 'JEE')[];
  profilePicture?: string; // base64 encoded image
}

// Type for subjective answers (text or image)
export interface SubjectiveAnswer {
  text?: string;
  image?: File;
  imagePreview?: string;
}

// Fix: Add missing DownloadedItem interface for offline content.
// Type for downloaded offline content
export interface DownloadedItem {
  id: string;
  type: 'note'; // Currently only notes are downloadable, can be expanded.
  sectionName: string;
  subjectName: string;
  chapterName: string;
  content: string; // The markdown content of the note.
  downloadedAt: string; // ISO string date.
}

// Type for subscription plan
export type SubscriptionType = 'none' | 'test_only' | 'full';

// Type for tracking chapter progress
export interface ChapterProgress {
  scrollPercentage: number;
}

// Type for authenticated user
export interface LocalUser {
  type: 'local';
  name: string;
  email: string;
  picture: string; // URL for generated avatar
  password?: string; // Only used for storage, not in active state
  // New fields for persistent data
  sessionToken?: string;
  profile: UserProfile;
  subscription: SubscriptionType;
  scoreboard: ScoreRecord[];
  completion: { [key: string]: { completed: boolean; feedback?: any } };
  progress?: { [key: string]: ChapterProgress };
}

export interface GuestUser {
  type: 'guest';
}

export type User = LocalUser | GuestUser;

// Type for toast notifications
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}


// Centralized global type definitions for window object
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
    renderMathInElement: (element: HTMLElement, options?: any) => void;
  }
}
