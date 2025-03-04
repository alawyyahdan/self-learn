export interface Course {
  id: string;
  title: string;
  description: string;
  semester: number;
  thumbnail: string;
  lectures: Lecture[];
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  order: number;
  course_id: string;
  modules?: Module[];
  lectures?: Lecture[];
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  lecture_id: string;
  created_at: string;
}

export interface Lecture {
  id: string;
  title: string;
  videoUrl: string;
  content: string;
  transcript: string;
  order: number;
  section_id?: string;
  course_id: string;
  test?: Test;
  modules?: Module[];
}

export interface Test {
  id: string;
  lecture_id: string;
  questions: Question[];
  passing_score: number;
  created_at: string;
}

export interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface Grade {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  passed: boolean;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image?: string; // Base64 or URL of the image
}