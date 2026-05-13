-- ═══════════════════════════════════════════════════════════════════
-- SyncBoard — Migration: Notifications + GitHub Integration
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── Notifications table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON notifications;
CREATE POLICY "Allow all for authenticated" ON notifications FOR ALL USING (true) WITH CHECK (true);


-- ── Add github_repo column to teams ──────────────────────────────
ALTER TABLE teams ADD COLUMN IF NOT EXISTS github_repo TEXT DEFAULT NULL;
