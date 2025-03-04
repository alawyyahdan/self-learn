/*
  # Add admin policies for courses and lectures

  1. Changes
    - Add policies for admin users to manage courses and lectures
    - Add admin flag to users table
  
  2. Security
    - Only admin users can create/update/delete courses and lectures
    - Regular users can only view courses and lectures
*/

-- Add admin column to auth.users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Update policies for courses
CREATE POLICY "Admin users can manage courses"
  ON courses
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'is_admin' = 'true')
  WITH CHECK (auth.jwt() ->> 'is_admin' = 'true');

-- Update policies for lectures
CREATE POLICY "Admin users can manage lectures"
  ON lectures
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'is_admin' = 'true')
  WITH CHECK (auth.jwt() ->> 'is_admin' = 'true');