-- Migration: 020_create_blog_content_blocks
-- Description: Создание таблицы для блочного контента блогов
-- Date: 2025-11-14
-- Author: Claude Code

-- ============================================================
-- Таблица blog_content_blocks
-- ============================================================
-- Хранит блоки контента для блогов (текст, изображения, галереи, карточки объектов)
-- Поддерживает 6 типов блоков:
--   1. text - параграф текста
--   2. text_image_right - текст с изображением справа
--   3. image_text_left - изображение слева с текстом
--   4. full_width_image - полноразмерное изображение на всю ширину
--   5. gallery - галерея изображений
--   6. building_card - карточка архитектурного объекта

CREATE TABLE IF NOT EXISTS blog_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь с постом блога
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,

  -- Порядок отображения блока (начинается с 0)
  order_index INTEGER NOT NULL,

  -- Тип блока
  block_type VARCHAR(50) NOT NULL CHECK (
    block_type IN ('text', 'text_image_right', 'image_text_left', 'full_width_image', 'gallery', 'building_card')
  ),

  -- Текстовое содержимое (HTML разрешен для форматирования)
  content TEXT,

  -- ID связанного объекта (для building_card)
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,

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
  --   "textAlign": "left" | "center" | "right",
  --   "galleryColumns": 2 | 3 | 4,
  --   "showBuildingActions": boolean (для building_card)
  -- }
  block_settings JSONB DEFAULT '{}'::jsonb,

  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Индексы
-- ============================================================

-- Быстрый поиск всех блоков для конкретного поста, отсортированных по порядку
CREATE INDEX idx_blog_content_blocks_post_order
ON blog_content_blocks(blog_post_id, order_index);

-- Поиск по типу блока (для статистики)
CREATE INDEX idx_blog_content_blocks_type
ON blog_content_blocks(block_type);

-- Поиск блоков с конкретным объектом
CREATE INDEX idx_blog_content_blocks_building
ON blog_content_blocks(building_id) WHERE building_id IS NOT NULL;

-- GIN индекс для поиска по содержимому изображений
CREATE INDEX idx_blog_content_blocks_images
ON blog_content_blocks USING GIN (images_data);

-- ============================================================
-- Триггеры
-- ============================================================

-- Автоматическое обновление updated_at при изменении
CREATE OR REPLACE FUNCTION update_blog_content_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_content_blocks_updated_at
  BEFORE UPDATE ON blog_content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_content_blocks_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Включаем RLS
ALTER TABLE blog_content_blocks ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: Все могут читать блоки опубликованных постов
CREATE POLICY "Public can view published blog blocks"
  ON blog_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_content_blocks.blog_post_id
      AND blog_posts.status = 'published'
    )
  );

-- Политика SELECT: Авторы могут видеть блоки своих постов
CREATE POLICY "Authors can view their own blog blocks"
  ON blog_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_content_blocks.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Политика SELECT: Админы и модераторы видят все блоки
CREATE POLICY "Admins and moderators can view all blog blocks"
  ON blog_content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator', 'editor')
    )
  );

-- Политика INSERT: Только авторы, редакторы, модераторы и админы могут создавать блоки
CREATE POLICY "Authenticated users can insert blocks for their blogs"
  ON blog_content_blocks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Автор поста
      EXISTS (
        SELECT 1 FROM blog_posts
        WHERE blog_posts.id = blog_content_blocks.blog_post_id
        AND blog_posts.author_id = auth.uid()
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

-- Политика UPDATE: Только авторы поста и админы/модераторы
CREATE POLICY "Authors and admins can update blog blocks"
  ON blog_content_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_content_blocks.blog_post_id
      AND (
        blog_posts.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'moderator', 'editor')
        )
      )
    )
  );

-- Политика DELETE: Только авторы поста и админы/модераторы
CREATE POLICY "Authors and admins can delete blog blocks"
  ON blog_content_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_content_blocks.blog_post_id
      AND (
        blog_posts.author_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'moderator')
        )
      )
    )
  );

-- ============================================================
-- Обновление таблицы blog_posts
-- ============================================================

-- Добавляем поле editor_version для поддержки обоих форматов редактора
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS editor_version VARCHAR(20) DEFAULT 'rich_text'
CHECK (editor_version IN ('rich_text', 'blocks'));

-- Комментарий для нового поля
COMMENT ON COLUMN blog_posts.editor_version IS
'Версия редактора: rich_text (старый) или blocks (модульный конструктор)';

-- ============================================================
-- Комментарии для документации
-- ============================================================

COMMENT ON TABLE blog_content_blocks IS
'Блоки контента для блогов. Поддерживает различные типы блоков (текст, изображения, галереи, карточки объектов) с возможностью гибкой компоновки.';

COMMENT ON COLUMN blog_content_blocks.block_type IS
'Тип блока: text, text_image_right, image_text_left, full_width_image, gallery, building_card';

COMMENT ON COLUMN blog_content_blocks.order_index IS
'Порядок отображения блока в посте (начинается с 0)';

COMMENT ON COLUMN blog_content_blocks.building_id IS
'ID связанного объекта архитектуры (только для building_card блоков)';

COMMENT ON COLUMN blog_content_blocks.images_data IS
'JSONB данные изображений с URL, alt текстом и подписями';

COMMENT ON COLUMN blog_content_blocks.block_settings IS
'JSONB настройки layout, позиционирования и отображения блока';
