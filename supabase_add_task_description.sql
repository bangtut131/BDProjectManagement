-- =====================================================
-- FIX: ADD MISSING DESCRIPTION COLUMN FOR TASKS
-- =====================================================

-- Menambahkan kolom text untuk menyimpan deskripsi tugas secara rinci
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS description TEXT;
