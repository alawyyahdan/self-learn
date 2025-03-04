/*
  # Add modules and tests tables

  1. New Tables
    - `modules`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, nullable)
      - `file_url` (text)
      - `section_id` (uuid, references sections)
      - `created_at` (timestamptz)
    
    - `tests`
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, references lectures)
      - `questions` (jsonb)
      - `passing_score` (integer)
      - `created_at` (timestamptz)
    
    - `grades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `test_id` (uuid, references tests)
      - `score` (numeric)
      - `passed` (boolean)
      - `created_at` (timestamptz)
    
    - `chat_exports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `lecture_id` (uuid, references lectures)
      - `messages` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create modules table
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create tests table
CREATE TABLE tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  questions jsonb NOT NULL,
  passing_score integer NOT NULL DEFAULT 70,
  created_at timestamptz DEFAULT now()
);

-- Create grades table
CREATE TABLE grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  score numeric NOT NULL,
  passed boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create chat_exports table
CREATE TABLE chat_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  messages jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_exports ENABLE ROW LEVEL SECURITY;

-- Policies for modules
CREATE POLICY "Authenticated users can view all modules"
  ON modules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage modules"
  ON modules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for tests
CREATE POLICY "Authenticated users can view all tests"
  ON tests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tests"
  ON tests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for grades
CREATE POLICY "Users can view their own grades"
  ON grades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own grades"
  ON grades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for chat_exports
CREATE POLICY "Users can manage their own chat exports"
  ON chat_exports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);