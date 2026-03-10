-- ULTIMATE FIX: AUTOMATIC PROFILE CREATION TRIGGER
-- Run this in Supabase SQL Editor. 
-- This ensures that EVERY time a user signs up, a profile is created effectively.

-- 1. Create the Function that runs on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, status, role_id, avatar, color)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'pending', -- Pending by default
    2,         -- Default Role ID (Member)
    null,
    'bg-indigo-500'
  )
  ON CONFLICT (id) DO NOTHING; -- If already exists, do nothing
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the Trigger to the auth.users table
-- Drop specifically to avoid "relation already exists" errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. VERIFY: Re-enable RLS (Good practice)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. FIX POLICIES for Admin Visibility
DROP POLICY IF EXISTS "Allow Read All" ON public.profiles;
CREATE POLICY "Allow Read All" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');
