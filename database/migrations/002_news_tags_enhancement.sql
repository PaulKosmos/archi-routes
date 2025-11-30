-- Migration: 002_news_tags_enhancement
-- Description: Расширение таблицы news_tags и создание news_article_tags для связей many-to-many
-- Date: 2025-11-06
-- Author: Claude Code

-- ============================================================
-- Расширение существующей таблицы news_tags
-- ============================================================

-- Добавляем новые колонки в существующую таблицу
ALTER TABLE news_tags
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured_category BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Добавляем CHECK constraint для parent_category
ALTER TABLE news_tags
  ADD CONSTRAINT check_parent_category
  CHECK (
    parent_category IS NULL OR
    parent_category IN ('projects', 'events', 'personalities', 'trends', 'planning', 'heritage')
  );

-- ============================================================
-- Создание таблицы news_article_tags (связь many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS news_article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связи
  news_id UUID NOT NULL REFERENCES architecture_news(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES news_tags(id) ON DELETE CASCADE,

  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Уникальная пара: одна новость не может иметь дублирующихся тегов
  UNIQUE(news_id, tag_id)
);

-- ============================================================
-- Индексы для news_tags
-- ============================================================

-- Поиск по slug (уже должен быть, но на всякий случай)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_tags_slug
ON news_tags(slug);

-- Поиск тегов, которые являются категориями
CREATE INDEX IF NOT EXISTS idx_news_tags_featured_category
ON news_tags(is_featured_category)
WHERE is_featured_category = TRUE;

-- Поиск по родительской категории
CREATE INDEX IF NOT EXISTS idx_news_tags_parent_category
ON news_tags(parent_category)
WHERE parent_category IS NOT NULL;

-- Сортировка по usage_count для популярных тегов
CREATE INDEX IF NOT EXISTS idx_news_tags_usage_count
ON news_tags(usage_count DESC);

-- Поиск по имени (для autocomplete)
CREATE INDEX IF NOT EXISTS idx_news_tags_name_trgm
ON news_tags USING gin(name gin_trgm_ops);

-- ============================================================
-- Индексы для news_article_tags
-- ============================================================

-- Быстрый поиск всех тегов для новости
CREATE INDEX IF NOT EXISTS idx_news_article_tags_news
ON news_article_tags(news_id);

-- Быстрый поиск всех новостей для тега
CREATE INDEX IF NOT EXISTS idx_news_article_tags_tag
ON news_article_tags(tag_id);

-- Композитный индекс для подсчета
CREATE INDEX IF NOT EXISTS idx_news_article_tags_composite
ON news_article_tags(tag_id, news_id);

-- ============================================================
-- Триггеры
-- ============================================================

-- Автоматическое обновление updated_at для news_tags
CREATE OR REPLACE FUNCTION update_news_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_news_tags_updated_at
  BEFORE UPDATE ON news_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_news_tags_updated_at();

-- Автоматическое обновление usage_count при добавлении/удалении связи
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE news_tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE news_tags
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_tag_usage
  AFTER INSERT ON news_article_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER trigger_decrement_tag_usage
  AFTER DELETE ON news_article_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- ============================================================
-- Row Level Security (RLS) для news_tags
-- ============================================================

-- Включаем RLS для news_tags (если не включен)
ALTER TABLE news_tags ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view all tags" ON news_tags;
  DROP POLICY IF EXISTS "Editors and admins can insert tags" ON news_tags;
  DROP POLICY IF EXISTS "Admins can update tags" ON news_tags;
  DROP POLICY IF EXISTS "Admins can delete tags" ON news_tags;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Все могут читать теги
CREATE POLICY "Public can view all tags"
  ON news_tags FOR SELECT
  USING (TRUE);

-- Только админы и редакторы могут создавать новые теги
CREATE POLICY "Editors and admins can insert tags"
  ON news_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator', 'editor')
    )
  );

