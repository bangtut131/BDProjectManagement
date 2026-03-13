-- =====================================================
-- FIX: AUTO CONFIRM EMAIL (MENGHILANGKAN ERROR EMAIL NOT CONFIRMED)
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor
-- (Dashboard Supabase → SQL Editor → New Query → Paste → Run)
-- =====================================================

-- Fungsi untuk mengkonfirmasi email user baru secara otomatis
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE id = target_user_id AND email_confirmed_at IS NULL;
END;
$$;

-- Berikan akses agar Admin yang sedang login bisa menjalankan fungsi ini
GRANT EXECUTE ON FUNCTION public.auto_confirm_user_email(UUID) TO authenticated;

-- (OPSIONAL) Jika ada user yang sudah terlanjur dibuat dan nyangkut, jalankan ini juga:
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;
