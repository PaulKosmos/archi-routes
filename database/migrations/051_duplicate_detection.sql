-- =====================================================
-- MIGRATION 051: Duplicate Detection System
-- Date: 2026-01-01
-- Description: Функции и индексы для проверки дубликатов зданий
-- Status: ⏳ PENDING
-- =====================================================

-- =====================================================
-- 1. ФУНКЦИЯ ПОИСКА ЗДАНИЙ В РАДИУСЕ
-- =====================================================

-- Функция для поиска зданий в радиусе (используется формула Haversine)
CREATE OR REPLACE FUNCTION find_nearby_buildings(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  city VARCHAR,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  moderation_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.city,
    b.address,
    b.latitude,
    b.longitude,
    -- Формула Haversine для расчета расстояния
    (
      6371000 * acos(
        cos(radians(lat)) * cos(radians(b.latitude)) *
        cos(radians(b.longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(b.latitude))
      )
    ) as distance_meters,
    b.moderation_status
  FROM buildings b
  WHERE
    b.moderation_status IN ('approved', 'pending')
    AND (
      -- Оптимизация: сначала фильтруем по прямоугольной области
      b.latitude BETWEEN lat - 0.001 AND lat + 0.001
      AND b.longitude BETWEEN lng - 0.001 AND lng + 0.001
    )
    AND (
      -- Точный расчет расстояния
      6371000 * acos(
        cos(radians(lat)) * cos(radians(b.latitude)) *
        cos(radians(b.longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(b.latitude))
      )
    ) <= radius_meters
  ORDER BY distance_meters
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_nearby_buildings IS
'Поиск зданий в радиусе N метров от заданной точки';

-- =====================================================
-- 2. ФУНКЦИЯ ПОИСКА ПОХОЖИХ ЗДАНИЙ ПО НАЗВАНИЮ
-- =====================================================

CREATE OR REPLACE FUNCTION find_similar_buildings_by_name(
  building_name TEXT,
  building_city TEXT,
  similarity_threshold REAL DEFAULT 0.6
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  city VARCHAR,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  similarity_score REAL,
  moderation_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.city,
    b.address,
    b.latitude,
    b.longitude,
    -- Используем функцию similarity из pg_trgm
    similarity(b.name, building_name) as similarity_score,
    b.moderation_status
  FROM buildings b
  WHERE
    b.city = building_city
    AND b.moderation_status IN ('approved', 'pending')
    AND similarity(b.name, building_name) > similarity_threshold
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_similar_buildings_by_name IS
'Поиск зданий с похожими названиями в том же городе';

-- =====================================================
-- 3. РАСШИРЕНИЕ pg_trgm ДЛЯ FUZZY SEARCH
-- =====================================================

-- Подключаем расширение для поиска по сходству текста
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- 4. ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ ПОИСКА
-- =====================================================

-- Индекс для быстрого поиска по координатам
CREATE INDEX IF NOT EXISTS idx_buildings_location
ON buildings(latitude, longitude);

-- GIN индекс для полнотекстового поиска по названию
CREATE INDEX IF NOT EXISTS idx_buildings_name_trgm
ON buildings USING gin(name gin_trgm_ops);

-- Индекс для поиска по городу + название
CREATE INDEX IF NOT EXISTS idx_buildings_city_name
ON buildings(city, name);

-- Составной индекс для фильтрации по модерации + город
CREATE INDEX IF NOT EXISTS idx_buildings_moderation_city
ON buildings(moderation_status, city);

-- =====================================================
-- 5. ФУНКЦИЯ КОМПЛЕКСНОЙ ПРОВЕРКИ ДУБЛИКАТОВ
-- =====================================================

CREATE OR REPLACE FUNCTION check_building_duplicates(
  building_name TEXT,
  building_city TEXT,
  building_lat DOUBLE PRECISION,
  building_lng DOUBLE PRECISION
)
RETURNS TABLE (
  duplicate_id UUID,
  duplicate_name VARCHAR,
  duplicate_address TEXT,
  match_type VARCHAR, -- 'exact_location', 'exact_name', 'similar_name'
  confidence VARCHAR, -- 'high', 'medium', 'low'
  distance_meters DOUBLE PRECISION,
  similarity_score REAL
) AS $$
DECLARE
  exact_match_exists BOOLEAN;
  nearby_count INTEGER;
BEGIN
  -- 1. Проверка точного совпадения названия в городе
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.address,
    'exact_name'::VARCHAR as match_type,
    'high'::VARCHAR as confidence,
    NULL::DOUBLE PRECISION as distance_meters,
    1.0::REAL as similarity_score
  FROM buildings b
  WHERE
    LOWER(b.name) = LOWER(building_name)
    AND b.city = building_city
    AND b.moderation_status IN ('approved', 'pending')
  LIMIT 5;

  -- 2. Проверка близких зданий (в радиусе 50м)
  RETURN QUERY
  SELECT
    nb.id,
    nb.name,
    nb.address,
    'exact_location'::VARCHAR as match_type,
    CASE
      WHEN nb.distance_meters < 20 THEN 'high'::VARCHAR
      WHEN nb.distance_meters < 50 THEN 'medium'::VARCHAR
      ELSE 'low'::VARCHAR
    END as confidence,
    nb.distance_meters,
    similarity(nb.name, building_name)::REAL as similarity_score
  FROM find_nearby_buildings(building_lat, building_lng, 100) nb
  LIMIT 5;

  -- 3. Проверка похожих названий (fuzzy search)
  RETURN QUERY
  SELECT
    sb.id,
    sb.name,
    sb.address,
    'similar_name'::VARCHAR as match_type,
    CASE
      WHEN sb.similarity_score > 0.8 THEN 'high'::VARCHAR
      WHEN sb.similarity_score > 0.6 THEN 'medium'::VARCHAR
      ELSE 'low'::VARCHAR
    END as confidence,
    NULL::DOUBLE PRECISION as distance_meters,
    sb.similarity_score
  FROM find_similar_buildings_by_name(building_name, building_city, 0.5) sb
  WHERE sb.id NOT IN (
    -- Исключаем уже найденные точные совпадения
    SELECT b.id FROM buildings b
    WHERE LOWER(b.name) = LOWER(building_name) AND b.city = building_city
  )
  LIMIT 5;

END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_building_duplicates IS
'Комплексная проверка на дубликаты: точное название, близкие координаты, похожие названия';

-- =====================================================
-- 6. ФУНКЦИЯ АВТОМАТИЧЕСКОЙ ПРОВЕРКИ ДУБЛИКАТОВ ПРИ СОЗДАНИИ
-- =====================================================

CREATE OR REPLACE FUNCTION auto_check_duplicates_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_record RECORD;
  duplicates_found INTEGER := 0;
  high_confidence_found BOOLEAN := FALSE;
  duplicates_json JSONB := '[]'::JSONB;
BEGIN
  -- Проверяем на дубликаты
  FOR duplicate_record IN
    SELECT * FROM check_building_duplicates(
      NEW.name,
      NEW.city,
      NEW.latitude,
      NEW.longitude
    )
  LOOP
    duplicates_found := duplicates_found + 1;

    -- Собираем информацию о дубликатах
    duplicates_json := duplicates_json || jsonb_build_object(
      'id', duplicate_record.duplicate_id,
      'name', duplicate_record.duplicate_name,
      'address', duplicate_record.duplicate_address,
      'match_type', duplicate_record.match_type,
      'confidence', duplicate_record.confidence,
      'distance_meters', duplicate_record.distance_meters,
      'similarity_score', duplicate_record.similarity_score
    );

    -- Проверяем на высокую уверенность
    IF duplicate_record.confidence = 'high' THEN
      high_confidence_found := TRUE;
    END IF;
  END LOOP;

  -- Если найдены дубликаты с высокой уверенностью
  IF high_confidence_found THEN
    -- Добавляем заметку для модератора
    NEW.rejection_reason := COALESCE(NEW.rejection_reason, '') ||
      ' [ВНИМАНИЕ: Найдены возможные дубликаты с высокой уверенностью]';
  END IF;

  -- Если есть дубликаты, добавляем в очередь модерации с пометкой
  IF duplicates_found > 0 THEN
    -- Обновим очередь модерации после вставки через триггер AFTER
    -- Здесь только помечаем что нужна проверка
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической проверки (BEFORE для изменения rejection_reason)
DROP TRIGGER IF EXISTS trigger_auto_check_duplicates ON buildings;
CREATE TRIGGER trigger_auto_check_duplicates
  BEFORE INSERT ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION auto_check_duplicates_on_insert();

-- =====================================================
-- 7. ОБНОВЛЕНИЕ ОЧЕРЕДИ МОДЕРАЦИИ С ИНФОРМАЦИЕЙ О ДУБЛИКАТАХ
-- =====================================================

CREATE OR REPLACE FUNCTION update_queue_with_duplicates()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_record RECORD;
  duplicates_json JSONB := '[]'::JSONB;
  highest_confidence VARCHAR := 'low';
BEGIN
  -- Только для зданий в очереди модерации
  IF NEW.content_type = 'building' THEN
    -- Получаем информацию о здании
    FOR duplicate_record IN
      SELECT
        d.*,
        b.name,
        b.city,
        b.latitude,
        b.longitude
      FROM buildings b,
      LATERAL check_building_duplicates(b.name, b.city, b.latitude, b.longitude) d
      WHERE b.id = NEW.content_id
    LOOP
      duplicates_json := duplicates_json || jsonb_build_object(
        'id', duplicate_record.duplicate_id,
        'name', duplicate_record.duplicate_name,
        'address', duplicate_record.duplicate_address,
        'match_type', duplicate_record.match_type,
        'confidence', duplicate_record.confidence
      );

      -- Определяем наивысшую уверенность
      IF duplicate_record.confidence = 'high' THEN
        highest_confidence := 'high';
      ELSIF duplicate_record.confidence = 'medium' AND highest_confidence != 'high' THEN
        highest_confidence := 'medium';
      END IF;
    END LOOP;

    -- Обновляем запись в очереди
    IF jsonb_array_length(duplicates_json) > 0 THEN
      NEW.duplicate_confidence := highest_confidence;
      NEW.potential_duplicates := duplicates_json;
      NEW.is_duplicate_check_needed := TRUE;

      -- Повышаем приоритет если найдены дубликаты с высокой уверенностью
      IF highest_confidence = 'high' THEN
        NEW.priority := 1; -- Высокий приоритет
      END IF;
    ELSE
      NEW.is_duplicate_check_needed := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления очереди модерации
DROP TRIGGER IF EXISTS trigger_update_queue_duplicates ON moderation_queue;
CREATE TRIGGER trigger_update_queue_duplicates
  BEFORE INSERT ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_with_duplicates();

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =====================================================

SELECT
  'Migration 051: Duplicate detection system created successfully' as status,
  'pg_trgm extension enabled' as extension_status,
  'Indexes created for location and name search' as indexes_status,
  'Functions: find_nearby_buildings, find_similar_buildings_by_name, check_building_duplicates' as functions_status,
  'Automatic duplicate check on building insert' as automation_status;
