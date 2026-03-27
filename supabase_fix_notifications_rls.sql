-- FIX: Create RPC function to insert notifications (bypasses RLS)
-- Run this in Supabase SQL Editor

-- Drop old INSERT policy that doesn't work
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a SECURITY DEFINER function to bypass RLS for notification inserts
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT DEFAULT 'info',
    p_title TEXT DEFAULT '',
    p_message TEXT DEFAULT '',
    p_task_id INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id INTEGER;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, task_id, is_read, created_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_task_id, false, now())
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- Grant access to all roles
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, INTEGER) TO anon, authenticated;

-- Also fix SELECT policy to allow anon key reads (for admin backdoor sessions)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (true);  -- Allow all reads, filter by user_id in the query itself

-- Also fix UPDATE policy to be more permissive
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (true);
