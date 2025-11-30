-- Migration: Update news grid block types
-- Description: Redesign block types to match archi.ru style with 3-column grid system
-- Date: 2025-01-12

-- ============================================================
-- STEP 1: Migrate existing blocks to new types
-- ============================================================

-- Update 'single' blocks to 'featured-single'
UPDATE news_grid_blocks
SET block_type = 'single'::text::news_grid_block_type
WHERE block_type = 'single';

-- Update 'full-width' blocks to 'featured-single' (will be renamed after enum update)
UPDATE news_grid_blocks
SET block_type = 'full-width'::text::news_grid_block_type
WHERE block_type = 'full-width';

-- Update 'row-2-1' blocks to 'row-3' (closest match - 3 news items)
-- Note: Admin will need to manually adjust these if needed
UPDATE news_grid_blocks
SET block_type = 'row-3'::text::news_grid_block_type
WHERE block_type = 'row-2-1';

-- Update 'big-2-small' blocks to 'row-3' (closest match - 3 news items)
-- Note: Admin will need to manually adjust these if needed
UPDATE news_grid_blocks
SET block_type = 'big-2-small'::text::news_grid_block_type
WHERE block_type = 'big-2-small';

-- Keep 'row-3' and 'mosaic' as is

-- ============================================================
-- STEP 2: Create new enum type with updated values
-- ============================================================

-- Create new enum type
CREATE TYPE news_grid_block_type_new AS ENUM (
  'featured-single',    -- Single featured news (full width - 3 columns)
  'row-2',              -- Row with 2 equal news cards
  'row-3',              -- Row with 3 equal news cards
  'mosaic',             -- 4 cards in mosaic layout (2x2)
  'complex-big-small'   -- Complex: 2x2 grid (4 news) + 2x1 column (2 news) = 6 total
);

-- ============================================================
-- STEP 3: Update the table to use new enum
-- ============================================================

-- Convert existing values to text, then to new enum
-- Map old values to new values:
-- 'single' -> 'featured-single'
-- 'full-width' -> 'featured-single'
-- 'row-2-1' -> 'row-3'
-- 'big-2-small' -> 'row-3'
-- 'row-3' -> 'row-3'
-- 'mosaic' -> 'mosaic'

ALTER TABLE news_grid_blocks
  ALTER COLUMN block_type TYPE text;

-- Update the mappings
UPDATE news_grid_blocks
SET block_type = CASE block_type
  WHEN 'single' THEN 'featured-single'
  WHEN 'full-width' THEN 'featured-single'
  WHEN 'row-2-1' THEN 'row-3'
  WHEN 'big-2-small' THEN 'row-3'
  ELSE block_type
END;

-- Now convert to new enum type
ALTER TABLE news_grid_blocks
  ALTER COLUMN block_type TYPE news_grid_block_type_new
  USING block_type::news_grid_block_type_new;

-- ============================================================
-- STEP 4: Clean up old enum type
-- ============================================================

-- Drop old enum type
DROP TYPE news_grid_block_type;

-- Rename new type to original name
ALTER TYPE news_grid_block_type_new RENAME TO news_grid_block_type;

-- ============================================================
-- STEP 5: Update comments
-- ============================================================

COMMENT ON COLUMN news_grid_blocks.block_type IS 'Type of block layout (featured-single, row-2, row-3, mosaic, complex-big-small)';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Summary of changes:
-- - Removed types: 'single', 'row-2-1', 'big-2-small', 'full-width'
-- - Added types: 'featured-single', 'row-2', 'complex-big-small'
-- - Kept types: 'row-3', 'mosaic'
--
-- Data migration:
-- - 'single' -> 'featured-single'
-- - 'full-width' -> 'featured-single'
-- - 'row-2-1' -> 'row-3' (may need manual adjustment)
-- - 'big-2-small' -> 'row-3' (may need manual adjustment)
