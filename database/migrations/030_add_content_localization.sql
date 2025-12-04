-- ============================================
-- Migration: Add Content Localization Support
-- Description: Adds original_language field and English translation columns
-- to all content tables (buildings, routes, reviews, blog_posts, news_posts)
-- Date: 2025-12-02
-- ============================================

-- ============================================
-- BUILDINGS: Add localization fields
-- ============================================

-- Add original_language field
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS original_language TEXT NOT NULL DEFAULT 'ru'
  CHECK (original_language IN ('en', 'de', 'ru'));

-- Add English translation fields
ALTER TABLE buildings
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS short_description_en TEXT,
ADD COLUMN IF NOT EXISTS historical_context_en TEXT,
ADD COLUMN IF NOT EXISTS architectural_style_notes_en TEXT;

-- Add comments
COMMENT ON COLUMN buildings.original_language IS 'Language of original content: en, de, or ru';
COMMENT ON COLUMN buildings.name_en IS 'English translation of building name';
COMMENT ON COLUMN buildings.description_en IS 'English translation of description';
COMMENT ON COLUMN buildings.short_description_en IS 'English translation of short description';
COMMENT ON COLUMN buildings.historical_context_en IS 'English translation of historical context';
COMMENT ON COLUMN buildings.architectural_style_notes_en IS 'English translation of architectural style notes';

-- ============================================
-- ROUTES: Add localization fields
-- ============================================

ALTER TABLE routes
ADD COLUMN IF NOT EXISTS original_language TEXT NOT NULL DEFAULT 'ru'
  CHECK (original_language IN ('en', 'de', 'ru')),
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

COMMENT ON COLUMN routes.original_language IS 'Language of original content: en, de, or ru';
COMMENT ON COLUMN routes.title_en IS 'English translation of route title';
COMMENT ON COLUMN routes.description_en IS 'English translation of route description';

-- ============================================
-- BUILDING_REVIEWS: Add localization fields
-- ============================================

ALTER TABLE building_reviews
ADD COLUMN IF NOT EXISTS original_language TEXT NOT NULL DEFAULT 'ru'
  CHECK (original_language IN ('en', 'de', 'ru')),
ADD COLUMN IF NOT EXISTS review_text_en TEXT,
ADD COLUMN IF NOT EXISTS audio_description_en TEXT;

COMMENT ON COLUMN building_reviews.original_language IS 'Language of original content: en, de, or ru';
COMMENT ON COLUMN building_reviews.review_text_en IS 'English translation of review text';
COMMENT ON COLUMN building_reviews.audio_description_en IS 'English translation of audio description';

-- ============================================
-- BLOG_POSTS: Add localization fields
-- ============================================

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS original_language TEXT NOT NULL DEFAULT 'ru'
  CHECK (original_language IN ('en', 'de', 'ru')),
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS content_en TEXT,
ADD COLUMN IF NOT EXISTS excerpt_en TEXT;

COMMENT ON COLUMN blog_posts.original_language IS 'Language of original content: en, de, or ru';
COMMENT ON COLUMN blog_posts.title_en IS 'English translation of blog post title';
COMMENT ON COLUMN blog_posts.content_en IS 'English translation of blog post content';
COMMENT ON COLUMN blog_posts.excerpt_en IS 'English translation of blog post excerpt';

-- ============================================
-- NEWS_POSTS: Add localization fields
-- ============================================

ALTER TABLE news_posts
ADD COLUMN IF NOT EXISTS original_language TEXT NOT NULL DEFAULT 'ru'
  CHECK (original_language IN ('en', 'de', 'ru')),
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS content_en TEXT;

COMMENT ON COLUMN news_posts.original_language IS 'Language of original content: en, de, or ru';
COMMENT ON COLUMN news_posts.title_en IS 'English translation of news post title';
COMMENT ON COLUMN news_posts.content_en IS 'English translation of news post content';

-- ============================================
-- INDEXES: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_buildings_original_language ON buildings(original_language);
CREATE INDEX IF NOT EXISTS idx_routes_original_language ON routes(original_language);
CREATE INDEX IF NOT EXISTS idx_blog_posts_original_language ON blog_posts(original_language);
CREATE INDEX IF NOT EXISTS idx_news_posts_original_language ON news_posts(original_language);
CREATE INDEX IF NOT EXISTS idx_building_reviews_original_language ON building_reviews(original_language);

-- ============================================
-- USER_PREFERENCES: Table for storing user language preferences
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- UI language preference
  ui_language TEXT NOT NULL DEFAULT 'en'
    CHECK (ui_language IN ('en', 'de', 'ru')),

  -- Content language preference (original or english translation)
  content_language_preference TEXT NOT NULL DEFAULT 'original'
    CHECK (content_language_preference IN ('original', 'english')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One preference set per user
  UNIQUE(user_id)
);

-- Comments
COMMENT ON TABLE user_preferences IS 'Stores user language preferences for UI and content';
COMMENT ON COLUMN user_preferences.ui_language IS 'User interface language (en, de, ru)';
COMMENT ON COLUMN user_preferences.content_language_preference IS 'Preference for content: original language or English translation';

-- RLS policies for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================
-- HELPER FUNCTION: Get localized field value
-- ============================================

CREATE OR REPLACE FUNCTION get_localized_field(
  original_value TEXT,
  english_value TEXT,
  original_lang TEXT,
  user_preference TEXT
) RETURNS TEXT AS $$
BEGIN
  -- If user prefers original language
  IF user_preference = 'original' THEN
    RETURN original_value;
  END IF;

  -- If user prefers English
  IF user_preference = 'english' THEN
    -- Return English translation if available, otherwise original
    IF english_value IS NOT NULL AND english_value != '' THEN
      RETURN english_value;
    END IF;
    RETURN original_value;
  END IF;

  -- Default: return original
  RETURN original_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_localized_field IS 'Returns appropriate content based on user language preference';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
