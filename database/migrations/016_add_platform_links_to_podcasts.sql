-- Migration: Add external platform links to podcast_episodes table
-- Description: Adds columns for Apple Podcasts, Spotify, Yandex Music, and Google Podcasts URLs

-- Add platform link columns to podcast_episodes
ALTER TABLE podcast_episodes
ADD COLUMN IF NOT EXISTS apple_podcasts_url TEXT,
ADD COLUMN IF NOT EXISTS spotify_url TEXT,
ADD COLUMN IF NOT EXISTS yandex_music_url TEXT,
ADD COLUMN IF NOT EXISTS google_podcasts_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN podcast_episodes.apple_podcasts_url IS 'URL to the episode on Apple Podcasts';
COMMENT ON COLUMN podcast_episodes.spotify_url IS 'URL to the episode on Spotify';
COMMENT ON COLUMN podcast_episodes.yandex_music_url IS 'URL to the episode on Yandex Music';
COMMENT ON COLUMN podcast_episodes.google_podcasts_url IS 'URL to the episode on Google Podcasts';

-- Optional: Add validation for URL format (basic check)
ALTER TABLE podcast_episodes
ADD CONSTRAINT check_apple_podcasts_url_format
  CHECK (apple_podcasts_url IS NULL OR apple_podcasts_url ~ '^https?://'),
ADD CONSTRAINT check_spotify_url_format
  CHECK (spotify_url IS NULL OR spotify_url ~ '^https?://'),
ADD CONSTRAINT check_yandex_music_url_format
  CHECK (yandex_music_url IS NULL OR yandex_music_url ~ '^https?://'),
ADD CONSTRAINT check_google_podcasts_url_format
  CHECK (google_podcasts_url IS NULL OR google_podcasts_url ~ '^https?://');
