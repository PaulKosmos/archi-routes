-- 023_foreign_key_indexes.sql
-- Миграция для добавления индексов на внешние ключи
-- Согласно LAUNCH_READINESS_REPORT.md раздел 2.1
-- Критично для производительности: ускорение JOIN операций в 10-100 раз

-- =====================================================
-- ЧАСТЬ 1: Индексы для таблицы architecture_news
-- =====================================================

-- Индекс для редактора новостей
CREATE INDEX IF NOT EXISTS idx_architecture_news_editor_id
ON architecture_news(editor_id);

-- Индекс для автора новостей
CREATE INDEX IF NOT EXISTS idx_architecture_news_author_id
ON architecture_news(author_id);

-- Индекс для категории и статуса (составной для фильтрации)
CREATE INDEX IF NOT EXISTS idx_architecture_news_category
ON architecture_news(category);

CREATE INDEX IF NOT EXISTS idx_architecture_news_status_published
ON architecture_news(status, published_at DESC);


-- =====================================================
-- ЧАСТЬ 2: Индексы для таблицы buildings
-- =====================================================

-- Индекс для избранного отзыва
CREATE INDEX IF NOT EXISTS idx_buildings_featured_review_id
ON buildings(featured_review_id);

-- Индекс для модератора здания
CREATE INDEX IF NOT EXISTS idx_buildings_moderated_by
ON buildings(moderated_by);

-- Индекс для создателя здания
CREATE INDEX IF NOT EXISTS idx_buildings_created_by
ON buildings(created_by);

-- Составные индексы для поиска и фильтрации
CREATE INDEX IF NOT EXISTS idx_buildings_city_country
ON buildings(city, country);

CREATE INDEX IF NOT EXISTS idx_buildings_style
ON buildings(architectural_style);

CREATE INDEX IF NOT EXISTS idx_buildings_year
ON buildings(year_built);

CREATE INDEX IF NOT EXISTS idx_buildings_moderation_status
ON buildings(moderation_status) WHERE moderation_status IS NOT NULL;


-- =====================================================
-- ЧАСТЬ 3: Индексы для таблицы building_reviews
-- =====================================================

-- Индекс для здания (самый частый JOIN)
CREATE INDEX IF NOT EXISTS idx_building_reviews_building_id
ON building_reviews(building_id);

-- Индекс для пользователя
CREATE INDEX IF NOT EXISTS idx_building_reviews_user_id
ON building_reviews(user_id);

-- Составной индекс для получения отзывов здания по рейтингу
CREATE INDEX IF NOT EXISTS idx_building_reviews_building_rating
ON building_reviews(building_id, user_rating_avg DESC, created_at DESC);


-- =====================================================
-- ЧАСТЬ 4: Индексы для таблицы routes
-- =====================================================

-- Индекс для создателя маршрута
CREATE INDEX IF NOT EXISTS idx_routes_created_by
ON routes(created_by);

-- Индекс для модератора маршрута
CREATE INDEX IF NOT EXISTS idx_routes_moderated_by
ON routes(moderated_by);

-- Составные индексы для фильтрации
CREATE INDEX IF NOT EXISTS idx_routes_city_country
ON routes(city, country);

CREATE INDEX IF NOT EXISTS idx_routes_visibility_status
ON routes(route_visibility, publication_status);

CREATE INDEX IF NOT EXISTS idx_routes_created_by_published
ON routes(created_by, is_published);

CREATE INDEX IF NOT EXISTS idx_routes_source_priority
ON routes(route_source, priority_score DESC);


-- =====================================================
-- ЧАСТЬ 5: Индексы для таблицы route_points
-- =====================================================

-- Индекс для маршрута (критично важный - часто используется)
CREATE INDEX IF NOT EXISTS idx_route_points_route_id
ON route_points(route_id);

-- Индекс для здания
CREATE INDEX IF NOT EXISTS idx_route_points_building_id
ON route_points(building_id);

-- Составной индекс для сортировки точек маршрута
CREATE INDEX IF NOT EXISTS idx_route_points_route_order
ON route_points(route_id, order_index);


