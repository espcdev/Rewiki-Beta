export type Language = 'en' | 'es';

export interface ArticleSection {
  id: string;
  heading: string;
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

export interface RewikiArticle {
  id: string; // Unique ID for history
  topic: string;
  summary: string;
  sections: ArticleSection[];
  imagePrompts: string[];
  generatedImage?: string;
  originalSnippet: string;
  lastUpdated: string;
  changeLog: string;
  didYouKnow: string;
  homeworkHelp: string[];
  quiz: QuizQuestion[]; // New Feature
  relatedTopics: string[]; // New Feature
  language: Language;
}

export enum ViewState {
  HOME = 'HOME',
  ARTICLE = 'ARTICLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}

export interface RevisionResult {
  accepted: boolean;
  newContent?: string;
  reasoning: string;
}