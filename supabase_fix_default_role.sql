-- =====================================================
-- PERBAIKAN 3: FIX DEFAULT ROLE PADA DB TRIGGER
-- =====================================================

-- Sebelumnya trigger ini mengeset role_id = 2. Padahal daftar Role sudah kita ubah 
-- (Project Manager, AFA, FO, Intern, Staff Lain).
-- Kita ubah default-nya agar menunjuk ke "Staff Lain" (ID 5).

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
    5, -- 5 = Staff Lain (Bukan lagi 2)
    null,
    'bg-indigo-500'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to ensure auth user is still created even if profile insert fails
    RETURN new;
END;
$$;
