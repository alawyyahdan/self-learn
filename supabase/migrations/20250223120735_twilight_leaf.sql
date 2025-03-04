/*
  # Initial Schema Setup for Learning Platform

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `semester` (integer)
      - `thumbnail` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key)

    - `lectures`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key)
      - `title` (text)
      - `video_url` (text)
      - `content` (text)
      - `transcript` (text)
      - `order` (integer)
      - `created_at` (timestamp)

    - `progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `lecture_id` (uuid, foreign key)
      - `completed` (boolean)
      - `completed_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create courses table
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  semester integer NOT NULL,
  thumbnail text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Create lectures table
CREATE TABLE lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  video_url text,
  content text,
  transcript text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create progress table
CREATE TABLE progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE(user_id, lecture_id)
);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Policies for courses
CREATE POLICY "Users can view all courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create courses"
  ON courses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
  ON courses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for lectures
CREATE POLICY "Users can view lectures of accessible courses"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = lectures.course_id
  ));

CREATE POLICY "Course owners can manage lectures"
  ON lectures
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = lectures.course_id 
    AND courses.user_id = auth.uid()
  ));

-- Policies for progress
CREATE POLICY "Users can manage their own progress"
  ON progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);