-- Migration v4: Deadline-based tasks + difficulty feedback
-- Run this in Supabase SQL Editor

-- Add deadline column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Add difficulty feedback column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Copy existing due_date values to deadline for backward compatibility
UPDATE tasks SET deadline = due_date WHERE deadline IS NULL AND due_date IS NOT NULL;
