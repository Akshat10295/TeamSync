-- ═══════════════════════════════════════════════════════════════════
-- TeamSync — Migration v8: Fix Deadline Time Precision
-- Change due_date from DATE to TIMESTAMPTZ to preserve HH:mm
-- ═══════════════════════════════════════════════════════════════════

-- 1. Alter column type
-- We use USING to ensure existing dates are converted correctly to UTC midnight
ALTER TABLE tasks 
  ALTER COLUMN due_date TYPE TIMESTAMPTZ 
  USING due_date::TIMESTAMPTZ;

-- 2. Verify column type (for manual check in Supabase dashboard)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date';
