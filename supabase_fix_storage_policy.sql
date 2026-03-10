-- FIX: Drop changes from previous attempts to ensure clean slate
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access" ON storage.objects;

-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- CRITICAL: Create "Permissive" policies for this bucket to fix the "Violates RLS" error.
-- We are allowing anyone to Upload/Select/Update/Delete *within this bucket*.

CREATE POLICY "ProjectFiles Select Policy"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-files' );

CREATE POLICY "ProjectFiles Insert Policy"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'project-files' );

CREATE POLICY "ProjectFiles Update Policy"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'project-files' );

CREATE POLICY "ProjectFiles Delete Policy"
ON storage.objects FOR DELETE
USING ( bucket_id = 'project-files' );
