-- ============================================================
-- AI Moderation + Translation System for Building Reviews
-- ============================================================

-- 1. Add AI workflow fields to building_reviews
-- ============================================================
ALTER TABLE building_reviews
  ADD COLUMN IF NOT EXISTS original_language TEXT,
  ADD COLUMN IF NOT EXISTS workflow_stage TEXT DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS ai_moderation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_moderation_result JSONB,
  ADD COLUMN IF NOT EXISTS ai_moderation_score FLOAT,
  ADD COLUMN IF NOT EXISTS ai_moderation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_moderation_model TEXT;

-- Add check constraints
ALTER TABLE building_reviews
  ADD CONSTRAINT chk_workflow_stage CHECK (
    workflow_stage IN ('submitted','ai_moderating','ai_done','translating','ready_for_review','published')
  ),
  ADD CONSTRAINT chk_ai_moderation_status CHECK (
    ai_moderation_status IN ('pending','processing','passed','flagged','error')
  );

-- Back-fill existing approved reviews so they skip the AI queue
UPDATE building_reviews
SET
  workflow_stage = 'published',
  ai_moderation_status = 'passed',
  original_language = language
WHERE moderation_status = 'approved'
  AND workflow_stage = 'submitted';

-- Pending reviews stay at 'submitted' but mark as ai pending (already default)


-- 2. review_translations — stores one row per language per review
-- ============================================================
CREATE TABLE IF NOT EXISTS review_translations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         UUID NOT NULL REFERENCES building_reviews(id) ON DELETE CASCADE,
  language          TEXT NOT NULL,           -- ISO 639-1: en, de, es, fr, zh, ar, ru
  is_original       BOOLEAN DEFAULT FALSE,   -- true = source language
  title             TEXT,
  content           TEXT NOT NULL,
  translated_by     TEXT DEFAULT 'ai',
  translation_model TEXT,
  status            TEXT DEFAULT 'pending',
  admin_edited      BOOLEAN DEFAULT FALSE,
  edited_by         UUID REFERENCES profiles(id),
  edited_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, language),
  CONSTRAINT chk_translated_by CHECK (translated_by IN ('ai','human')),
  CONSTRAINT chk_translation_status CHECK (
    status IN ('pending','ready','edited_by_admin','approved')
  )
);

CREATE INDEX IF NOT EXISTS idx_review_translations_review_id
  ON review_translations(review_id);

CREATE INDEX IF NOT EXISTS idx_review_translations_language
  ON review_translations(language);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_review_translations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_translations_updated_at ON review_translations;
CREATE TRIGGER trg_review_translations_updated_at
  BEFORE UPDATE ON review_translations
  FOR EACH ROW EXECUTE FUNCTION update_review_translations_updated_at();


-- 3. ai_prompts — admin-editable prompts for moderation & translation
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_prompts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT UNIQUE NOT NULL,
  description      TEXT,
  prompt_template  TEXT NOT NULL,
  model            TEXT DEFAULT 'gemini-1.5-flash',
  fallback_model   TEXT DEFAULT 'gemini-1.5-pro',
  is_active        BOOLEAN DEFAULT TRUE,
  updated_by       UUID REFERENCES profiles(id),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default prompts
INSERT INTO ai_prompts (name, description, prompt_template, model, fallback_model)
VALUES
(
  'review_moderation',
  'Prompt for AI content moderation of building reviews',
  'You are a content moderator for Archi-Routes, an architectural heritage discovery platform. Analyze the user-submitted review and determine if it is appropriate for publication.

PLATFORM CONTEXT:
Archi-Routes is a platform for discovering and reviewing architectural buildings worldwide. Users submit reviews about buildings covering: architecture style, historical context, personal visit experience, aesthetics, construction details, and cultural significance.

REVIEW TO ANALYZE:
Original language: {language}
Title: {title}
Content: {content}

CHECK FOR (flag each issue found):
- "profanity": Explicit language, insults, hate speech, discriminatory content
- "political": Political propaganda, controversial political statements, extremist ideology
- "spam": Advertising, promotional content, irrelevant links, repetitive/nonsensical content
- "off_topic": Content completely unrelated to the building or architecture
- "harassment": Personal attacks, threats, doxxing, targeting specific individuals
- "misinformation": Clearly false historical/architectural facts presented as truth

SCORING:
- 1.0 = completely safe and high quality
- 0.7-0.9 = safe but minor issues (note in reasoning)
- 0.4-0.6 = borderline, requires human review
- 0.0-0.3 = unsafe, should be rejected

RESPOND WITH VALID JSON ONLY — no markdown, no text outside the JSON:
{
  "safe": true,
  "score": 0.95,
  "flags": [],
  "reasoning": "The review provides detailed architectural analysis of the building''s constructivist style with appropriate historical context. Language is professional and respectful.",
  "recommendation": "approve",
  "detected_language": "en"
}',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
),
(
  'review_translation',
  'Prompt for translating building reviews to multiple languages at once',
  'You are a professional translator specializing in architectural heritage and cultural content. Translate the following building review from {source_language} to ALL of these target languages: {target_languages}.

ORIGINAL REVIEW:
Title: {title}
Content: {content}

TRANSLATION GUIDELINES:
- Preserve the author''s personal tone and writing style
- Keep architectural and technical terms accurate (use official local terminology)
- Maintain cultural references with natural translations for the target culture
- Do not add, remove, or change any information
- Keep proper nouns as-is or use the officially recognized local name
- If the original has informal/casual language, mirror that in translations

RESPOND WITH VALID JSON ONLY — no markdown, no text outside the JSON. Structure:
{
  "en": { "title": "...", "content": "..." },
  "de": { "title": "...", "content": "..." },
  "es": { "title": "...", "content": "..." },
  "fr": { "title": "...", "content": "..." },
  "zh": { "title": "...", "content": "..." },
  "ar": { "title": "...", "content": "..." },
  "ru": { "title": "...", "content": "..." }
}
Include ONLY the languages listed in target_languages — skip the source language.',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
)
ON CONFLICT (name) DO NOTHING;


-- 4. RLS Policies
-- ============================================================

-- review_translations RLS
ALTER TABLE review_translations ENABLE ROW LEVEL SECURITY;

-- Public: read only approved translations
CREATE POLICY "public_read_approved_translations"
  ON review_translations FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Moderators/admins: read everything
CREATE POLICY "moderators_read_all_translations"
  ON review_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Moderators/admins: update translations (for editing)
CREATE POLICY "moderators_update_translations"
  ON review_translations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
    )
  );

-- ai_prompts RLS
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Admins/moderators: full access
CREATE POLICY "admins_manage_prompts"
  ON ai_prompts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
