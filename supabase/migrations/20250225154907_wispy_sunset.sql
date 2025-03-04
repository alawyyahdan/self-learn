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
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage courses"
  ON courses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for sections
CREATE POLICY "Anyone can view sections"
  ON sections FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage sections"
  ON sections FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for lectures
CREATE POLICY "Anyone can view lectures"
  ON lectures FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage lectures"
  ON lectures FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for progress
CREATE POLICY "Users can manage their own progress"
  ON progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for tests
CREATE POLICY "Anyone can view tests"
  ON tests FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tests"
  ON tests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for grades
CREATE POLICY "Users can view their own grades"
  ON grades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own grades"
  ON grades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for chat_exports
CREATE POLICY "Users can manage their own chat exports"
  ON chat_exports FOR ALL
  TO authenticated
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

-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lectures_course_section ON lectures(course_id, section_id);
CREATE INDEX IF NOT EXISTS idx_sections_course_order ON sections(course_id, "order");
CREATE INDEX IF NOT EXISTS idx_lectures_course_order ON lectures(course_id, "order");