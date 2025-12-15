-- Add category field to movies_imported and tv_shows_imported tables
ALTER TABLE public.movies_imported 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.tv_shows_imported 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_movies_category ON public.movies_imported(category);
CREATE INDEX IF NOT EXISTS idx_tv_shows_category ON public.tv_shows_imported(category);