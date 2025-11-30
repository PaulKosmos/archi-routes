-- Migration: 003_related_news_function
-- Description: SQL функция для получения похожих новостей с взвешенным алгоритмом
-- Date: 2025-11-06
-- Author: Claude Code

-- ============================================================
-- Функция get_related_news
-- ============================================================
-- Возвращает похожие новости на основе взвешенного алгоритма:
--   - 70% вес: одинаковая категория
--   - 20% вес: пересекающиеся теги
--   - 10% вес: пересекающиеся здания
--
-- Параметры:
--   - news_id_param: UUID новости, для которой ищем похожие
--   - limit_count: максимальное количество возвращаемых новостей (по умолчанию 6)
--
-- Возвращает:
--   - Отсортированный список новостей по релевантности

CREATE OR REPLACE FUNCTION get_related_news(
  news_id_param UUID,
  limit_count INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  slug VARCHAR,
  summary TEXT,
  featured_image_url TEXT,
  category VARCHAR,
  city VARCHAR,
  published_at TIMESTAMPTZ,
  views_count INTEGER,
  likes_count INTEGER,
  relevance_score NUMERIC
) AS $$
DECLARE
  source_category VARCHAR;
  source_tags UUID[];
  source_buildings UUID[];
BEGIN
  -- Получаем данные исходной новости
  SELECT
    n.category,
    COALESCE(ARRAY_AGG(DISTINCT nat.tag_id) FILTER (WHERE nat.tag_id IS NOT NULL), '{}'),
    COALESCE(n.related_buildings, '{}')
  INTO
    source_category,
    source_tags,
    source_buildings
  FROM architecture_news n
  LEFT JOIN news_article_tags nat ON nat.news_id = n.id
  WHERE n.id = news_id_param
  GROUP BY n.id, n.category, n.related_buildings;

  -- Если новость не найдена, возвращаем пустой результат
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Возвращаем похожие новости с расчетом релевантности
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.summary,
    n.featured_image_url,
    n.category,
    n.city,
    n.published_at,
    n.views_count,
    n.likes_count,
    (
      -- 70% вес за совпадение категории
      CASE WHEN n.category = source_category THEN 0.7 ELSE 0.0 END
      +
      -- 20% вес за пересекающиеся теги (пропорционально количеству совпадений)
      CASE
        WHEN CARDINALITY(source_tags) > 0 THEN
          (
            0.2 * (
              SELECT COUNT(DISTINCT nat.tag_id)::NUMERIC
              FROM news_article_tags nat
              WHERE nat.news_id = n.id
              AND nat.tag_id = ANY(source_tags)
            ) / GREATEST(CARDINALITY(source_tags), 1)
          )
        ELSE 0.0
      END
      +
      -- 10% вес за пересекающиеся здания (пропорционально количеству совпадений)
      CASE
        WHEN CARDINALITY(source_buildings) > 0 AND CARDINALITY(n.related_buildings) > 0 THEN
          (
            0.1 * (
              SELECT COUNT(*)::NUMERIC
              FROM UNNEST(n.related_buildings) AS building_id
              WHERE building_id = ANY(source_buildings)
            ) / GREATEST(CARDINALITY(source_buildings), 1)
          )
        ELSE 0.0
      END
    )::NUMERIC(3,2) AS relevance_score
  FROM architecture_news n
  WHERE
    -- Исключаем саму новость
    n.id != news_id_param
    -- Только опубликованные новости
    AND n.status = 'published'
    -- Только с релевантностью > 0
    AND (
      n.category = source_category
      OR EXISTS (
        SELECT 1 FROM news_article_tags nat
        WHERE nat.news_id = n.id
        AND nat.tag_id = ANY(source_tags)
      )
      OR (
        CARDINALITY(source_buildings) > 0
        AND CARDINALITY(n.related_buildings) > 0
        AND n.related_buildings && source_buildings  -- Оператор пересечения массивов
      )
    )
  ORDER BY
    relevance_score DESC,
    n.published_at DESC,
    n.views_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Альтернативная функция: get_related_news_simple
-- ============================================================
-- Упрощенная версия без сложных расчетов, быстрее работает
-- Просто возвращает новости той же категории, отсортированные по дате

CREATE OR REPLACE FUNCTION get_related_news_simple(
  news_id_param UUID,
  limit_count INTEGER DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  slug VARCHAR,
  summary TEXT,
  featured_image_url TEXT,
  category VARCHAR,
  city VARCHAR,
  published_at TIMESTAMPTZ,
  views_count INTEGER,
  likes_count INTEGER
) AS $$
DECLARE
  source_category VARCHAR;
BEGIN
  -- Получаем категорию исходной новости
  SELECT n.category INTO source_category
  FROM architecture_news n
  WHERE n.id = news_id_param;

  -- Если новость не найдена, возвращаем пустой результат
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Возвращаем новости той же категории
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.summary,
    n.featured_image_url,
    n.category,
    n.city,
    n.published_at,
    n.views_count,
    n.likes_count
  FROM architecture_news n
  WHERE
    n.id != news_id_param
    AND n.status = 'published'
    AND n.category = source_category
  ORDER BY
    n.published_at DESC,
    n.views_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Функция get_news_by_building
