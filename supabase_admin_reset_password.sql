-- RPC Function: Allow admin/PM to reset another user's password
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.admin_reset_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
BEGIN
    -- Update auth.users password directly
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % not found', target_user_id;
    END IF;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.admin_reset_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(UUID, TEXT) TO anon;
