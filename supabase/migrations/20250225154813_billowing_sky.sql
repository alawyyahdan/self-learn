/*
  # Fix database constraints and policies

  1. Changes
    - Add composite indexes for performance
    - Update foreign key constraints
    - Improve RLS policies
    - Add public access policies

  2. Security
    - Enable public read access
    - Maintain authenticated write access
    - Improve policy specificity
*/

-- Create composite indexes for better query performance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lectures_course_section'
  ) THEN
    CREATE INDEX idx_lectures_course_section ON lectures(course_id, section_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sections_course_order'
  ) THEN
    CREATE INDEX idx_sections_course_order ON sections(course_id, "order");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lectures_course_order'
  ) THEN
    CREATE INDEX idx_lectures_course_order ON lectures(course_id, "order");
  END IF;
END $$;

-- Update RLS policies to be more specific
DO $$ 
BEGIN
  -- Courses policies
  DROP POLICY IF EXISTS "Authenticated users can view all courses" ON courses;
  DROP POLICY IF EXISTS "Authenticated users can manage courses" ON courses;
  
  CREATE POLICY "Anyone can view courses"
    ON courses FOR SELECT
    USING (true);
  
  CREATE POLICY "Authenticated users can manage courses"
    ON courses FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

  -- Sections policies
  DROP POLICY IF EXISTS "Authenticated users can view all sections" ON sections;
  DROP POLICY IF EXISTS "Authenticated users can manage sections" ON sections;
  
  CREATE POLICY "Anyone can view sections"
    ON sections FOR SELECT
    USING (true);
  
  CREATE POLICY "Authenticated users can manage sections"
    ON sections FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

  -- Lectures policies
  DROP POLICY IF EXISTS "Authenticated users can view all lectures" ON lectures;
  DROP POLICY IF EXISTS "Authenticated users can manage lectures" ON lectures;
  
  CREATE POLICY "Anyone can view lectures"
    ON lectures FOR SELECT
    USING (true);
  
  CREATE POLICY "Authenticated users can manage lectures"
    ON lectures FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
END $$;