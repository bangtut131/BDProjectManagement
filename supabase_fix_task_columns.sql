-- =====================================================
-- FIX: ADD MISSING COLUMNS FOR TASK DETAILS
-- =====================================================

-- Menambahkan kolom JSONB untuk menyimpan komentar, riwayat, dan lampiran
-- langsung di dalam tabel tasks.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
