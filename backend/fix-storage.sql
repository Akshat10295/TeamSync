-- ══════════════════════════════════════════════════════════════
-- TeamSync Storage Fix — Run in Supabase SQL Editor
-- This fixes the upload issue by allowing the anon role
-- (which is what the backend server uses) to access storage
-- ══════════════════════════════════════════════════════════════

-- 1. Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-files', 'team-files', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Remove old restrictive policies
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow read access" ON storage.objects;

-- 3. Create policies that allow BOTH anon and authenticated roles
-- (Our Node.js server uses the anon key, so it connects as "anon" role)

CREATE POLICY "storage_insert_policy"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'team-files');

CREATE POLICY "storage_select_policy"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'team-files');

CREATE POLICY "storage_update_policy"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'team-files');

CREATE POLICY "storage_delete_policy"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'team-files');
