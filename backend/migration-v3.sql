-- ═══════════════════════════════════════════════════════════════════
-- TeamSync — Migration v3: Cloud Storage + Gamification (XP & Achievements)
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── Update files table for Supabase Storage ──────────────────────
-- Replace local `stored_name` with cloud `storage_path`
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT NULL;

-- ── Gamification: Add XP to profiles ─────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- ── Achievements Definition Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- machine-readable key e.g. 'first_task'
  title TEXT NOT NULL,                -- display name
  description TEXT NOT NULL,          -- flavor text
  icon TEXT DEFAULT '🏆',             -- emoji icon
  xp_reward INTEGER DEFAULT 50,      -- XP granted on unlock
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── User ↔ Achievement junction ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- ── RLS (server-side auth handles access) ────────────────────────
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON achievements;
CREATE POLICY "Allow all for authenticated" ON achievements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON user_achievements;
CREATE POLICY "Allow all for authenticated" ON user_achievements FOR ALL USING (true) WITH CHECK (true);


-- ── Seed Default Achievements ────────────────────────────────────
INSERT INTO achievements (key, title, description, icon, xp_reward) VALUES
  ('first_task',      'First Blood',        'Complete your very first task.',                              '⚔️',  50),
  ('five_tasks',      'Getting Warmed Up',   'Complete 5 tasks across any teams.',                         '🔥', 100),
  ('ten_tasks',       'Task Machine',        'Complete 10 tasks. You''re unstoppable!',                    '⚙️', 200),
  ('twenty_five_tasks','Quarter Centurion',  'Complete 25 tasks. Legend status.',                          '🏅', 500),
  ('speed_demon',     'Speed Demon',         'Complete a task in under 10 minutes.',                       '⚡', 150),
  ('team_creator',    'Trailblazer',         'Create your first team.',                                    '🚀',  75),
  ('note_taker',      'Scribe',              'Create your first note.',                                    '📝',  50),
  ('file_uploader',   'Cloud Walker',        'Upload your first file.',                                    '☁️',  50),
  ('streak_3',        'On a Roll',           'Complete 3 tasks in a single day.',                          '🎯', 150),
  ('night_owl',       'Night Owl',           'Complete a task between midnight and 5 AM.',                 '🦉', 100)
ON CONFLICT (key) DO NOTHING;

-- ── Create Supabase Storage bucket for team files ────────────────
-- NOTE: Run this via the Supabase Dashboard → Storage → Create Bucket
-- Bucket name: team-files
-- Public: false (files served via signed URLs)
-- Max file size: 50 MB
