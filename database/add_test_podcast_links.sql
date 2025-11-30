-- Add test platform links to existing podcast episodes
-- Run this after applying migration 016

-- Update first episode with all platform links
UPDATE podcast_episodes
SET
  apple_podcasts_url = 'https://podcasts.apple.com/us/podcast/example',
  spotify_url = 'https://open.spotify.com/episode/example',
  yandex_music_url = 'https://music.yandex.ru/album/example',
  google_podcasts_url = 'https://podcasts.google.com/feed/example'
WHERE id = (SELECT id FROM podcast_episodes ORDER BY created_at LIMIT 1);

-- Update second episode with only some platforms
UPDATE podcast_episodes
SET
  spotify_url = 'https://open.spotify.com/episode/example2',
  apple_podcasts_url = 'https://podcasts.apple.com/us/podcast/example2'
WHERE id = (SELECT id FROM podcast_episodes ORDER BY created_at OFFSET 1 LIMIT 1);

-- Leave third episode without platform links to test conditional display
