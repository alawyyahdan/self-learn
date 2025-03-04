/*
  # Complete Schema Rebuild for Learning Platform

  1. Tables
    - courses: Main course information
    - sections: Course sections for organizing content
    - lectures: Video lectures and content
    - progress: Track user progress through lectures
    - tests: Assessment for lectures
    - grades: User test results
    - chat_exports: Store chat history

  2. Security
    - Enable RLS on all tables
    - Set up policies for authenticated users
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS chat_exports CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS lectures CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  semester integer NOT NULL,
  thumbnail text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  "order" integer NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  "videoUrl" text,
  content text,
  transcript text,
  "order" integer NOT NULL,
  section_id uuid REFERENCES sections(id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lecture_id)
);

-- Create tests table
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  questions jsonb NOT NULL,
  passing_score integer NOT NULL DEFAULT 70,
  created_at timestamptz DEFAULT now()
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  score numeric NOT NULL,
  passed boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create chat_exports table
CREATE TABLE IF NOT EXISTS chat_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  messages jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_exports ENABLE ROW LEVEL SECURITY;

-- Create policies for courses
DROP POLICY IF EXISTS "Authenticated users can view all courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users can manage courses" ON courses;
CREATE POLICY "Authenticated users can view all courses"
  ON courses FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can manage courses"
  ON courses FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for sections
DROP POLICY IF EXISTS "Authenticated users can view all sections" ON sections;
DROP POLICY IF EXISTS "Authenticated users can manage sections" ON sections;
CREATE POLICY "Authenticated users can view all sections"
  ON sections FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can manage sections"
  ON sections FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for lectures
DROP POLICY IF EXISTS "Authenticated users can view all lectures" ON lectures;
DROP POLICY IF EXISTS "Authenticated users can manage lectures" ON lectures;
CREATE POLICY "Authenticated users can view all lectures"
  ON lectures FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can manage lectures"
  ON lectures FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for progress
DROP POLICY IF EXISTS "Users can manage their own progress" ON progress;
CREATE POLICY "Users can manage their own progress"
  ON progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for tests
DROP POLICY IF EXISTS "Authenticated users can view all tests" ON tests;
DROP POLICY IF EXISTS "Authenticated users can manage tests" ON tests;
CREATE POLICY "Authenticated users can view all tests"
  ON tests FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can manage tests"
  ON tests FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for grades
DROP POLICY IF EXISTS "Users can view their own grades" ON grades;
DROP POLICY IF EXISTS "Users can manage their own grades" ON grades;
CREATE POLICY "Users can view their own grades"
  ON grades FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own grades"
  ON grades FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for chat_exports
DROP POLICY IF EXISTS "Users can manage their own chat exports" ON chat_exports;
CREATE POLICY "Users can manage their own chat exports"
  ON chat_exports FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON sections("order");
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures(course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_section_id ON lectures(section_id);
CREATE INDEX IF NOT EXISTS idx_lectures_order ON lectures("order");
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lecture_id ON progress(lecture_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON grades(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_test_id ON grades(test_id);
CREATE INDEX IF NOT EXISTS idx_chat_exports_user_id ON chat_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_exports_lecture_id ON chat_exports(lecture_id);