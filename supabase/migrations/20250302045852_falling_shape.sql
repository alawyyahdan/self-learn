-- Create storage bucket for modules if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-files', 'module-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

-- Create more permissive policies for the module-files bucket
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

-- Ensure the modules table exists with the correct structure
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') THEN
    CREATE TABLE modules (
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
  END IF;
END $$;