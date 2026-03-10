-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- Drop existing function if it exists to allow updates
DROP FUNCTION IF EXISTS public.create_user_command;

-- Create a secure function to create a user and profile
CREATE OR REPLACE FUNCTION public.create_user_command(
    email TEXT,
    password TEXT,
    name TEXT,
    role_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/superuser)
SET search_path = public, auth, extensions -- Include extensions schema if needed
AS $$
DECLARE
    new_user_id UUID;
    encrypted_pw TEXT;
    role_id_val INTEGER;
    new_user_data JSONB;
BEGIN
    -- 1. Validate Input
    IF email IS NULL OR password IS NULL OR name IS NULL THEN
        RAISE EXCEPTION 'Email, password, and name are required';
    END IF;

    -- 2. Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = create_user_command.email) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- 3. Get Role ID (Default to Member/1 if not found)
    SELECT id INTO role_id_val FROM public.roles WHERE roles.name = role_name;
    IF role_id_val IS NULL THEN
        SELECT id INTO role_id_val FROM public.roles WHERE roles.name = 'Member';
        IF role_id_val IS NULL THEN
             role_id_val := 1; -- Fallback hardcoded
        END IF;
    END IF;

    -- 4. Hash Password
    -- Use search_path to find pgcrypto functions (usually in public or extensions)
    encrypted_pw := crypt(password, gen_salt('bf'));

    -- 5. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- Default instance_id
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        email,
        encrypted_pw,
        now(), -- Auto confirm email
        now(),
        now(),
        '',
        '',
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('name', name),
        FALSE
    ) RETURNING id INTO new_user_id;

    -- 6. Insert into public.profiles
    -- Note: The trigger 'on_auth_user_created' might run here if enabled and valid. 
    -- We use ON CONFLICT to handle potential trigger output or duplicates.
    
    INSERT INTO public.profiles (id, name, role_id, status, color, avatar)
    VALUES (
        new_user_id,
        name,
        role_id_val,
        'active', -- Auto activate manually created users
        'bg-indigo-500',
        NULL -- Default avatar
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        role_id = EXCLUDED.role_id,
        status = 'active';

    -- 7. Return success data
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

-- Grant execute permission to authenticated users (so the admin can call it)
GRANT EXECUTE ON FUNCTION public.create_user_command TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_command TO service_role;
