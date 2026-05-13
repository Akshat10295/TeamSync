-- ══════════════════════════════════════════════════════════════
-- TeamSync Database Migration
-- Adds diagrams table for the Whiteboard functionality
-- Run this in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  diagram_data JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster team-based retrieval
CREATE INDEX IF NOT EXISTS idx_diagrams_team ON diagrams(team_id);

-- Explicitly disable RLS since server handles all auth
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON diagrams;
CREATE POLICY "Allow all for authenticated" ON diagrams FOR ALL USING (true) WITH CHECK (true);

