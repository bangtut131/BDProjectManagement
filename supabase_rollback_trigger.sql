-- EMERGENCY FIX: DROP FAILING TRIGGER
-- The previous trigger caused a 500 error (likely due to missing Role ID 2).
-- Run this to remove the trigger so users can sign up again.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify we are back to normal
-- Client-side code in LoginView.jsx will handle the profile creation now.
