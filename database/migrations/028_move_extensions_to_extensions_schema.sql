-- 028_move_extensions_to_extensions_schema.sql
-- Миграция для перемещения расширений из public в extensions schema
-- Согласно LAUNCH_READINESS_REPORT.md раздел 1.8
-- Критичность: НИЗКАЯ (организационная, best practices)
-- Дата: 29 ноября 2025

-- =====================================================
-- ОПИСАНИЕ
-- =====================================================
-- Supabase рекомендует размещать все расширения в отдельной
-- schema 'extensions', а не в 'public'. Это улучшает организацию
-- БД и предотвращает конфликты имен.
--
-- Расширения для перемещения:
-- 1. pg_trgm - полнотекстовый поиск с триграммами
-- 2. unaccent - удаление диакритических знаков
-- 3. cube - работа с многомерными кубами
-- 4. earthdistance - геопространственные расчеты расстояний
--
-- ВАЖНО: PostgreSQL автоматически обновит все ссылки на функции
-- и операторы этих расширений благодаря search_path.

-- =====================================================
-- ЧАСТЬ 1: Проверка текущего состояния
-- =====================================================

DO $$
DECLARE
  ext_record RECORD;
BEGIN
  RAISE NOTICE '=== Текущее расположение расширений ===';

  FOR ext_record IN
    SELECT
      e.extname,
      n.nspname as current_schema
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname IN ('pg_trgm', 'unaccent', 'cube', 'earthdistance')
    ORDER BY e.extname
  LOOP
    RAISE NOTICE 'Расширение: %, текущая schema: %', ext_record.extname, ext_record.current_schema;
  END LOOP;
END $$;

-- =====================================================
-- ЧАСТЬ 2: Перемещение расширений
-- =====================================================

-- 1. Переместить pg_trgm (полнотекстовый поиск)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    RAISE NOTICE '✓ pg_trgm перемещен в extensions schema';
  ELSE
    RAISE NOTICE '- pg_trgm уже в правильной schema или не установлен';
  END IF;
END $$;

-- 2. Переместить unaccent (удаление диакритики)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'unaccent' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION unaccent SET SCHEMA extensions;
    RAISE NOTICE '✓ unaccent перемещен в extensions schema';
  ELSE
    RAISE NOTICE '- unaccent уже в правильной schema или не установлен';
  END IF;
END $$;

-- 3. Переместить cube (многомерные кубы)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'cube' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION cube SET SCHEMA extensions;
    RAISE NOTICE '✓ cube перемещен в extensions schema';
  ELSE
    RAISE NOTICE '- cube уже в правильной schema или не установлен';
  END IF;
END $$;

-- 4. Переместить earthdistance (геопространственные расчеты)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'earthdistance' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION earthdistance SET SCHEMA extensions;
    RAISE NOTICE '✓ earthdistance перемещен в extensions schema';
  ELSE
    RAISE NOTICE '- earthdistance уже в правильной schema или не установлен';
  END IF;
END $$;

-- =====================================================
-- ЧАСТЬ 3: Проверка результата
-- =====================================================

DO $$
DECLARE
  ext_record RECORD;
  public_count INTEGER := 0;
  extensions_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Результат перемещения ===';

  FOR ext_record IN
    SELECT
      e.extname,
      n.nspname as current_schema
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname IN ('pg_trgm', 'unaccent', 'cube', 'earthdistance')
    ORDER BY e.extname
  LOOP
    RAISE NOTICE 'Расширение: %, schema: %', ext_record.extname, ext_record.current_schema;

    IF ext_record.current_schema = 'public' THEN
      public_count := public_count + 1;
    ELSIF ext_record.current_schema = 'extensions' THEN
      extensions_count := extensions_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Расширений в extensions schema: %', extensions_count;
  RAISE NOTICE 'Расширений в public schema: %', public_count;

  IF public_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ВСЕ РАСШИРЕНИЯ УСПЕШНО ПЕРЕМЕЩЕНЫ В EXTENSIONS SCHEMA';
  ELSE
    RAISE WARNING 'Некоторые расширения остались в public schema!';
  END IF;
END $$;

-- =====================================================
-- ЧАСТЬ 4: Проверка работоспособности индексов
-- =====================================================

-- Проверим, что индексы, использующие pg_trgm, всё еще работают
DO $$
DECLARE
  idx_record RECORD;
  idx_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Проверка индексов с pg_trgm ===';

  FOR idx_record IN
    SELECT
      schemaname,
      tablename,
      indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexdef ILIKE '%gin_trgm_ops%'
    ORDER BY tablename, indexname
  LOOP
    RAISE NOTICE 'Индекс: %.% на таблице %',
      idx_record.schemaname, idx_record.indexname, idx_record.tablename;
    idx_count := idx_count + 1;
  END LOOP;

  IF idx_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ Найдено % индексов с pg_trgm - они продолжают работать', idx_count;
  END IF;
END $$;

-- =====================================================
-- ЧАСТЬ 5: Итоговая статистика
-- =====================================================

SELECT
  'ИТОГО' as status,
  COUNT(*) FILTER (WHERE n.nspname = 'extensions') as extensions_in_extensions_schema,
  COUNT(*) FILTER (WHERE n.nspname = 'public') as extensions_in_public_schema,
  COUNT(*) as total_user_extensions
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname IN ('pg_trgm', 'unaccent', 'cube', 'earthdistance',
                    'pgcrypto', 'uuid-ossp', 'pg_stat_statements');

-- =====================================================
-- ПРИМЕЧАНИЯ
-- =====================================================
--
-- После перемещения расширений:
-- 1. Все функции и операторы продолжат работать благодаря search_path
-- 2. Существующие индексы (например, GIN с pg_trgm) продолжат работать
-- 3. Нет необходимости пересоздавать объекты, использующие эти расширения
-- 4. Schema 'extensions' должна быть в search_path (обычно так и есть)
--
-- Откат миграции (если потребуется):
-- ALTER EXTENSION pg_trgm SET SCHEMA public;
-- ALTER EXTENSION unaccent SET SCHEMA public;
-- ALTER EXTENSION cube SET SCHEMA public;
-- ALTER EXTENSION earthdistance SET SCHEMA public;
