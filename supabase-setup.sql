-- AI Video Studio Database Schema
-- Run this in your Supabase SQL Editor

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  video_url TEXT,
  audio_url TEXT,
  thumbnail_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Create media_files table to track uploaded images
CREATE TABLE IF NOT EXISTS media_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on project_id for faster queries
CREATE INDEX IF NOT EXISTS idx_media_files_project_id ON media_files(project_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Create policies for projects table
-- Allow users to see their own projects
CREATE POLICY "Users can view their own projects"
ON projects FOR SELECT
USING (auth.uid()::text = user_id);

-- Allow users to insert their own projects
CREATE POLICY "Users can insert their own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Allow users to update their own projects
CREATE POLICY "Users can update their own projects"
ON projects FOR UPDATE
USING (auth.uid()::text = user_id);

-- Allow users to delete their own projects
CREATE POLICY "Users can delete their own projects"
ON projects FOR DELETE
USING (auth.uid()::text = user_id);

-- Create policies for media_files table
-- Allow users to view their own media files
CREATE POLICY "Users can view their own media files"
ON media_files FOR SELECT
USING (auth.uid()::text = user_id);

-- Allow users to insert their own media files
CREATE POLICY "Users can insert their own media files"
ON media_files FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Allow users to delete their own media files
CREATE POLICY "Users can delete their own media files"
ON media_files FOR DELETE
USING (auth.uid()::text = user_id);

-- Query to verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'media_files');