-- =====================================================
-- ЧАСТЬ 6: Индексы для таблицы notifications
-- =====================================================

-- Индекс для пользователя (критично важный)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- Индекс для связанного здания
CREATE INDEX IF NOT EXISTS idx_notifications_related_building_id
ON notifications(related_building_id) WHERE related_building_id IS NOT NULL;

-- Индекс для связанного маршрута
CREATE INDEX IF NOT EXISTS idx_notifications_related_route_id
ON notifications(related_route_id) WHERE related_route_id IS NOT NULL;

-- Индекс для связанного отзыва
CREATE INDEX IF NOT EXISTS idx_notifications_related_review_id
ON notifications(related_review_id) WHERE related_review_id IS NOT NULL;

-- Составной индекс для получения уведомлений пользователя
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON notifications(user_id, is_read, created_at DESC);


-- =====================================================
-- ЧАСТЬ 7: Индексы для таблицы route_completions
-- =====================================================

-- Индекс для маршрута
CREATE INDEX IF NOT EXISTS idx_route_completions_route_id
ON route_completions(route_id);

-- Индекс для пользователя
CREATE INDEX IF NOT EXISTS idx_route_completions_user_id
ON route_completions(user_id);

-- Составной индекс для получения завершений пользователя
CREATE INDEX IF NOT EXISTS idx_route_completions_user_completed
ON route_completions(user_id, completed_at DESC);


-- =====================================================
-- ЧАСТЬ 8: Индексы для таблицы user_collections
-- =====================================================

-- Индекс для пользователя
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id
ON user_collections(user_id);

-- Составной индекс для публичных коллекций
CREATE INDEX IF NOT EXISTS idx_user_collections_public
ON user_collections(is_public, created_at DESC) WHERE is_public = true;


-- =====================================================
-- ЧАСТЬ 9: Индексы для таблицы collection_items
-- =====================================================

-- Индекс для коллекции
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id
ON collection_items(collection_id);

-- Индекс для элемента (полиморфная связь)
CREATE INDEX IF NOT EXISTS idx_collection_items_item_id
ON collection_items(item_id);

-- Составной индекс для элементов по типу
CREATE INDEX IF NOT EXISTS idx_collection_items_item_type_id
ON collection_items(item_type, item_id);

-- Составной индекс для элементов коллекции
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_added
ON collection_items(collection_id, added_at DESC);


-- =====================================================
-- ЧАСТЬ 10: Индексы для таблицы blog_posts
-- =====================================================

-- Индекс для автора блога
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id
ON blog_posts(author_id);

-- Составной индекс для опубликованных постов
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published
ON blog_posts(status, published_at DESC);


-- =====================================================
-- ЧАСТЬ 11: Индексы для таблицы blog_post_reactions
-- =====================================================

-- Индекс для поста
CREATE INDEX IF NOT EXISTS idx_blog_post_reactions_post_id
ON blog_post_reactions(post_id);

-- Индекс для пользователя
CREATE INDEX IF NOT EXISTS idx_blog_post_reactions_user_id
ON blog_post_reactions(user_id);

-- Уникальный индекс для предотвращения дубликатов реакций
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_post_reactions_unique
ON blog_post_reactions(post_id, user_id);


-- =====================================================
-- ЧАСТЬ 12: Индексы для таблицы blog_post_routes
-- =====================================================

-- Индекс для поста
CREATE INDEX IF NOT EXISTS idx_blog_post_routes_post_id
ON blog_post_routes(post_id);

-- Индекс для маршрута
CREATE INDEX IF NOT EXISTS idx_blog_post_routes_route_id
ON blog_post_routes(route_id);


-- =====================================================
-- ЧАСТЬ 13: Индексы для таблицы blog_post_tags
-- =====================================================

-- Индекс для поста
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id
ON blog_post_tags(post_id);

-- Индекс для тега
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id
ON blog_post_tags(tag_id);


-- =====================================================
-- ЧАСТЬ 14: Индексы для таблицы blog_reading_stats
-- =====================================================

-- Индекс для поста
CREATE INDEX IF NOT EXISTS idx_blog_reading_stats_post_id
ON blog_reading_stats(post_id);

