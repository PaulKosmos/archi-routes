-- 025_additional_search_indexes.sql
-- Миграция для добавления дополнительных индексов поиска и фильтрации
-- Согласно LAUNCH_READINESS_REPORT.md раздел 2.3
-- Приоритет: НИЗКИЙ (оптимизация после запуска)

-- =====================================================
-- ЧАСТЬ 1: Недостающие индексы из рекомендаций
-- =====================================================

-- Индекс для категории новостей
CREATE INDEX IF NOT EXISTS idx_architecture_news_category
ON architecture_news(category) WHERE category IS NOT NULL;

COMMENT ON INDEX idx_architecture_news_category IS 'Индекс для фильтрации новостей по категории';


-- =====================================================
-- ЧАСТЬ 2: Индексы для полнотекстового поиска
-- =====================================================

-- Полнотекстовый поиск для зданий (name, description, architect)
CREATE INDEX IF NOT EXISTS idx_buildings_search
ON buildings USING GIN (
  to_tsvector('russian',
    COALESCE(name, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(architect, '')
  )
);

COMMENT ON INDEX idx_buildings_search IS 'GIN индекс для полнотекстового поиска по зданиям (name, description, architect)';

-- Полнотекстовый поиск для маршрутов (title, description)
CREATE INDEX IF NOT EXISTS idx_routes_search
ON routes USING GIN (
  to_tsvector('russian',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '')
  )
);

COMMENT ON INDEX idx_routes_search IS 'GIN индекс для полнотекстового поиска по маршрутам (title, description)';

-- Полнотекстовый поиск для блог-постов
CREATE INDEX IF NOT EXISTS idx_blog_posts_search
ON blog_posts USING GIN (
  to_tsvector('russian',
    COALESCE(title, '') || ' ' ||
    COALESCE(excerpt, '') || ' ' ||
    COALESCE(content, '')
  )
);

COMMENT ON INDEX idx_blog_posts_search IS 'GIN индекс для полнотекстового поиска по блог-постам';

-- Полнотекстовый поиск для новостей
CREATE INDEX IF NOT EXISTS idx_architecture_news_search
ON architecture_news USING GIN (
  to_tsvector('russian',
    COALESCE(title, '') || ' ' ||
    COALESCE(excerpt, '') || ' ' ||
    COALESCE(content, '')
  )
);

COMMENT ON INDEX idx_architecture_news_search IS 'GIN индекс для полнотекстового поиска по новостям';


-- =====================================================
-- ЧАСТЬ 3: Геопространственные индексы
-- =====================================================

-- Геопространственный индекс для зданий
CREATE INDEX IF NOT EXISTS idx_buildings_location
ON buildings USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON INDEX idx_buildings_location IS 'GIST индекс для геопространственных запросов (поиск зданий рядом)';

-- Геопространственный индекс для точек маршрутов
CREATE INDEX IF NOT EXISTS idx_route_points_location
ON route_points USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON INDEX idx_route_points_location IS 'GIST индекс для геопространственных запросов (поиск точек маршрутов)';


-- =====================================================
-- ЧАСТЬ 4: Индексы для сортировки и фильтрации
-- =====================================================

-- Индекс для сортировки зданий по рейтингу и количеству отзывов
CREATE INDEX IF NOT EXISTS idx_buildings_popularity
ON buildings(verified, moderation_status)
WHERE verified = true AND moderation_status = 'approved';

COMMENT ON INDEX idx_buildings_popularity IS 'Индекс для получения одобренных зданий';

-- Индекс для фильтрации маршрутов по сложности
CREATE INDEX IF NOT EXISTS idx_routes_difficulty
ON routes(difficulty_level, estimated_duration_minutes)
WHERE is_published = true AND publication_status = 'published';

COMMENT ON INDEX idx_routes_difficulty IS 'Индекс для фильтрации маршрутов по сложности и длительности';

-- Индекс для премиум маршрутов
CREATE INDEX IF NOT EXISTS idx_routes_premium
ON routes(is_premium, price_credits)
WHERE is_published = true AND is_premium = true;

COMMENT ON INDEX idx_routes_premium IS 'Индекс для фильтрации премиум маршрутов';

-- Индекс для получения последних блог-постов
CREATE INDEX IF NOT EXISTS idx_blog_posts_recent
ON blog_posts(published_at DESC, views_count DESC)
WHERE status = 'published';

COMMENT ON INDEX idx_blog_posts_recent IS 'Индекс для получения последних популярных блог-постов';

-- Индекс для получения последних новостей
CREATE INDEX IF NOT EXISTS idx_architecture_news_recent
ON architecture_news(published_at DESC, category)
WHERE status = 'published';

COMMENT ON INDEX idx_architecture_news_recent IS 'Индекс для получения последних новостей по категориям';

-- Индекс для получения популярных подкастов
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_popular
ON podcast_episodes(published_at DESC, listen_count DESC)
WHERE status = 'published';

COMMENT ON INDEX idx_podcast_episodes_popular IS 'Индекс для получения последних популярных подкастов';


-- =====================================================
-- ЧАСТЬ 5: Индексы для уведомлений
-- =====================================================

-- Составной индекс для непрочитанных уведомлений
CREATE INDEX IF NOT EXISTS idx_notifications_unread_recent
ON notifications(user_id, created_at DESC)
WHERE is_read = false;

COMMENT ON INDEX idx_notifications_unread_recent IS 'Индекс для быстрого получения непрочитанных уведомлений';


-- =====================================================
-- ЧАСТЬ 6: Индексы для коллекций
-- =====================================================

-- Индекс для публичных коллекций с элементами
CREATE INDEX IF NOT EXISTS idx_collections_public_with_items
ON user_collections(is_public, created_at DESC)
WHERE is_public = true;

COMMENT ON INDEX idx_collections_public_with_items IS 'Индекс для получения публичных коллекций';


-- =====================================================
-- ЧАСТЬ 7: Проверка и отчет
-- =====================================================

-- Функция для проверки созданных индексов поиска
CREATE OR REPLACE FUNCTION check_search_indexes()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.relname::TEXT as table_name,
    i.relname::TEXT as index_name,
    am.amname::TEXT as index_type
  FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_am am ON i.relam = am.oid
  WHERE t.relname IN (
    'buildings', 'routes', 'blog_posts', 'architecture_news',
    'route_points', 'notifications', 'user_collections', 'podcast_episodes'
  )
  AND i.relname LIKE 'idx_%'
  AND (
    am.amname = 'gin' OR
    am.amname = 'gist' OR
    i.relname IN (
      'idx_architecture_news_category',
      'idx_buildings_popularity',
      'idx_routes_difficulty',
      'idx_routes_premium',
      'idx_blog_posts_recent',
      'idx_architecture_news_recent',
      'idx_podcast_episodes_popular',
      'idx_notifications_unread_recent',
      'idx_collections_public_with_items'
    )
  )
  ORDER BY t.relname, i.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вывод результата проверки
SELECT * FROM check_search_indexes();

-- Статистика по типам индексов
SELECT
  index_type,
  COUNT(*) as count
FROM (
  SELECT
    am.amname as index_type
  FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_am am ON i.relam = am.oid
  WHERE schemaname = 'public'
) subq
GROUP BY index_type
ORDER BY count DESC;
