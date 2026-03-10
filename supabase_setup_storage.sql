-- 1. Create the 'project-files' bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (It usually is, but good to be safe. Actually policies are key)

-- 3. Policy: Allow Public Read Access to 'project-files'
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-files' );

-- 4. Policy: Allow Authenticated Users to Upload to 'project-files'
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'project-files' AND auth.role() = 'authenticated' );

-- 5. Policy: Allow Authenticated Users to Update/Delete (Optional, generally safe for project tools)
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'project-files' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
USING ( bucket_id = 'project-files' AND auth.role() = 'authenticated' );
