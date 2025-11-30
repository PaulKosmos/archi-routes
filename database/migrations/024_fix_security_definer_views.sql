-- 024_fix_security_definer_views.sql
-- Миграция для исправления Security Definer views
-- Согласно LAUNCH_READINESS_REPORT.md раздел 1.2
-- Критично для безопасности: предотвращение обхода RLS политик

-- =====================================================
-- ЧАСТЬ 1: Пересоздание collection_stats без SECURITY DEFINER
-- =====================================================

-- Удаляем старое view
DROP VIEW IF EXISTS collection_stats;

-- Создаем новое view без SECURITY DEFINER
CREATE VIEW collection_stats AS
  SELECT
    c.id,
    c.name,
    c.user_id,
    c.is_public,
    COUNT(ci.id) as items_count,
    c.created_at,
    c.updated_at
  FROM user_collections c
  LEFT JOIN collection_items ci ON c.id = ci.collection_id
  GROUP BY c.id, c.name, c.user_id, c.is_public, c.created_at, c.updated_at;

-- Добавляем комментарий
COMMENT ON VIEW collection_stats IS 'Статистика коллекций пользователей. View использует SECURITY INVOKER (по умолчанию) для соблюдения RLS политик.';


-- =====================================================
-- ЧАСТЬ 2: Пересоздание collection_items_detailed без SECURITY DEFINER
-- =====================================================

-- Удаляем старое view
DROP VIEW IF EXISTS collection_items_detailed;

-- Создаем новое view без SECURITY DEFINER
CREATE VIEW collection_items_detailed AS
  SELECT
    ci.id,
    ci.collection_id,
    ci.item_type,
    ci.item_id,
    ci.added_at,
    ci.personal_note,
    ci.visit_date,
    -- Информация о здании (если это здание)
    b.name as building_name,
    b.architect as building_architect,
    b.city as building_city,
    b.country as building_country,
    b.latitude as building_latitude,
    b.longitude as building_longitude,
    b.image_url as building_photo_url,
    -- Информация о маршруте (если это маршрут)
    r.title as route_title,
    r.description as route_description,
    r.city as route_city,
    r.country as route_country,
    r.thumbnail_url as route_thumbnail_url,
    -- Информация о коллекции
    uc.name as collection_name,
    uc.user_id as collection_user_id,
    uc.is_public as collection_is_public
  FROM collection_items ci
  LEFT JOIN buildings b ON ci.item_type = 'building' AND ci.item_id = b.id
  LEFT JOIN routes r ON ci.item_type = 'route' AND ci.item_id = r.id
  LEFT JOIN user_collections uc ON ci.collection_id = uc.id;

-- Добавляем комментарий
COMMENT ON VIEW collection_items_detailed IS 'Детальная информация об элементах коллекций. View использует SECURITY INVOKER для соблюдения RLS политик.';


-- =====================================================
-- ЧАСТЬ 3: Пересоздание buildings_with_audio без SECURITY DEFINER
-- =====================================================

-- Удаляем старое view
DROP VIEW IF EXISTS buildings_with_audio;

-- Создаем новое view без SECURITY DEFINER
CREATE VIEW buildings_with_audio AS
  SELECT
    b.id,
    b.name,
    b.architect,
    b.city,
    b.country,
    b.latitude,
    b.longitude,
    b.image_url,
    b.verified,
    b.moderation_status,
    -- Подсчитываем количество отзывов с аудио
    COUNT(DISTINCT CASE WHEN br.audio_url IS NOT NULL THEN br.id END) as audio_reviews_count,
    -- Получаем первый аудио-отзыв
    (
      SELECT br2.audio_url
      FROM building_reviews br2
      WHERE br2.building_id = b.id
        AND br2.audio_url IS NOT NULL
        AND br2.is_verified = true
      ORDER BY br2.created_at DESC
      LIMIT 1
    ) as first_audio_url
  FROM buildings b
  LEFT JOIN building_reviews br ON b.id = br.building_id AND br.audio_url IS NOT NULL
  WHERE b.verified = true
    AND b.moderation_status = 'approved'
  GROUP BY b.id, b.name, b.architect, b.city, b.country, b.latitude, b.longitude, b.image_url, b.verified, b.moderation_status
  HAVING COUNT(DISTINCT CASE WHEN br.audio_url IS NOT NULL THEN br.id END) > 0;

-- Добавляем комментарий
COMMENT ON VIEW buildings_with_audio IS 'Здания с аудиогидами. View использует SECURITY INVOKER для соблюдения RLS политик.';


