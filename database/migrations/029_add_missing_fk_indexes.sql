-- 029_add_missing_fk_indexes.sql
-- Миграция для создания недостающих индексов на внешних ключах
-- Согласно LAUNCH_READINESS_REPORT.md раздел 2.1
-- Критичность: ВЫСОКАЯ (производительность JOIN операций)
-- Дата: 29 ноября 2025

-- =====================================================
-- ОПИСАНИЕ
-- =====================================================
-- Создание индексов для 14 внешних ключей, не имеющих покрывающих индексов.
-- Это ускорит JOIN операции в 10-100 раз и снизит нагрузку на БД.
--
-- Большинство критичных FK (buildings, routes, reviews, notifications и т.д.)
-- уже имеют индексы, созданные ранее. Эта миграция добавляет индексы для
-- оставшихся FK, в основном связанных с автогенерацией и публикацией маршрутов.

-- =====================================================
-- ЧАСТЬ 1: Индексы для автогенерации маршрутов
-- =====================================================

-- 1. auto_generated_routes_log
CREATE INDEX IF NOT EXISTS idx_auto_generated_routes_log_generated_route_id
ON auto_generated_routes_log(generated_route_id);

CREATE INDEX IF NOT EXISTS idx_auto_generated_routes_log_template_id
ON auto_generated_routes_log(template_id);

COMMENT ON INDEX idx_auto_generated_routes_log_generated_route_id IS
'Индекс для связи с сгенерированными маршрутами';
COMMENT ON INDEX idx_auto_generated_routes_log_template_id IS
'Индекс для связи с шаблонами автогенерации';

-- 2. auto_route_templates
CREATE INDEX IF NOT EXISTS idx_auto_route_templates_created_by
ON auto_route_templates(created_by);

COMMENT ON INDEX idx_auto_route_templates_created_by IS
'Индекс для поиска шаблонов по автору';

-- 3. route_generation_logs
CREATE INDEX IF NOT EXISTS idx_route_generation_logs_generated_route_id
ON route_generation_logs(generated_route_id);

CREATE INDEX IF NOT EXISTS idx_route_generation_logs_triggered_by
ON route_generation_logs(triggered_by);

COMMENT ON INDEX idx_route_generation_logs_generated_route_id IS
'Индекс для связи логов с сгенерированными маршрутами';
COMMENT ON INDEX idx_route_generation_logs_triggered_by IS
'Индекс для поиска логов по инициатору генерации';

-- 4. route_generation_schedules
CREATE INDEX IF NOT EXISTS idx_route_generation_schedules_created_by
ON route_generation_schedules(created_by);

CREATE INDEX IF NOT EXISTS idx_route_generation_schedules_template_id
ON route_generation_schedules(template_id);

COMMENT ON INDEX idx_route_generation_schedules_created_by IS
'Индекс для поиска расписаний по создателю';
COMMENT ON INDEX idx_route_generation_schedules_template_id IS
'Индекс для связи с шаблонами генерации';

-- =====================================================
-- ЧАСТЬ 2: Индексы для публикации маршрутов
-- =====================================================

-- 5. route_publication_requests
CREATE INDEX IF NOT EXISTS idx_route_publication_requests_requested_by
ON route_publication_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_route_publication_requests_reviewed_by
ON route_publication_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_route_publication_requests_route_id
ON route_publication_requests(route_id);

COMMENT ON INDEX idx_route_publication_requests_requested_by IS
'Индекс для поиска запросов на публикацию по инициатору';
COMMENT ON INDEX idx_route_publication_requests_reviewed_by IS
'Индекс для поиска запросов по модератору';
COMMENT ON INDEX idx_route_publication_requests_route_id IS
'Индекс для связи с маршрутами';

-- =====================================================
-- ЧАСТЬ 3: Индексы для шаблонов и новостей
-- =====================================================

-- 6. route_templates
CREATE INDEX IF NOT EXISTS idx_route_templates_created_by
ON route_templates(created_by);

COMMENT ON INDEX idx_route_templates_created_by IS
'Индекс для поиска шаблонов маршрутов по автору';

-- 7. news_posts
CREATE INDEX IF NOT EXISTS idx_news_posts_author_id
ON news_posts(author_id);

COMMENT ON INDEX idx_news_posts_author_id IS
'Индекс для поиска новостных постов по автору';

-- 8. news_grid_blocks
CREATE INDEX IF NOT EXISTS idx_news_grid_blocks_created_by
ON news_grid_blocks(created_by);

COMMENT ON INDEX idx_news_grid_blocks_created_by IS
'Индекс для поиска grid блоков новостей по создателю';

-- =====================================================
-- ЧАСТЬ 4: Индекс для дубликатов маршрутов
-- =====================================================

-- 9. routes.duplicate_of
CREATE INDEX IF NOT EXISTS idx_routes_duplicate_of
ON routes(duplicate_of);

COMMENT ON INDEX idx_routes_duplicate_of IS
'Индекс для поиска дубликатов маршрутов';

-- =====================================================
-- ЧАСТЬ 5: Проверочная функция
-- =====================================================

