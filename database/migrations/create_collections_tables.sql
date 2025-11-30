-- =========================================
-- СОЗДАНИЕ ТАБЛИЦ ДЛЯ СИСТЕМЫ КОЛЛЕКЦИЙ
-- =========================================

-- Создание таблицы коллекций
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  description TEXT CHECK (length(description) <= 1000),
  is_public BOOLEAN DEFAULT false,
  cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Индексы
  CONSTRAINT collections_name_not_empty CHECK (trim(name) != '')
);

-- Создание таблицы связи коллекций и зданий
CREATE TABLE IF NOT EXISTS collection_buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  personal_note TEXT CHECK (length(personal_note) <= 500),
  visit_date DATE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность связи
  UNIQUE(collection_id, building_id)
);

-- Создание таблицы пользовательских фотографий зданий
CREATE TABLE IF NOT EXISTS user_building_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  caption TEXT CHECK (length(caption) <= 200),
  taken_at DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание таблицы лайков коллекций
CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность лайка
  UNIQUE(user_id, collection_id)
);

-- =========================================
-- СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ОПТИМИЗАЦИИ
-- =========================================

-- Индексы для таблицы collections
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

-- Индексы для таблицы collection_buildings
CREATE INDEX IF NOT EXISTS idx_collection_buildings_collection_id ON collection_buildings(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_buildings_building_id ON collection_buildings(building_id);
CREATE INDEX IF NOT EXISTS idx_collection_buildings_added_at ON collection_buildings(added_at DESC);

-- Индексы для таблицы user_building_photos
CREATE INDEX IF NOT EXISTS idx_user_building_photos_user_id ON user_building_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_building_photos_building_id ON user_building_photos(building_id);
CREATE INDEX IF NOT EXISTS idx_user_building_photos_collection_id ON user_building_photos(collection_id);

-- Индексы для таблицы collection_likes
CREATE INDEX IF NOT EXISTS idx_collection_likes_collection_id ON collection_likes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_user_id ON collection_likes(user_id);

-- =========================================
-- ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- =========================================

-- Включаем RLS для всех таблиц
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_building_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_likes ENABLE ROW LEVEL SECURITY;

-- =========================================
-- СОЗДАНИЕ ПОЛИТИК БЕЗОПАСНОСТИ
-- =========================================

-- Политики для таблицы collections

-- Пользователи могут видеть свои коллекции и публичные коллекции других
CREATE POLICY "Users can view own and public collections" ON collections
  FOR SELECT USING (user_id = auth.uid() OR is_public = true);

-- Пользователи могут создавать только свои коллекции
CREATE POLICY "Users can create own collections" ON collections
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Пользователи могут обновлять только свои коллекции
CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE USING (user_id = auth.uid());

-- Пользователи могут удалять только свои коллекции
CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE USING (user_id = auth.uid());

-- Политики для таблицы collection_buildings

-- Пользователи могут видеть здания в своих коллекциях и в публичных коллекциях
CREATE POLICY "Users can view buildings in own and public collections" ON collection_buildings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_buildings.collection_id 
      AND (collections.user_id = auth.uid() OR collections.is_public = true)
    )
  );

-- Пользователи могут добавлять здания только в свои коллекции
CREATE POLICY "Users can add buildings to own collections" ON collection_buildings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_buildings.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

-- Пользователи могут обновлять связи только в своих коллекциях
CREATE POLICY "Users can update buildings in own collections" ON collection_buildings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_buildings.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

-- Пользователи могут удалять здания только из своих коллекций
CREATE POLICY "Users can remove buildings from own collections" ON collection_buildings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_buildings.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

-- Политики для таблицы user_building_photos

-- Пользователи могут видеть свои фотографии
CREATE POLICY "Users can view own building photos" ON user_building_photos
  FOR SELECT USING (user_id = auth.uid());

-- Пользователи могут создавать свои фотографии
CREATE POLICY "Users can create own building photos" ON user_building_photos
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Пользователи могут обновлять свои фотографии
CREATE POLICY "Users can update own building photos" ON user_building_photos
  FOR UPDATE USING (user_id = auth.uid());

-- Пользователи могут удалять свои фотографии
CREATE POLICY "Users can delete own building photos" ON user_building_photos
  FOR DELETE USING (user_id = auth.uid());

-- Политики для таблицы collection_likes

-- Все могут видеть лайки публичных коллекций
CREATE POLICY "Users can view likes on public collections" ON collection_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_likes.collection_id 
      AND collections.is_public = true
    )
  );

-- Пользователи могут ставить лайки публичным коллекциям
CREATE POLICY "Users can like public collections" ON collection_likes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_likes.collection_id 
      AND collections.is_public = true
    )
  );

-- Пользователи могут удалять свои лайки
CREATE POLICY "Users can remove own likes" ON collection_likes
  FOR DELETE USING (user_id = auth.uid());

-- =========================================
-- СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ
-- =========================================

-- Представление коллекций с подсчетом зданий
CREATE OR REPLACE VIEW collections_with_stats AS
SELECT 
  c.*,
  COUNT(cb.building_id) as building_count,
  COUNT(CASE WHEN cb.visit_date IS NOT NULL THEN 1 END) as visited_count,
  AVG(b.rating) as average_rating,
  COUNT(DISTINCT b.city) as cities_count,
  COUNT(DISTINCT b.architect) as architects_count,
  COUNT(cl.user_id) as likes_count
