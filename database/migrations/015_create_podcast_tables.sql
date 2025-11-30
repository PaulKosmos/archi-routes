-- Podcast System Implementation
-- Creates tables for podcast episodes, series, and tags

-- Create podcast_series table
CREATE TABLE IF NOT EXISTS public.podcast_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  cover_image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create podcast_episodes table
CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  episode_number INTEGER,
  series_id UUID REFERENCES public.podcast_series(id) ON DELETE SET NULL,
  description TEXT,
  audio_url VARCHAR(500) NOT NULL,
  duration_seconds INTEGER,
  cover_image_url VARCHAR(500),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  view_count INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0
);

-- Create podcast_tags table
CREATE TABLE IF NOT EXISTS public.podcast_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create episode_tags junction table
CREATE TABLE IF NOT EXISTS public.episode_tags (
  episode_id UUID REFERENCES public.podcast_episodes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.podcast_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (episode_id, tag_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_series_id ON public.podcast_episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_author_id ON public.podcast_episodes(author_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_status ON public.podcast_episodes(status);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_published_at ON public.podcast_episodes(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_episode_tags_episode_id ON public.episode_tags(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_tags_tag_id ON public.episode_tags(tag_id);

-- Create RLS policies for podcast_episodes
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view published episodes
CREATE POLICY "Anyone can view published episodes"
  ON public.podcast_episodes
  FOR SELECT
  USING (status = 'published' AND published_at <= now());

-- Policy: Authenticated users can view draft episodes they created
CREATE POLICY "Users can view their own draft episodes"
  ON public.podcast_episodes
  FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND (status = 'draft' AND author_id = auth.uid())
  );

-- Policy: Admins and moderators can view all episodes
CREATE POLICY "Admins and moderators can view all episodes"
  ON public.podcast_episodes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Policy: Only admins and moderators can insert episodes
CREATE POLICY "Admins and moderators can create episodes"
  ON public.podcast_episodes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Policy: Only admins, moderators, and episode authors can update
CREATE POLICY "Authors and admins can update episodes"
  ON public.podcast_episodes
  FOR UPDATE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Policy: Only admins can delete episodes
CREATE POLICY "Admins can delete episodes"
  ON public.podcast_episodes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Enable RLS for podcast_series
ALTER TABLE public.podcast_series ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view podcast series
CREATE POLICY "Anyone can view podcast series"
  ON public.podcast_series
  FOR SELECT
  USING (true);

-- Policy: Only admins can manage podcast series
CREATE POLICY "Admins can manage series"
  ON public.podcast_series
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Enable RLS for podcast_tags
ALTER TABLE public.podcast_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tags
CREATE POLICY "Anyone can view tags"
  ON public.podcast_tags
  FOR SELECT
  USING (true);

-- Policy: Only admins can manage tags
CREATE POLICY "Admins can manage tags"
  ON public.podcast_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Enable RLS for episode_tags
ALTER TABLE public.episode_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view episode tags
CREATE POLICY "Anyone can view episode tags"
  ON public.episode_tags
  FOR SELECT
  USING (true);

-- Create a trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_podcast_episodes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER podcast_episodes_timestamp
  BEFORE UPDATE ON public.podcast_episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_episodes_timestamp();

-- Create trigger for podcast_series
CREATE OR REPLACE FUNCTION update_podcast_series_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER podcast_series_timestamp
  BEFORE UPDATE ON public.podcast_series
  FOR EACH ROW
  EXECUTE FUNCTION update_podcast_series_timestamp();
