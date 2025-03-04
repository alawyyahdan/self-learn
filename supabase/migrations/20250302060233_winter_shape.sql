/*
  # Learning Platform Database Migration Template

  1. Schema Overview
    - This migration template covers all tables used in the learning platform:
      - courses: Main course information
      - sections: Course sections/chapters
      - lectures: Individual lecture content
      - modules: Downloadable materials for lectures
      - progress: User progress tracking
      - tests: Assessment tests for lectures
      - grades: User test results
      - chat_exports: Saved AI chat conversations

  2. Usage Instructions
    - Copy this template when creating new migrations
    - Uncomment and modify only the sections you need
    - Always use IF EXISTS/IF NOT EXISTS for safety
    - Use DO $$ BEGIN ... END $$ blocks for conditional changes
    - Follow naming conventions for consistency
*/

-- ==========================================
-- COURSES TABLE OPERATIONS
-- ==========================================

-- Create or modify courses table
/*
DO $$ 
BEGIN
  -- Create courses table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    CREATE TABLE courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      semester integer NOT NULL,
      thumbnail text,
      created_at timestamptz DEFAULT now(),
      user_id uuid REFERENCES auth.users(id) NOT NULL
    );
    
    -- Enable RLS
    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view courses"
      ON courses FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can manage courses"
      ON courses FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
    -- Create indexes
    CREATE INDEX idx_courses_semester ON courses(semester);
  END IF;
  
  -- Add new column to courses if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'new_column_name'
  ) THEN
    ALTER TABLE courses ADD COLUMN new_column_name text;
  END IF;
END $$;
*/

-- ==========================================
-- SECTIONS TABLE OPERATIONS
-- ==========================================

-- Create or modify sections table
/*
DO $$ 
BEGIN
  -- Create sections table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sections') THEN
    CREATE TABLE sections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      "order" integer NOT NULL,
      course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view sections"
      ON sections FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can manage sections"
      ON sections FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
    -- Create indexes
    CREATE INDEX idx_sections_course_id ON sections(course_id);
    CREATE INDEX idx_sections_order ON sections("order");
    CREATE INDEX idx_sections_course_order ON sections(course_id, "order");
  END IF;
END $$;
*/

-- ==========================================
-- LECTURES TABLE OPERATIONS
-- ==========================================

-- Create or modify lectures table
/*
DO $$ 
BEGIN
  -- Create lectures table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lectures') THEN
    CREATE TABLE lectures (
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
    
    -- Enable RLS
    ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view lectures"
      ON lectures FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can manage lectures"
      ON lectures FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
    -- Create indexes
    CREATE INDEX idx_lectures_course_id ON lectures(course_id);
    CREATE INDEX idx_lectures_section_id ON lectures(section_id);
    CREATE INDEX idx_lectures_order ON lectures("order");
    CREATE INDEX idx_lectures_course_section ON lectures(course_id, section_id);
    CREATE INDEX idx_lectures_course_order ON lectures(course_id, "order");
  END IF;
END $$;
*/

-- ==========================================
-- MODULES TABLE OPERATIONS
-- ==========================================

-- Create or modify modules table
/*
DO $$ 
BEGIN
  -- Create modules table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
    CREATE TABLE modules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      file_url text NOT NULL,
      lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view modules"
      ON modules FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can manage modules"
      ON modules FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
    -- Create indexes
    CREATE INDEX idx_modules_lecture_id ON modules(lecture_id);
  END IF;
END $$;
*/

-- ==========================================
-- PROGRESS TABLE OPERATIONS
-- ==========================================

-- Create or modify progress table
/*
DO $$ 
BEGIN
  -- Create progress table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress') THEN
    CREATE TABLE progress (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) NOT NULL,
      lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
      completed boolean DEFAULT false,
      completed_at timestamptz,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, lecture_id)
    );
    
    -- Enable RLS
    ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can manage their own progress"
      ON progress FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      
    -- Create indexes
    CREATE INDEX idx_progress_user_id ON progress(user_id);
    CREATE INDEX idx_progress_lecture_id ON progress(lecture_id);
  END IF;
END $$;
*/

-- ==========================================
-- TESTS TABLE OPERATIONS
-- ==========================================

-- Create or modify tests table
/*
DO $$ 
BEGIN
  -- Create tests table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tests') THEN
    CREATE TABLE tests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
      questions jsonb NOT NULL,
      passing_score integer NOT NULL DEFAULT 70,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view tests"
      ON tests FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can manage tests"
      ON tests FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
*/

-- ==========================================
-- GRADES TABLE OPERATIONS
-- ==========================================

-- Create or modify grades table
/*
DO $$ 
BEGIN
  -- Create grades table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
    CREATE TABLE grades (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) NOT NULL,
      test_id uuid REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
      score numeric NOT NULL,
      passed boolean NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view their own grades"
      ON grades FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can manage their own grades"
      ON grades FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
      
    -- Create indexes
    CREATE INDEX idx_grades_user_id ON grades(user_id);
    CREATE INDEX idx_grades_test_id ON grades(test_id);
  END IF;
END $$;
*/

-- ==========================================
-- CHAT_EXPORTS TABLE OPERATIONS
-- ==========================================

-- Create or modify chat_exports table
/*
DO $$ 
BEGIN
  -- Create chat_exports table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_exports') THEN
    CREATE TABLE chat_exports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) NOT NULL,
      lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
      messages jsonb NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE chat_exports ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can manage their own chat exports"
      ON chat_exports FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      
    -- Create indexes
    CREATE INDEX idx_chat_exports_user_id ON chat_exports(user_id);
    CREATE INDEX idx_chat_exports_lecture_id ON chat_exports(lecture_id);
  END IF;
END $$;
*/

-- ==========================================
-- STORAGE BUCKET OPERATIONS
-- ==========================================

-- Create or modify storage buckets
/*
-- Create module-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-files', 'module-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public Access to module-files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload to module-files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update module-files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete from module-files" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Public Access to module-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'module-files');
  
  CREATE POLICY "Authenticated users can upload to module-files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'module-files');
  
  CREATE POLICY "Authenticated users can update module-files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'module-files');
  
  CREATE POLICY "Authenticated users can delete from module-files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'module-files');
END $$;
*/

-- ==========================================
-- FUNCTION OPERATIONS
-- ==========================================

-- Create or replace functions
/*
-- Example function to get all lectures for a course
CREATE OR REPLACE FUNCTION get_course_lectures(course_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  "order" integer,
  section_id uuid,
  section_title text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l."order",
    l.section_id,
    s.title as section_title
  FROM 
    lectures l
  LEFT JOIN 
    sections s ON l.section_id = s.id
  WHERE 
    l.course_id = course_id_param
  ORDER BY 
    COALESCE(s."order", 0), l."order";
END;
$$;
*/

-- ==========================================
-- TRIGGER OPERATIONS
-- ==========================================

-- Create or replace triggers
/*
-- Example trigger to update course updated_at timestamp when a lecture is modified
CREATE OR REPLACE FUNCTION update_course_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET updated_at = now()
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_course_timestamp_trigger ON lectures;
CREATE TRIGGER update_course_timestamp_trigger
AFTER INSERT OR UPDATE OR DELETE ON lectures
FOR EACH ROW
EXECUTE FUNCTION update_course_timestamp();
*/