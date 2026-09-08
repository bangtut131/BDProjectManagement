-- =====================================================
-- BD PROJECT MANAGEMENT - MIGRATION: WAHA & WHATSAPP
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor:
-- (Dashboard Supabase → SQL Editor → New Query → Run)
-- =====================================================

-- 1. Tambahkan kolom nomor WhatsApp pada tabel profiles jika belum ada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- 2. Buat tabel system_settings untuk menyimpan konfigurasi terpusat (WAHA, dll)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Isi default setting untuk WAHA jika belum ada
INSERT INTO public.system_settings (key, value)
VALUES (
    'waha',
    '{
        "enabled": false,
        "url": "",
        "apiKey": "",
        "session": "default"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Set RLS untuk system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Semua user (anon dan authenticated) dapat membaca setting agar notifikasi WA bisa di-dispatch
DROP POLICY IF EXISTS "Allow read system_settings" ON public.system_settings;
CREATE POLICY "Allow read system_settings"
ON public.system_settings FOR SELECT
USING (true);

-- Semua user authenticated atau anon dapat insert/update setting
DROP POLICY IF EXISTS "Allow upsert system_settings" ON public.system_settings;
CREATE POLICY "Allow upsert system_settings"
ON public.system_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.system_settings TO anon, authenticated;
