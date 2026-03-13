-- =====================================================
-- FIX SUPABASE 500 ERROR (DATABASE ERROR QUERYING SCHEMA)
-- =====================================================
-- Jalankan HANYA di Supabase SQL Editor
-- (Dashboard Supabase → SQL Editor → New Query → Paste → Run)
-- =====================================================

-- 1. Kembalikan pgcrypto ke schema extensions 
-- (GoTrue Supabase Auth akan error 500 jika ini ada di public)
ALTER EXTENSION pgcrypto SET SCHEMA extensions;

-- 2. Hapus fungsi lama yang menjadi penyebab insert manual rusak
DROP FUNCTION IF EXISTS public.create_user_command(text, text, text, text);

-- 3. Perbaiki SEMUA data null di auth.users yang menyebabkan GoTrue gagal membaca schema
UPDATE auth.users 
SET confirmation_token = '' 
WHERE confirmation_token IS NULL;

UPDATE auth.users 
SET recovery_token = '' 
WHERE recovery_token IS NULL;

UPDATE auth.users 
SET email_change_token_new = '' 
WHERE email_change_token_new IS NULL;

UPDATE auth.users 
SET email_change = '' 
WHERE email_change IS NULL;

-- 4. Pastikan trigger on_auth_user_created aman & tidak mem-block auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, status, role_id, avatar, color)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'pending',
    2,
    null,
    'bg-indigo-500'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Amankan GoTrue login dari pesan error
    RETURN new;
END;
$$;
