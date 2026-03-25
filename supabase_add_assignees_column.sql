-- =====================================================
-- FIX: ADD MULTI-ASSIGNEE SUPPORT TO TASKS
-- =====================================================

-- 1. Tambah kolom assignees (array of UUID sebagai JSONB)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignees JSONB DEFAULT '[]'::jsonb;

-- 2. Migrasi data lama: copy assignee_id yang sudah ada ke array baru
UPDATE public.tasks
SET assignees = jsonb_build_array(assignee_id::text)
WHERE assignee_id IS NOT NULL
  AND (assignees IS NULL OR assignees = '[]'::jsonb);
