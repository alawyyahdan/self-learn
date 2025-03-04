/*
  # Fix modules table structure

  1. Changes
    - Drop existing modules table
    - Create new modules table with correct structure (lecture_id instead of section_id)
    - Add appropriate indexes and RLS policies
*/

-- Drop existing modules table if it exists
DROP TABLE IF EXISTS modules CASCADE;

-- Create modules table with correct structure
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create policies for modules
CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage modules"
  ON modules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_modules_lecture_id ON modules(lecture_id);