-- =====================================================
-- BD PROJECT MANAGEMENT - MIGRATION: WAHA & WHATSAPP
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor:
-- (Dashboard Supabase → SQL Editor → New Query → Run)
-- =====================================================

-- 1. Tambahkan kolom nomor WhatsApp pada tabel profiles jika belum ada
-- Sifat: ADDITIVE (Nullable), 100% aman dan tidak akan merusak struktur yang sudah ada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- 2. Buat tabel terisolasi dengan prefix bd_ agar tidak bentrok dengan aplikasi lain
CREATE TABLE IF NOT EXISTS public.bd_system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Isi default setting untuk WAHA jika belum ada
INSERT INTO public.bd_system_settings (key, value)
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

-- 4. Set RLS untuk bd_system_settings
ALTER TABLE public.bd_system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read bd_system_settings" ON public.bd_system_settings;
CREATE POLICY "Allow read bd_system_settings"
ON public.bd_system_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow upsert bd_system_settings" ON public.bd_system_settings;
CREATE POLICY "Allow upsert bd_system_settings"
ON public.bd_system_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.bd_system_settings TO anon, authenticated;