-- ============================================================
-- Возвращает все новости, связанные с конкретным зданием
-- Используется для отображения новостей в карточке здания

CREATE OR REPLACE FUNCTION get_news_by_building(
  building_id_param UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  slug VARCHAR,
  summary TEXT,
  featured_image_url TEXT,
  category VARCHAR,
  published_at TIMESTAMPTZ,
  views_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.summary,
    n.featured_image_url,
    n.category,
    n.published_at,
    n.views_count
  FROM architecture_news n
  WHERE
    n.status = 'published'
    AND (
      -- Проверяем массив related_buildings
      building_id_param = ANY(n.related_buildings)
      OR
      -- Проверяем таблицу news_building_relations
      EXISTS (
        SELECT 1 FROM news_building_relations nbr
        WHERE nbr.news_id = n.id
        AND nbr.building_id = building_id_param
      )
    )
  ORDER BY
    n.published_at DESC,
    n.views_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Функция get_news_by_tag
-- ============================================================
-- Возвращает все новости с конкретным тегом

CREATE OR REPLACE FUNCTION get_news_by_tag(
  tag_id_param UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  slug VARCHAR,
  summary TEXT,
  featured_image_url TEXT,
  category VARCHAR,
  city VARCHAR,
  published_at TIMESTAMPTZ,
  views_count INTEGER,
  likes_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.summary,
    n.featured_image_url,
    n.category,
    n.city,
    n.published_at,
    n.views_count,
    n.likes_count
  FROM architecture_news n
  INNER JOIN news_article_tags nat ON nat.news_id = n.id
  WHERE
    nat.tag_id = tag_id_param
    AND n.status = 'published'
  ORDER BY
    n.published_at DESC,
    n.views_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Функция get_trending_news
-- ============================================================
-- Возвращает популярные новости за последний период
-- Рассчитывает trending score на основе просмотров, лайков и свежести

CREATE OR REPLACE FUNCTION get_trending_news(
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  slug VARCHAR,
  summary TEXT,
  featured_image_url TEXT,
  category VARCHAR,
  published_at TIMESTAMPTZ,
  views_count INTEGER,
  likes_count INTEGER,
  trending_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.slug,
    n.summary,
    n.featured_image_url,
    n.category,
    n.published_at,
    n.views_count,
    n.likes_count,
    (
      -- Взвешенный score: просмотры + лайки*3 + бонус за свежесть
      (n.views_count * 1.0) +
      (n.likes_count * 3.0) +
      (
        -- Бонус за свежесть: чем новее, тем выше (макс 100 баллов)
        CASE
          WHEN n.published_at >= NOW() - INTERVAL '7 days' THEN 100
          WHEN n.published_at >= NOW() - INTERVAL '14 days' THEN 50
          WHEN n.published_at >= NOW() - INTERVAL '30 days' THEN 25
          ELSE 0
        END
      )
    )::NUMERIC AS trending_score
  FROM architecture_news n
  WHERE
    n.status = 'published'
    AND n.published_at >= NOW() - (days_back || ' days')::INTERVAL
  ORDER BY
    trending_score DESC,
    n.published_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Индексы для оптимизации функций
-- ============================================================

-- Индекс для быстрого поиска по категории и статусу
CREATE INDEX IF NOT EXISTS idx_architecture_news_category_status_published
ON architecture_news(category, status, published_at DESC)
WHERE status = 'published';

-- Индекс для поиска по массиву related_buildings (GIN)
CREATE INDEX IF NOT EXISTS idx_architecture_news_related_buildings_gin
ON architecture_news USING GIN (related_buildings);

-- Индекс для trending score (статистика)
CREATE INDEX IF NOT EXISTS idx_architecture_news_stats
ON architecture_news(views_count DESC, likes_count DESC, published_at DESC)
WHERE status = 'published';

-- ============================================================
-- Комментарии для документации
-- ============================================================

COMMENT ON FUNCTION get_related_news(UUID, INTEGER) IS
'Возвращает похожие новости с взвешенным алгоритмом: 70% категория, 20% теги, 10% здания. Оптимизирована для точности.';

COMMENT ON FUNCTION get_related_news_simple(UUID, INTEGER) IS
'Упрощенная версия поиска похожих новостей. Быстрее работает, но менее точная - только по категории.';

COMMENT ON FUNCTION get_news_by_building(UUID, INTEGER) IS
'Возвращает все новости, связанные с конкретным зданием. Используется в BuildingModal.';

COMMENT ON FUNCTION get_news_by_tag(UUID, INTEGER, INTEGER) IS
'Возвращает все новости с конкретным тегом. Поддерживает пагинацию.';

COMMENT ON FUNCTION get_trending_news(INTEGER, INTEGER) IS
'Возвращает популярные новости за указанный период. Score = views + likes*3 + freshness_bonus.';
