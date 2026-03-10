-- Add order_index column to tasks table for custom ordering in List View
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
