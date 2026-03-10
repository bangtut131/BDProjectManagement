-- FORCE VISIBILITY TEST
-- Run this to DISABLE security temporarily and verify if the data exists.

-- 1. Disable RLS on profiles (Make it public temporarily)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Check how many profiles actually exist
SELECT count(*) as total_profiles FROM public.profiles;

-- 3. (Optional) View them
SELECT * FROM public.profiles;
