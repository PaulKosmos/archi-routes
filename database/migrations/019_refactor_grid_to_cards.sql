-- =====================================================
-- Migration: 019_refactor_grid_to_cards
-- Description: Refactor news grid from fixed block types to scalable cards system
-- Author: Claude Code
-- Date: 2025-11-13
-- =====================================================

-- This migration transforms the grid system from:
--   - Fixed block types (row-3, mosaic, complex, etc.)
--   - Multiple news per block (news_ids JSONB array)
-- To:
--   - Individual scalable cards
--   - One news per card with col_span/row_span

BEGIN;

-- =====================================================
-- STEP 1: Clean slate - Remove all existing grid blocks
-- =====================================================
-- User requested clean slate approach, so we delete all old data
DELETE FROM news_grid_blocks;

-- =====================================================
-- STEP 2: Drop old enum type (no longer needed)
-- =====================================================
-- First, drop the column that uses the enum
ALTER TABLE news_grid_blocks DROP COLUMN IF EXISTS block_type;

-- Then drop the enum type itself
DROP TYPE IF EXISTS news_grid_block_type CASCADE;

-- =====================================================
-- STEP 3: Transform table structure
-- =====================================================

-- Remove the old news_ids column (JSONB array)
ALTER TABLE news_grid_blocks DROP COLUMN IF EXISTS news_ids;

-- Add new columns for card-based system
ALTER TABLE news_grid_blocks
  ADD COLUMN news_id UUID REFERENCES architecture_news(id) ON DELETE CASCADE,
  ADD COLUMN col_span INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN row_span INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN card_size VARCHAR(20) NOT NULL DEFAULT 'medium';

-- =====================================================
-- STEP 4: Add constraints
-- =====================================================

-- Ensure col_span and row_span are only 1 or 2
ALTER TABLE news_grid_blocks
  ADD CONSTRAINT check_col_span CHECK (col_span IN (1, 2)),
  ADD CONSTRAINT check_row_span CHECK (row_span IN (1, 2));

-- Ensure card_size is one of the allowed values
ALTER TABLE news_grid_blocks
  ADD CONSTRAINT check_card_size CHECK (card_size IN ('small', 'medium', 'large', 'featured'));

-- Ensure news_id is not null (each card must have a news)
ALTER TABLE news_grid_blocks
  ALTER COLUMN news_id SET NOT NULL;

-- =====================================================
-- STEP 5: Update indexes
-- =====================================================

-- Drop old indexes that might exist
DROP INDEX IF EXISTS idx_news_grid_blocks_position;
DROP INDEX IF EXISTS idx_news_grid_blocks_active;

-- Create new indexes for better performance
CREATE INDEX idx_news_grid_cards_position ON news_grid_blocks(position) WHERE is_active = true;
CREATE INDEX idx_news_grid_cards_news_id ON news_grid_blocks(news_id) WHERE is_active = true;
CREATE INDEX idx_news_grid_cards_active ON news_grid_blocks(is_active);

-- =====================================================
-- STEP 6: Add unique constraint (prevent duplicate cards for same news)
-- =====================================================
-- A news can only appear once in the grid
CREATE UNIQUE INDEX idx_news_grid_unique_news ON news_grid_blocks(news_id) WHERE is_active = true;

-- =====================================================
-- STEP 7: Update RLS policies (if needed)
-- =====================================================
-- The existing RLS policies should still work, but let's verify they exist

-- Public can view active cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'news_grid_blocks' AND policyname = 'Public can view active grid blocks'
  ) THEN
    CREATE POLICY "Public can view active grid blocks"
      ON news_grid_blocks FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Admin/moderator can manage all cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'news_grid_blocks' AND policyname = 'Admin can manage all grid blocks'
  ) THEN
    CREATE POLICY "Admin can manage all grid blocks"
      ON news_grid_blocks FOR ALL
      USING (
        auth.jwt() ->> 'role' IN ('admin', 'moderator')
      );
  END IF;
END $$;

-- =====================================================
-- STEP 8: Create helper function to reorder cards
-- =====================================================
-- This function helps maintain position uniqueness when reordering
CREATE OR REPLACE FUNCTION reorder_news_grid_cards(
  card_id UUID,
  new_position INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Shift cards to make room for the moved card
  UPDATE news_grid_blocks
  SET position = position + 1
  WHERE position >= new_position
    AND id != card_id
    AND is_active = true;

  -- Update the target card's position
  UPDATE news_grid_blocks
  SET position = new_position
  WHERE id = card_id;

  -- Normalize positions (remove gaps)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
    FROM news_grid_blocks
    WHERE is_active = true
  )
  UPDATE news_grid_blocks
  SET position = ranked.new_pos
  FROM ranked
  WHERE news_grid_blocks.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 9: Add comments for documentation
-- =====================================================
COMMENT ON TABLE news_grid_blocks IS 'Stores individual news cards for the grid layout. Each card represents one news article with customizable size (col_span × row_span).';
COMMENT ON COLUMN news_grid_blocks.news_id IS 'Reference to the news article displayed in this card';
COMMENT ON COLUMN news_grid_blocks.col_span IS 'Width of the card in grid columns (1 or 2)';
COMMENT ON COLUMN news_grid_blocks.row_span IS 'Height of the card in grid rows (1 or 2)';
COMMENT ON COLUMN news_grid_blocks.card_size IS 'Visual size variant: small/medium/large/featured';
COMMENT ON COLUMN news_grid_blocks.position IS 'Display order in the grid (0-indexed, unique per active card)';
COMMENT ON COLUMN news_grid_blocks.is_active IS 'Whether this card is visible on the page';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (for manual testing)
-- =====================================================
-- Run these queries after migration to verify the changes:

-- 1. Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'news_grid_blocks'
-- ORDER BY ordinal_position;

-- 2. Check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'news_grid_blocks'::regclass;

-- 3. Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'news_grid_blocks';

-- 4. Check policies
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'news_grid_blocks';
