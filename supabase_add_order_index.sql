-- Add order_index column to subprojects table for custom ordering
ALTER TABLE public.subprojects 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Optional: Initial population of order_index based on creation or id
-- This ensures existing data isn't all 0 (though 0 is fine if we start there).
-- We can leave it as default 0 for now, and manual reordering will start fixing it.
