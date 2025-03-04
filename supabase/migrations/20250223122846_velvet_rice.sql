/*
  # Fix column names and update policies

  1. Changes
    - Rename video_url to videoUrl in lectures table
    - Drop existing policies
    - Add new policies for authenticated users

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage content
*/

-- Rename column in lectures table
ALTER TABLE lectures RENAME COLUMN video_url TO "videoUrl";

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all courses" ON courses;
DROP POLICY IF EXISTS "Users can create courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can view lectures of accessible courses" ON lectures;
DROP POLICY IF EXISTS "Course owners can manage lectures" ON lectures;
DROP POLICY IF EXISTS "Users can manage their own progress" ON progress;
DROP POLICY IF EXISTS "Admin users can manage courses" ON courses;
DROP POLICY IF EXISTS "Admin users can manage lectures" ON lectures;

-- Create new policies for courses
CREATE POLICY "Authenticated users can view all courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for lectures
CREATE POLICY "Authenticated users can view all lectures"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage lectures"
  ON lectures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for progress
CREATE POLICY "Users can manage their own progress"
  ON progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);