-- Add order_index column to projects table for custom ordering in List View
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
