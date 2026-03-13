-- =====================================================
-- FIX: DATABASE ERROR 500 ON LOGIN (MISSING IDENTITY)
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor
-- (Dashboard Supabase → SQL Editor → New Query → Paste → Run)
-- =====================================================

-- 1. Perbaiki akun admin yang sudah terlanjur dibuat tapi error
DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@bd.com';
BEGIN
    -- Cari ID admin yang error
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Buat identity record yang hilang agar bisa login
        INSERT INTO auth.identities (
            provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            admin_id::text, admin_id,
            jsonb_build_object('sub', admin_id::text, 'email', admin_email),
            'email', now(), now(), now()
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 2. Update fungsi create_user_command agar user selanjutnya tidak error
CREATE OR REPLACE FUNCTION public.create_user_command(
    email TEXT,
    password TEXT,
    name TEXT,
    role_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    new_user_id UUID;
    encrypted_pw TEXT;
    role_id_val INTEGER;
    new_user_data JSONB;
BEGIN
    IF email IS NULL OR password IS NULL OR name IS NULL THEN
        RAISE EXCEPTION 'Email, password, and name are required';
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = create_user_command.email) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    SELECT id INTO role_id_val FROM public.roles WHERE roles.name = role_name;
    IF role_id_val IS NULL THEN
        SELECT id INTO role_id_val FROM public.roles WHERE roles.name = 'Senior Developer';
        IF role_id_val IS NULL THEN
             role_id_val := 2;
        END IF;
    END IF;

    encrypted_pw := crypt(password, gen_salt('bf'));

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        confirmation_token, recovery_token,
        raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated',
        email, encrypted_pw, now(), now(), now(), '', '',
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('name', name),
        FALSE
    ) RETURNING id INTO new_user_id;

    -- CRITICAL FIX: Supabase Auth requires an identity to exist for login (grant_type=password)
    INSERT INTO auth.identities (
        provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        new_user_id::text, new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', email),
        'email', now(), now(), now()
    );

    INSERT INTO public.profiles (id, name, role_id, status, color, avatar)
    VALUES (new_user_id, name, role_id_val, 'active', 'bg-indigo-500', NULL)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, role_id = EXCLUDED.role_id, status = 'active';

    SELECT jsonb_build_object(
        'id', new_user_id,
        'email', email,
        'name', name,
        'role', role_name,
        'status', 'active'
    ) INTO new_user_data;

    RETURN new_user_data;
END;
$$;
