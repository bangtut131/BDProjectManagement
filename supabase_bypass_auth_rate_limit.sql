CREATE OR REPLACE FUNCTION public.create_user_admin(
    new_email TEXT,
    new_password TEXT,
    new_name TEXT,
    new_username TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as generic postgres superuser
AS $$
DECLARE
    new_id uuid;
BEGIN
    -- 1. Create the user in auth.users directly
    -- This entirely bypasses the Supabase Gorue API, hitting postgres directly so no rate limits apply
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        new_email,
        crypt(new_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', new_name, 'username', new_username),
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_id;

    -- 2. Create the identity so they can log in 
    -- Supabase needs this to link the email login to the user
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_id,
        format('{"sub":"%s","email":"%s"}', new_id::text, new_email)::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    RETURN new_id;
END;
$$;
