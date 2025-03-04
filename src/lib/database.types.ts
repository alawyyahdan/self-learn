export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          semester: number
          thumbnail: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          semester: number
          thumbnail?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          semester?: number
          thumbnail?: string | null
          created_at?: string
          user_id?: string
        }
      }
      sections: {
        Row: {
          id: string
          title: string
          description: string | null
          order: number
          course_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          order: number
          course_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          order?: number
          course_id?: string
          created_at?: string
        }
      }
      lectures: {
        Row: {
          id: string
          title: string
          videoUrl: string | null
          content: string | null
          transcript: string | null
          order: number
          section_id: string | null
          course_id: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          videoUrl?: string | null
          content?: string | null
          transcript?: string | null
          order: number
          section_id?: string | null
          course_id: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          videoUrl?: string | null
          content?: string | null
          transcript?: string | null
          order?: number
          section_id?: string | null
          course_id?: string
          created_at?: string
        }
      }
      progress: {
        Row: {
          id: string
          user_id: string
          lecture_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lecture_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lecture_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
      }
      tests: {
        Row: {
          id: string
          lecture_id: string
          questions: Json
          passing_score: number
          created_at: string
        }
        Insert: {
          id?: string
          lecture_id: string
          questions: Json
          passing_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          lecture_id?: string
          questions?: Json
          passing_score?: number
          created_at?: string
        }
      }
      grades: {
        Row: {
          id: string
          user_id: string
          test_id: string
          score: number
          passed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          test_id: string
          score: number
          passed: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          test_id?: string
          score?: number
          passed?: boolean
          created_at?: string
        }
      }
      chat_exports: {
        Row: {
          id: string
          user_id: string
          lecture_id: string
          messages: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lecture_id: string
          messages: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lecture_id?: string
          messages?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}