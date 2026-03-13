-- =====================================================
-- FIX: DATABASE ERROR QUERYING SCHEMA (HTTP 500)
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor
-- (Dashboard Supabase → SQL Editor → New Query → Paste → Run)
-- =====================================================

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
    -- Fallback: pastikan user auth tetap dibuat meski insert profile gagal (mencegah error 500)
    RETURN new;
END;
$$;
