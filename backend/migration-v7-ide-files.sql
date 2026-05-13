-- ── IDE Files Table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ide_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES ide_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ide_files_team ON ide_files(team_id);
CREATE INDEX IF NOT EXISTS idx_ide_files_parent ON ide_files(parent_id);

-- Enable RLS
ALTER TABLE ide_files ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated (matches existing policy pattern)
DROP POLICY IF EXISTS "Allow all for authenticated" ON ide_files;
CREATE POLICY "Allow all for authenticated" ON ide_files FOR ALL USING (true) WITH CHECK (true);