-- Только админы могут редактировать теги
CREATE POLICY "Admins can update tags"
  ON news_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- Только админы могут удалять теги
CREATE POLICY "Admins can delete tags"
  ON news_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- Row Level Security (RLS) для news_article_tags
-- ============================================================

-- Включаем RLS
ALTER TABLE news_article_tags ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view tags for published news" ON news_article_tags;
  DROP POLICY IF EXISTS "Authors can view tags for their news" ON news_article_tags;
  DROP POLICY IF EXISTS "Admins and moderators can view all article tags" ON news_article_tags;
  DROP POLICY IF EXISTS "Authors can insert tags for their news" ON news_article_tags;
  DROP POLICY IF EXISTS "Authors and admins can delete article tags" ON news_article_tags;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Все могут читать связи тегов для опубликованных новостей
CREATE POLICY "Public can view tags for published news"
  ON news_article_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_article_tags.news_id
      AND architecture_news.status = 'published'
    )
  );

-- Авторы могут видеть теги своих новостей
CREATE POLICY "Authors can view tags for their news"
  ON news_article_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_article_tags.news_id
      AND architecture_news.author_id = auth.uid()
    )
  );

-- Админы и модераторы видят все
CREATE POLICY "Admins and moderators can view all article tags"
  ON news_article_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator', 'editor')
    )
  );

-- Авторы и редакторы могут добавлять теги к своим новостям
CREATE POLICY "Authors can insert tags for their news"
  ON news_article_tags FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM architecture_news
        WHERE architecture_news.id = news_article_tags.news_id
        AND architecture_news.author_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator', 'editor')
      )
    )
  );

-- Авторы и админы могут удалять теги
CREATE POLICY "Authors and admins can delete article tags"
  ON news_article_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_article_tags.news_id
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

-- ============================================================
-- Вспомогательные функции
-- ============================================================

-- Функция для получения популярных тегов
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  usage_count INTEGER,
  is_featured_category BOOLEAN,
  parent_category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.usage_count,
    t.is_featured_category,
    t.parent_category
  FROM news_tags t
  WHERE t.usage_count > 0
  ORDER BY t.usage_count DESC, t.name ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Функция для получения тегов по категории
CREATE OR REPLACE FUNCTION get_tags_by_category(category_name VARCHAR)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  usage_count INTEGER,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.usage_count,
    t.display_order
  FROM news_tags t
  WHERE t.parent_category = category_name
  ORDER BY t.display_order ASC, t.name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Функция для получения всех категорий (тегов, отмеченных как категории)
CREATE OR REPLACE FUNCTION get_featured_categories()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  parent_category VARCHAR,
  display_order INTEGER,
  color VARCHAR,
  icon VARCHAR,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.parent_category,
    t.display_order,
    t.color,
    t.icon,
    t.usage_count
  FROM news_tags t
  WHERE t.is_featured_category = TRUE
  ORDER BY t.display_order ASC, t.name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Комментарии для документации
-- ============================================================

COMMENT ON TABLE news_article_tags IS
'Связь many-to-many между новостями и тегами. Автоматически обновляет usage_count в news_tags.';

COMMENT ON COLUMN news_tags.is_featured_category IS
'Отмечает тег как категорию, отображаемую в верхней панели фильтров';

COMMENT ON COLUMN news_tags.parent_category IS
'Родительская категория из 6 основных: projects, events, personalities, trends, planning, heritage';

COMMENT ON COLUMN news_tags.usage_count IS
'Количество новостей, использующих этот тег. Обновляется автоматически через триггеры.';

COMMENT ON COLUMN news_tags.display_order IS
'Порядок отображения в списке категорий (меньше = выше)';

COMMENT ON COLUMN news_tags.color IS
'Цвет для отображения тега в UI (например, #3B82F6)';

COMMENT ON COLUMN news_tags.icon IS
'Название иконки для отображения (например, Building, Calendar, User)';