-- Индекс для пользователя
CREATE INDEX IF NOT EXISTS idx_blog_reading_stats_user_id
ON blog_reading_stats(user_id);

-- Уникальный индекс для предотвращения дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_reading_stats_unique
ON blog_reading_stats(post_id, user_id);


-- =====================================================
-- ЧАСТЬ 15: Индексы для таблицы news_post_buildings
-- =====================================================

-- Индекс для новостного поста
CREATE INDEX IF NOT EXISTS idx_news_post_buildings_news_post_id
ON news_post_buildings(news_post_id);

-- Индекс для здания
CREATE INDEX IF NOT EXISTS idx_news_post_buildings_building_id
ON news_post_buildings(building_id);


-- =====================================================
-- ЧАСТЬ 16: Индексы для таблицы podcast_episodes
-- =====================================================

-- Индекс для серии подкаста
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_series_id
ON podcast_episodes(series_id) WHERE series_id IS NOT NULL;

-- Индекс для автора подкаста
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_author_id
ON podcast_episodes(author_id);

-- Составной индекс для эпизодов серии
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_series_episode
ON podcast_episodes(series_id, episode_number) WHERE series_id IS NOT NULL;

-- Составной индекс для опубликованных эпизодов
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_status_published
ON podcast_episodes(status, published_at DESC);


-- =====================================================
-- ЧАСТЬ 17: Индексы для таблицы user_follows
-- =====================================================

-- Индекс для подписчика
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id
ON user_follows(follower_id);

-- Индекс для того, на кого подписались
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id
ON user_follows(following_id);

-- Уникальный индекс для предотвращения дубликатов подписок
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_follows_unique
ON user_follows(follower_id, following_id);


-- =====================================================
-- ЧАСТЬ 18: Индексы для таблицы route_point_review_selections
-- =====================================================

-- Индекс для точки маршрута
CREATE INDEX IF NOT EXISTS idx_route_point_review_selections_route_point_id
ON route_point_review_selections(route_point_id);

-- Индекс для отзыва здания
CREATE INDEX IF NOT EXISTS idx_route_point_review_selections_building_review_id
ON route_point_review_selections(building_review_id);

-- Индекс для маршрута
CREATE INDEX IF NOT EXISTS idx_route_point_review_selections_route_id
ON route_point_review_selections(route_id);

-- Индекс для пользователя
CREATE INDEX IF NOT EXISTS idx_route_point_review_selections_user_id
ON route_point_review_selections(user_id);

-- Уникальный индекс для предотвращения дубликатов выбора отзыва для точки
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_point_review_selections_unique
ON route_point_review_selections(route_point_id, building_review_id);


-- =====================================================
-- ЧАСТЬ 19: Проверка и отчет
-- =====================================================

-- Функция для проверки созданных индексов
CREATE OR REPLACE FUNCTION check_foreign_key_indexes()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  column_names TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.relname::TEXT,
    i.relname::TEXT,
    array_to_string(array_agg(a.attname), ', ')
  FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
  WHERE t.relname IN (
    'architecture_news', 'buildings', 'building_reviews', 'routes', 'route_points',
    'notifications', 'route_completions', 'user_collections', 'collection_items',
    'blog_posts', 'blog_post_reactions', 'blog_post_routes', 'blog_post_tags',
    'blog_reading_stats', 'news_post_buildings', 'podcast_episodes',
    'user_follows', 'route_point_review_selections'
  )
  AND i.relname LIKE 'idx_%'
  GROUP BY t.relname, i.relname
  ORDER BY t.relname, i.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вывод результата проверки
SELECT * FROM check_foreign_key_indexes();

-- Статистика по индексам
SELECT
  schemaname,
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'architecture_news', 'buildings', 'building_reviews', 'routes', 'route_points',
    'notifications', 'route_completions', 'user_collections', 'collection_items',
    'blog_posts', 'blog_post_reactions', 'blog_post_routes', 'blog_post_tags',
    'blog_reading_stats', 'news_post_buildings', 'podcast_episodes',
    'user_follows', 'route_point_review_selections'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;
