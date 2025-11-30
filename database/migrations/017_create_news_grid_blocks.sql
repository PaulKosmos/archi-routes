-- Migration: Create news grid blocks table for custom news layout
-- Description: Allows admin/moderator to manually arrange news on /news page using predefined block types

-- Create enum for block types
CREATE TYPE news_grid_block_type AS ENUM (
  'single',      -- Single large news card
  'row-3',       -- Row with 3 equal news cards
  'row-2-1',     -- Row with 2 medium + 1 small card
  'mosaic',      -- 4 cards in mosaic layout (2x2)
  'big-2-small', -- 1 large + 2 small cards
  'full-width'   -- Full-width featured card
);

-- Create news_grid_blocks table
CREATE TABLE IF NOT EXISTS news_grid_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type news_grid_block_type NOT NULL,
  position INTEGER NOT NULL,
  news_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Ensure unique positions
  CONSTRAINT unique_position UNIQUE (position),

  -- Validate news_ids is an array
  CONSTRAINT valid_news_ids CHECK (jsonb_typeof(news_ids) = 'array')
);

-- Create index on position for fast ordering
CREATE INDEX idx_news_grid_blocks_position ON news_grid_blocks(position) WHERE is_active = true;

-- Create index on is_active for filtering
CREATE INDEX idx_news_grid_blocks_active ON news_grid_blocks(is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_grid_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_news_grid_blocks_timestamp
  BEFORE UPDATE ON news_grid_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_news_grid_blocks_updated_at();

-- Enable Row Level Security
ALTER TABLE news_grid_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active grid blocks
CREATE POLICY "Anyone can view active news grid blocks"
  ON news_grid_blocks
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admin and moderator can insert grid blocks
CREATE POLICY "Admin and moderator can insert news grid blocks"
  ON news_grid_blocks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Policy: Only admin and moderator can update grid blocks
CREATE POLICY "Admin and moderator can update news grid blocks"
  ON news_grid_blocks
  FOR UPDATE
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

-- Policy: Only admin can delete grid blocks
CREATE POLICY "Admin can delete news grid blocks"
  ON news_grid_blocks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to reorder grid blocks
CREATE OR REPLACE FUNCTION reorder_news_grid_blocks(block_id UUID, new_position INTEGER)
RETURNS void AS $$
DECLARE
  old_position INTEGER;
BEGIN
  -- Get current position
  SELECT position INTO old_position
  FROM news_grid_blocks
  WHERE id = block_id;

  IF old_position IS NULL THEN
    RAISE EXCEPTION 'Block not found';
  END IF;

  -- If moving down (increasing position)
  IF new_position > old_position THEN
    UPDATE news_grid_blocks
    SET position = position - 1
    WHERE position > old_position AND position <= new_position;

  -- If moving up (decreasing position)
  ELSIF new_position < old_position THEN
    UPDATE news_grid_blocks
    SET position = position + 1
    WHERE position >= new_position AND position < old_position;
  END IF;

  -- Update the moved block's position
  UPDATE news_grid_blocks
  SET position = new_position
  WHERE id = block_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment to table
COMMENT ON TABLE news_grid_blocks IS 'Custom grid layout configuration for news page. Allows admin/moderator to manually arrange news using different block types.';

-- Add comments to columns
COMMENT ON COLUMN news_grid_blocks.block_type IS 'Type of block layout (single, row-3, row-2-1, mosaic, big-2-small, full-width)';
COMMENT ON COLUMN news_grid_blocks.position IS 'Order of block on page (0-indexed, unique)';
COMMENT ON COLUMN news_grid_blocks.news_ids IS 'Array of news article IDs to display in this block';
COMMENT ON COLUMN news_grid_blocks.is_active IS 'Whether this block is currently active and visible';
