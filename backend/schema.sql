-- ═══════════════════════════════════════════════════════════════════
-- TeamSync Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT DEFAULT '??',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Teams ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Team Members (junction table) ────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- ── Tasks ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in progress', 'done')),
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  estimated_time INTEGER DEFAULT 60,
  actual_time INTEGER DEFAULT 0,
  due_date DATE,
  timer_running BOOLEAN DEFAULT false,
  timer_start BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Notes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Files (metadata only — physical files stored on server disk) ─
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT DEFAULT '0 B',
  stored_name TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ── Diagrams ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  diagram_data JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_notes_team ON notes(team_id);
CREATE INDEX IF NOT EXISTS idx_files_team ON files(team_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_team ON diagrams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_invite ON teams(invite_code);

-- ── Disable RLS (server-side auth handles access control) ────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Allow the anon/service role full access (since server handles auth)
DROP POLICY IF EXISTS "Allow all for authenticated" ON profiles;
CREATE POLICY "Allow all for authenticated" ON profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON teams;
CREATE POLICY "Allow all for authenticated" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON team_members;
CREATE POLICY "Allow all for authenticated" ON team_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON tasks;
CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON notes;
CREATE POLICY "Allow all for authenticated" ON notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON files;
CREATE POLICY "Allow all for authenticated" ON files FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON diagrams;
CREATE POLICY "Allow all for authenticated" ON diagrams FOR ALL USING (true) WITH CHECK (true);

