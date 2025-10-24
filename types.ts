





export interface Chapter {
  name: string;
}

export interface Subject {
  name: string;
  chapters: Chapter[];
}

export interface Section {
  name: string;
  description: string;
  subjects: Subject[];
}

// Fix: Redefined DownloadedItem as a discriminated union to support both notes and videos.
// This resolves type errors across multiple components.

// Base interface for all downloaded items
interface DownloadedItemBase {
  id: string;
  sectionName: string;
  subjectName: string;
  chapterName: string;
  downloadedAt: string;
}

// Type for downloaded notes
export interface DownloadedNote extends DownloadedItemBase {
  type: 'note';
  content: string; // markdown content
}

// Type for downloaded videos
export interface DownloadedVideo extends DownloadedItemBase {
  type: 'video';
  content: string; // base64 content
  videoMimeType: string;
}

// Union type for any downloaded item
export type DownloadedItem = DownloadedNote | DownloadedVideo;


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
  | { name: 'subject'; sectionName: string; subjectName: string }
  | { name: 'chapterList'; sectionName: string; subjectName: string }
  | { name: 'chapter'; sectionName: string; subjectName: string; chapterName: string; offlineContent?: string }
  | { name: 'testSeries'; sectionName: string; subjectName: string }
  | { name: 'testChapterSelection'; sectionName: string; subjectName: string; testType: 'longAnswer' | 'caseBased' | 'mcqs' }
  | { name: 'longAnswer'; sectionName: string; subjectName: string; chapters: string[] }
  | { name: 'mockTest'; sectionName: string; subjectName: string }
  | { name: 'tutor'; sectionName: string; subjectName: string }
  | { name: 'caseBased'; sectionName: string; subjectName: string; chapters: string[] }
  | { name: 'mcqs'; sectionName: string; subjectName: string; chapters: string[] }
  | { name: 'flashcardChapterList'; sectionName: string; subjectName: string; }
  | { name: 'flashcards'; sectionName: string; subjectName: string; chapterName: string; }
  | { name: 'downloadedNotes' }
  | { name: 'scoreBoard' }
  | { name: 'about' }
  | { name: 'account' }
  | { name: 'feedback' };

// Type for search results
export interface SearchResult {
  sectionName: string;
  subjectName: string;
  chapterName: string;
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
  standard: 'Class 11' | 'Class 12' | '';
  exams: ('NEET' | 'JEE')[];
  profilePicture?: string; // base64 encoded image
}

// Type for subjective answers (text or image)
export interface SubjectiveAnswer {
  text?: string;
  image?: File;
  imagePreview?: string;
}

// Type for subscription plan
export type SubscriptionType = 'none' | 'test_only' | 'full';

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
}

export interface GuestUser {
  type: 'guest';
}

export type User = LocalUser | GuestUser;