FROM collections c
LEFT JOIN collection_buildings cb ON c.id = cb.collection_id
LEFT JOIN buildings b ON cb.building_id = b.id
LEFT JOIN collection_likes cl ON c.id = cl.collection_id
GROUP BY c.id;

-- Представление для полной информации о зданиях в коллекциях
CREATE OR REPLACE VIEW collection_buildings_detailed AS
SELECT 
  cb.*,
  b.name as building_name,
  b.architect,
  b.city,
  b.country,
  b.year_built,
  b.architectural_style,
  b.image_url,
  b.rating,
  b.review_count,
  b.latitude,
  b.longitude,
  c.name as collection_name,
  c.user_id as collection_owner_id,
  c.is_public as collection_is_public
FROM collection_buildings cb
JOIN buildings b ON cb.building_id = b.id
JOIN collections c ON cb.collection_id = c.id;

-- =========================================
-- СОЗДАНИЕ ФУНКЦИЙ
-- =========================================

-- Функция для добавления здания в коллекцию
CREATE OR REPLACE FUNCTION add_building_to_collection(
  p_collection_id UUID,
  p_building_id UUID,
  p_personal_note TEXT DEFAULT NULL,
  p_visit_date DATE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем, что коллекция принадлежит текущему пользователю
  IF NOT EXISTS (
    SELECT 1 FROM collections 
    WHERE id = p_collection_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Collection not found or access denied';
  END IF;

  -- Добавляем здание в коллекцию (или обновляем, если уже есть)
  INSERT INTO collection_buildings (collection_id, building_id, personal_note, visit_date)
  VALUES (p_collection_id, p_building_id, p_personal_note, p_visit_date)
  ON CONFLICT (collection_id, building_id) 
  DO UPDATE SET 
    personal_note = EXCLUDED.personal_note,
    visit_date = EXCLUDED.visit_date,
    added_at = NOW();

  -- Обновляем время изменения коллекции
  UPDATE collections 
  SET updated_at = NOW() 
  WHERE id = p_collection_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для удаления здания из коллекции
CREATE OR REPLACE FUNCTION remove_building_from_collection(
  p_collection_id UUID,
  p_building_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем, что коллекция принадлежит текущему пользователю
  IF NOT EXISTS (
    SELECT 1 FROM collections 
    WHERE id = p_collection_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Collection not found or access denied';
  END IF;

  -- Удаляем здание из коллекции
  DELETE FROM collection_buildings 
  WHERE collection_id = p_collection_id AND building_id = p_building_id;

  -- Обновляем время изменения коллекции
  UPDATE collections 
  SET updated_at = NOW() 
  WHERE id = p_collection_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения коллекций пользователя с статистикой
CREATE OR REPLACE FUNCTION get_user_collections(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_public BOOLEAN,
  cover_image TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  building_count BIGINT,
  visited_count BIGINT,
  average_rating NUMERIC,
  cities_count BIGINT,
  likes_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.is_public,
    c.cover_image,
    c.created_at,
    c.updated_at,
    COUNT(cb.building_id) as building_count,
    COUNT(CASE WHEN cb.visit_date IS NOT NULL THEN 1 END) as visited_count,
    ROUND(AVG(b.rating), 1) as average_rating,
    COUNT(DISTINCT b.city) as cities_count,
    COUNT(cl.user_id) as likes_count
  FROM collections c
  LEFT JOIN collection_buildings cb ON c.id = cb.collection_id
  LEFT JOIN buildings b ON cb.building_id = b.id
  LEFT JOIN collection_likes cl ON c.id = cl.collection_id
  WHERE c.user_id = COALESCE(p_user_id, auth.uid())
  GROUP BY c.id
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для поиска публичных коллекций
CREATE OR REPLACE FUNCTION search_public_collections(
  p_query TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  cover_image TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  building_count BIGINT,
  average_rating NUMERIC,
  cities_count BIGINT,
  likes_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.cover_image,
    c.created_at,
    c.updated_at,
    c.user_id,
    COUNT(cb.building_id) as building_count,
    ROUND(AVG(b.rating), 1) as average_rating,
    COUNT(DISTINCT b.city) as cities_count,
    COUNT(cl.user_id) as likes_count
  FROM collections c
  LEFT JOIN collection_buildings cb ON c.id = cb.collection_id
  LEFT JOIN buildings b ON cb.building_id = b.id
  LEFT JOIN collection_likes cl ON c.id = cl.collection_id
  WHERE c.is_public = true
    AND (p_query IS NULL OR 
         c.name ILIKE '%' || p_query || '%' OR 
         c.description ILIKE '%' || p_query || '%')
  GROUP BY c.id
  ORDER BY likes_count DESC, c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ ДЛЯ ПОИСКА
-- =========================================

-- Индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_collections_search ON collections 
USING gin(to_tsvector('russian', name || ' ' || COALESCE(description, '')));

-- =========================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =========================================

COMMENT ON TABLE collections IS 'Персональные коллекции архитектурных зданий пользователей';
COMMENT ON TABLE collection_buildings IS 'Связь между коллекциями и зданиями с дополнительными данными';
COMMENT ON TABLE user_building_photos IS 'Личные фотографии пользователей к зданиям';
COMMENT ON TABLE collection_likes IS 'Лайки пользователей к публичным коллекциям';

-- Уведомление о завершении миграции
DO $$
BEGIN
  RAISE NOTICE 'Collections tables and functions created successfully!';
  RAISE NOTICE 'You can now use the collections functionality in your application.';
END $$;