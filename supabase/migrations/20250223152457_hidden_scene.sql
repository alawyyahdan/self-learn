/*
  # Add sections table and relationships

  1. New Tables
    - `sections`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, nullable)
      - `order` (integer)
      - `course_id` (uuid, foreign key to courses)
      - `created_at` (timestamp)

  2. Changes
    - Add `section_id` column to `lectures` table
    - Add foreign key constraint from lectures to sections

  3. Security
    - Enable RLS on sections table
    - Add policies for authenticated users
*/

-- Create sections table
CREATE TABLE sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  "order" integer NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add section_id to lectures
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES sections(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Create policies for sections
CREATE POLICY "Authenticated users can view all sections"
  ON sections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage sections"
  ON sections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);