-- =====================================================
-- ЧАСТЬ 4: Пересоздание collections_with_stats без SECURITY DEFINER
-- =====================================================

-- Удаляем старое view
DROP VIEW IF EXISTS collections_with_stats;

-- Создаем новое view без SECURITY DEFINER
CREATE VIEW collections_with_stats AS
  SELECT
    c.id,
    c.name,
    c.description,
    c.user_id,
    c.is_public,
    c.created_at,
    c.updated_at,
    -- Статистика
    COUNT(ci.id) as total_items,
    COUNT(CASE WHEN ci.item_type = 'building' THEN 1 END) as buildings_count,
    COUNT(CASE WHEN ci.item_type = 'route' THEN 1 END) as routes_count,
    -- Информация о пользователе
    p.username as user_username,
    p.full_name as user_full_name,
    p.avatar_url as user_avatar_url
  FROM user_collections c
  LEFT JOIN collection_items ci ON c.id = ci.collection_id
  LEFT JOIN profiles p ON c.user_id = p.id
  GROUP BY c.id, c.name, c.description, c.user_id, c.is_public, c.created_at, c.updated_at,
           p.username, p.full_name, p.avatar_url;

-- Добавляем комментарий
COMMENT ON VIEW collections_with_stats IS 'Коллекции со статистикой и информацией о владельце. View использует SECURITY INVOKER для соблюдения RLS политик.';


-- =====================================================
-- ЧАСТЬ 5: Пересоздание collection_buildings_detailed без SECURITY DEFINER
-- =====================================================

-- Удаляем старое view
DROP VIEW IF EXISTS collection_buildings_detailed;

-- Создаем новое view без SECURITY DEFINER
CREATE VIEW collection_buildings_detailed AS
  SELECT
    ci.id as collection_item_id,
    ci.collection_id,
    ci.added_at,
    ci.personal_note,
    ci.visit_date,
    -- Полная информация о здании
    b.id as building_id,
    b.name,
    b.architect,
    b.architectural_style,
    b.year_built,
    b.description,
    b.city,
    b.country,
    b.address,
    b.latitude,
    b.longitude,
    b.image_url,
    b.moderation_status,
    b.created_at as building_created_at,
    -- Статистика отзывов
    COUNT(br.id) as reviews_count,
    AVG(br.user_rating_avg) as avg_rating,
    -- Информация о коллекции
    uc.name as collection_name,
    uc.user_id as collection_user_id,
    uc.is_public as collection_is_public
  FROM collection_items ci
  INNER JOIN buildings b ON ci.item_type = 'building' AND ci.item_id = b.id
  LEFT JOIN user_collections uc ON ci.collection_id = uc.id
  LEFT JOIN building_reviews br ON b.id = br.building_id
  WHERE ci.item_type = 'building'
  GROUP BY ci.id, ci.collection_id, ci.added_at, ci.personal_note, ci.visit_date,
           b.id, b.name, b.architect, b.architectural_style, b.year_built, b.description,
           b.city, b.country, b.address, b.latitude, b.longitude, b.image_url,
           b.moderation_status, b.created_at,
           uc.name, uc.user_id, uc.is_public;

-- Добавляем комментарий
COMMENT ON VIEW collection_buildings_detailed IS 'Детальная информация о зданиях в коллекциях. View использует SECURITY INVOKER для соблюдения RLS политик.';


-- =====================================================
-- ЧАСТЬ 6: Проверка и отчет
-- =====================================================

-- Функция для проверки security definer в views
CREATE OR REPLACE FUNCTION check_security_definer_views()
RETURNS TABLE (
  view_name TEXT,
  view_owner TEXT,
  security_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT as view_name,
    pg_catalog.pg_get_userbyid(c.relowner)::TEXT as view_owner,
    CASE
      WHEN pg_catalog.pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
      ELSE 'SECURITY INVOKER (default)'
    END as security_type
  FROM pg_catalog.pg_class c
  WHERE c.relkind = 'v'
    AND c.relname IN (
      'collection_stats',
      'collection_items_detailed',
      'buildings_with_audio',
      'collections_with_stats',
      'collection_buildings_detailed'
    )
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вывод результата проверки
SELECT * FROM check_security_definer_views();

-- Список всех view в схеме public
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'collection_stats',
    'collection_items_detailed',
    'buildings_with_audio',
    'collections_with_stats',
    'collection_buildings_detailed'
  )
ORDER BY viewname;
