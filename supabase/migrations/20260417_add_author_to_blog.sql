-- Migration to add author information to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS author_name text,
ADD COLUMN IF NOT EXISTS author_image_url text;

-- Update existing records if necessary (optional)
-- UPDATE public.blog_posts SET author_name = 'Lovely Memories' WHERE author_name IS NULL;
