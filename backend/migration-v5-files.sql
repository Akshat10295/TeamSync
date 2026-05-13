-- ══════════════════════════════════════════════════════════════
-- TeamSync Database Migration
-- Adds original_name and custom_name columns to files table
-- Run this in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Safe alter table to add columns
ALTER TABLE files
ADD COLUMN IF NOT EXISTS original_name TEXT,
ADD COLUMN IF NOT EXISTS custom_name TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT;