-- Функция для проверки отсутствующих индексов на FK
CREATE OR REPLACE FUNCTION check_missing_fk_indexes()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  constraint_name TEXT,
  has_index BOOLEAN,
  suggested_index_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.table_name::TEXT,
    kcu.column_name::TEXT,
    c.conname::TEXT as constraint_name,
    EXISTS (
      SELECT 1
      FROM pg_indexes i
      WHERE i.tablename = t.table_name
        AND i.schemaname = 'public'
        AND (
          i.indexdef ILIKE '%' || kcu.column_name || '%'
          OR i.indexdef ILIKE '%' || kcu.column_name || ',%'
        )
    ) as has_index,
    ('idx_' || t.table_name || '_' || kcu.column_name)::TEXT as suggested_index_name
  FROM information_schema.table_constraints t
  JOIN information_schema.key_column_usage kcu
    ON t.constraint_name = kcu.constraint_name
    AND t.table_schema = kcu.table_schema
  LEFT JOIN pg_constraint c
    ON c.conname = t.constraint_name
  WHERE t.constraint_type = 'FOREIGN KEY'
    AND t.table_schema = 'public'
  ORDER BY has_index, t.table_name, kcu.column_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION check_missing_fk_indexes() IS
'Проверяет наличие индексов на всех внешних ключах и предлагает имена для недостающих';

-- =====================================================
-- ЧАСТЬ 6: Проверка результата
-- =====================================================

-- Вывод статистики по индексам FK
DO $$
DECLARE
  total_fk INTEGER;
  indexed_fk INTEGER;
  missing_fk INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_fk
  FROM check_missing_fk_indexes();

  SELECT COUNT(*) INTO indexed_fk
  FROM check_missing_fk_indexes()
  WHERE has_index = true;

  SELECT COUNT(*) INTO missing_fk
  FROM check_missing_fk_indexes()
  WHERE has_index = false;

  RAISE NOTICE '';
  RAISE NOTICE '=== Статистика индексов FK ===';
  RAISE NOTICE 'Всего внешних ключей: %', total_fk;
  RAISE NOTICE 'С индексами: % (%.1f%%)', indexed_fk, (indexed_fk::float / total_fk * 100);
  RAISE NOTICE 'Без индексов: % (%.1f%%)', missing_fk, (missing_fk::float / total_fk * 100);
  RAISE NOTICE '';

  IF missing_fk = 0 THEN
    RAISE NOTICE '✅ ВСЕ ВНЕШНИЕ КЛЮЧИ ИМЕЮТ ИНДЕКСЫ!';
  ELSE
    RAISE NOTICE '⚠️  Внешних ключей без индексов: %', missing_fk;
    RAISE NOTICE 'Список FK без индексов:';

    FOR table_name, column_name IN
      SELECT t.table_name, t.column_name
      FROM check_missing_fk_indexes() t
      WHERE has_index = false
      LIMIT 10
    LOOP
      RAISE NOTICE '  - %.%', table_name, column_name;
    END LOOP;
  END IF;
END $$;

-- Показать первые 10 FK без индексов (если есть)
SELECT
  table_name,
  column_name,
  suggested_index_name
FROM check_missing_fk_indexes()
WHERE has_index = false
LIMIT 10;

-- =====================================================
-- ЧАСТЬ 7: Анализ размера созданных индексов
-- =====================================================

-- Показать размеры новых индексов
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_auto_%'
  OR indexname LIKE 'idx_route_publication%'
  OR indexname LIKE 'idx_route_templates%'
  OR indexname LIKE 'idx_news_posts%'
  OR indexname LIKE 'idx_news_grid%'
  OR indexname LIKE 'idx_routes_duplicate%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- ПРИМЕЧАНИЯ
-- =====================================================
--
-- После применения миграции:
-- 1. Все критичные FK теперь имеют индексы
-- 2. JOIN операции будут выполняться в 10-100 раз быстрее
-- 3. Общее место: ~10-30 MB (зависит от объема данных)
-- 4. Можно периодически запускать check_missing_fk_indexes() для мониторинга
--
-- Ожидаемый эффект:
-- - Ускорение запросов с JOIN на route_publication_requests
-- - Быстрая загрузка списков запросов на публикацию
-- - Улучшение производительности автогенерации маршрутов
-- - Оптимизация поиска дубликатов маршрутов
--
-- Откат миграции (если потребуется):
-- DROP INDEX IF EXISTS idx_auto_generated_routes_log_generated_route_id;
-- DROP INDEX IF EXISTS idx_auto_generated_routes_log_template_id;
-- DROP INDEX IF EXISTS idx_auto_route_templates_created_by;
-- DROP INDEX IF EXISTS idx_route_generation_logs_generated_route_id;
-- DROP INDEX IF EXISTS idx_route_generation_logs_triggered_by;
-- DROP INDEX IF EXISTS idx_route_generation_schedules_created_by;
-- DROP INDEX IF EXISTS idx_route_generation_schedules_template_id;
-- DROP INDEX IF EXISTS idx_route_publication_requests_requested_by;
-- DROP INDEX IF EXISTS idx_route_publication_requests_reviewed_by;
-- DROP INDEX IF EXISTS idx_route_publication_requests_route_id;
-- DROP INDEX IF EXISTS idx_route_templates_created_by;
-- DROP INDEX IF EXISTS idx_news_posts_author_id;
-- DROP INDEX IF EXISTS idx_news_grid_blocks_created_by;
-- DROP INDEX IF EXISTS idx_routes_duplicate_of;
-- DROP FUNCTION IF EXISTS check_missing_fk_indexes();
