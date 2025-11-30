-- Migration: 001_news_content_blocks
-- Description: Создание таблицы для блочного контента новостей
-- Date: 2025-11-06
-- Author: Claude Code

-- ============================================================
-- Таблица news_content_blocks
-- ============================================================
-- Хранит блоки контента для новостей (текст, изображения, галереи)
-- Поддерживает 5 типов блоков:
--   1. text - параграф текста
--   2. text_image_right - текст с изображением справа
--   3. image_text_left - изображение слева с текстом
--   4. two_images - две картинки рядом
--   5. gallery - 1 большая + 3 маленьких или произвольная галерея

CREATE TABLE IF NOT EXISTS news_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь с новостью
  news_id UUID NOT NULL REFERENCES architecture_news(id) ON DELETE CASCADE,

  -- Порядок отображения блока (начинается с 0)
  order_index INTEGER NOT NULL,

  -- Тип блока
  block_type VARCHAR(50) NOT NULL CHECK (
    block_type IN ('text', 'text_image_right', 'image_text_left', 'two_images', 'gallery')
  ),

  -- Текстовое содержимое (HTML разрешен для форматирования)
  content TEXT,

  -- Данные изображений в формате JSONB
  -- Структура:
  -- {
  --   "main": {"url": "...", "alt": "...", "caption": "..."},
  --   "secondary": {"url": "...", "alt": "...", "caption": "..."},
  --   "gallery": [{"url": "...", "alt": "...", "caption": "..."}, ...]
  -- }
  images_data JSONB DEFAULT '{}'::jsonb,

  -- Дополнительные настройки блока
  -- {
  --   "layout": "50-50" | "60-40" | "40-60",
  --   "imagePosition": "left" | "right",
  --   "galleryLayout": "masonry" | "grid",
  --   "textAlign": "left" | "center" | "right"
  -- }
  block_settings JSONB DEFAULT '{}'::jsonb,

  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Индексы
-- ============================================================

-- Быстрый поиск всех блоков для конкретной новости, отсортированных по порядку
CREATE INDEX idx_news_content_blocks_news_order
ON news_content_blocks(news_id, order_index);

-- Поиск по типу блока (для статистики)
CREATE INDEX idx_news_content_blocks_type
ON news_content_blocks(block_type);

-- GIN индекс для поиска по содержимому изображений
CREATE INDEX idx_news_content_blocks_images
ON news_content_blocks USING GIN (images_data);

-- ============================================================
-- Триггеры
-- ============================================================

-- Автоматическое обновление updated_at при изменении
CREATE OR REPLACE FUNCTION update_news_content_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_news_content_blocks_updated_at
  BEFORE UPDATE ON news_content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_news_content_blocks_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Включаем RLS
ALTER TABLE news_content_blocks ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: Все могут читать блоки опубликованных новостей
CREATE POLICY "Public can view published news blocks"
  ON news_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_content_blocks.news_id
      AND architecture_news.status = 'published'
    )
  );

-- Политика SELECT: Авторы могут видеть блоки своих новостей
CREATE POLICY "Authors can view their own news blocks"
  ON news_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_content_blocks.news_id
      AND architecture_news.author_id = auth.uid()
    )
  );

-- Политика SELECT: Админы и модераторы видят все блоки
CREATE POLICY "Admins and moderators can view all blocks"
  ON news_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator', 'editor')
    )
  );

-- Политика INSERT: Только авторы, редакторы, модераторы и админы могут создавать блоки
CREATE POLICY "Authenticated users can insert blocks for their news"
  ON news_content_blocks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Автор новости
      EXISTS (
        SELECT 1 FROM architecture_news
        WHERE architecture_news.id = news_content_blocks.news_id
        AND architecture_news.author_id = auth.uid()
      )
      OR
      -- Админ/модератор/редактор
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator', 'editor')
      )
    )
  );

-- Политика UPDATE: Только авторы новости и админы/модераторы
CREATE POLICY "Authors and admins can update blocks"
  ON news_content_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_content_blocks.news_id
      AND (
        architecture_news.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'moderator', 'editor')
        )
      )
    )
  );

-- Политика DELETE: Только авторы новости и админы/модераторы
CREATE POLICY "Authors and admins can delete blocks"
  ON news_content_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_content_blocks.news_id
      AND (
        architecture_news.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'moderator')
        )
      )
    )
  );

-- ============================================================
-- Комментарии для документации
-- ============================================================

COMMENT ON TABLE news_content_blocks IS
'Блоки контента для новостей. Поддерживает различные типы блоков (текст, изображения, галереи) с возможностью гибкой компоновки.';

COMMENT ON COLUMN news_content_blocks.block_type IS
'Тип блока: text, text_image_right, image_text_left, two_images, gallery';

COMMENT ON COLUMN news_content_blocks.order_index IS
'Порядок отображения блока в новости (начинается с 0)';

COMMENT ON COLUMN news_content_blocks.images_data IS
'JSONB данные изображений с URL, alt текстом и подписями';

COMMENT ON COLUMN news_content_blocks.block_settings IS
'JSONB настройки layout, позиционирования и отображения блока';
