-- 032_enhance_favorites_and_collections.sql
-- Миграция для упрощения системы избранного и улучшения коллекций
-- Дата: 22 декабря 2025

-- =====================================================
-- ОПИСАНИЕ
-- =====================================================
-- Эта миграция:
-- 1. Создает таблицу building_favorites (лайки для объектов)
-- 2. Улучшает user_collections (добавляет шаринг)
-- 3. Удаляет reaction_type='save' из blog_reactions и news_reactions
-- 4. Создает RLS политики для публичных коллекций
--
-- Философия: "Лайкнул → Сохранил → Нашёл"
-- - Like = универсальное действие
-- - Избранное = всё лайкнутое
-- - Коллекции = тематические подборки (можно шарить)

-- =====================================================
-- ЧАСТЬ 1: Создать таблицу building_favorites
-- =====================================================

-- Таблица для лайков объектов (аналогично user_route_favorites)
CREATE TABLE IF NOT EXISTS building_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, building_id)
);

COMMENT ON TABLE building_favorites IS
'Избранные объекты пользователей (лайки)';

COMMENT ON COLUMN building_favorites.user_id IS
'ID пользователя, который лайкнул объект';

COMMENT ON COLUMN building_favorites.building_id IS
'ID объекта, который был лайкнут';

COMMENT ON COLUMN building_favorites.created_at IS
'Дата и время когда объект был добавлен в избранное';

-- RLS политики для building_favorites
ALTER TABLE building_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own building favorites"
ON building_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add buildings to favorites"
ON building_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove buildings from favorites"
ON building_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Индексы для производительности
CREATE INDEX idx_building_favorites_user_id ON building_favorites(user_id);
CREATE INDEX idx_building_favorites_building_id ON building_favorites(building_id);
CREATE INDEX idx_building_favorites_created_at ON building_favorites(created_at DESC);

-- =====================================================
-- ЧАСТЬ 2: Улучшить user_collections (добавить шаринг)
-- =====================================================

-- Добавить новые колонки для шаринга коллекций
ALTER TABLE user_collections
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

ALTER TABLE user_collections
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();

ALTER TABLE user_collections
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN user_collections.is_public IS
'Публичная коллекция (можно делиться по ссылке)';

COMMENT ON COLUMN user_collections.share_token IS
'Уникальный токен для публичного доступа к коллекции';

COMMENT ON COLUMN user_collections.description IS
'Описание коллекции (опционально)';

-- Создать индекс для share_token (для быстрого поиска публичных коллекций)
CREATE INDEX IF NOT EXISTS idx_user_collections_share_token
ON user_collections(share_token) WHERE is_public = true;

-- Обновить RLS политики для публичных коллекций

-- Удалить старую политику если существует
DROP POLICY IF EXISTS "Users can view their own collections" ON user_collections;
DROP POLICY IF EXISTS "Anyone can view public collections" ON user_collections;

-- Новые политики с поддержкой публичного доступа
CREATE POLICY "Users can view their own collections"
ON user_collections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public collections by share token"
ON user_collections FOR SELECT
TO public
USING (is_public = true AND share_token IS NOT NULL);

-- Политики для collection_items (чтобы можно было видеть элементы публичных коллекций)
DROP POLICY IF EXISTS "Users can view their own collection items" ON collection_items;
DROP POLICY IF EXISTS "Anyone can view public collection items" ON collection_items;

CREATE POLICY "Users can view their own collection items"
ON collection_items FOR SELECT
TO authenticated
USING (
  collection_id IN (
    SELECT id FROM user_collections WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view items of public collections"
ON collection_items FOR SELECT
TO public
USING (
  collection_id IN (
    SELECT id FROM user_collections
    WHERE is_public = true AND share_token IS NOT NULL
  )
);

-- =====================================================
-- ЧАСТЬ 3: Удалить reaction_type='save' из реакций
-- =====================================================

-- Удалить все "save" реакции из blog_reactions
DELETE FROM blog_reactions WHERE reaction_type = 'save';

-- Удалить все "save" реакции из news_reactions
DELETE FROM news_reactions WHERE reaction_type = 'save';

-- Добавить constraint чтобы можно было использовать только 'like'
-- (на случай если constraint уже существует, сначала удаляем)
ALTER TABLE blog_reactions DROP CONSTRAINT IF EXISTS blog_reactions_type_check;
ALTER TABLE blog_reactions ADD CONSTRAINT blog_reactions_type_check
  CHECK (reaction_type = 'like');

ALTER TABLE news_reactions DROP CONSTRAINT IF EXISTS news_reactions_type_check;
ALTER TABLE news_reactions ADD CONSTRAINT news_reactions_type_check
  CHECK (reaction_type = 'like');

COMMENT ON CONSTRAINT blog_reactions_type_check ON blog_reactions IS
'Разрешен только reaction_type = like';

COMMENT ON CONSTRAINT news_reactions_type_check ON news_reactions IS
'Разрешен только reaction_type = like';

-- =====================================================
-- ЧАСТЬ 4: Вспомогательные функции
-- =====================================================

-- Функция для получения общего количества избранного пользователя
CREATE OR REPLACE FUNCTION get_user_favorites_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT
    COALESCE(
      (SELECT COUNT(*) FROM blog_reactions WHERE user_id = p_user_id AND reaction_type = 'like'),
      0
    ) +
    COALESCE(
      (SELECT COUNT(*) FROM news_reactions WHERE user_id = p_user_id AND reaction_type = 'like'),
      0
    ) +
    COALESCE(
      (SELECT COUNT(*) FROM user_route_favorites WHERE user_id = p_user_id),
      0
    ) +
    COALESCE(
      (SELECT COUNT(*) FROM building_favorites WHERE user_id = p_user_id),
      0
    )
  INTO total_count;

  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION get_user_favorites_count IS
'Возвращает общее количество избранного пользователя (сумма всех лайков)';

-- Функция для получения статистики коллекции
CREATE OR REPLACE FUNCTION get_collection_stats(p_collection_id UUID)
RETURNS TABLE (
  total_items INTEGER,
  blogs_count INTEGER,
  news_count INTEGER,
  routes_count INTEGER,
  buildings_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_items,
    COUNT(CASE WHEN item_type = 'blog' THEN 1 END)::INTEGER as blogs_count,
    COUNT(CASE WHEN item_type = 'news' THEN 1 END)::INTEGER as news_count,
    COUNT(CASE WHEN item_type = 'route' THEN 1 END)::INTEGER as routes_count,
    COUNT(CASE WHEN item_type = 'building' THEN 1 END)::INTEGER as buildings_count
  FROM collection_items
  WHERE collection_id = p_collection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION get_collection_stats IS
'Возвращает статистику коллекции: количество элементов по типам';

-- =====================================================
-- ЧАСТЬ 5: Проверка результата
-- =====================================================

-- Показать созданные таблицы и их RLS статус
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('building_favorites', 'user_collections', 'collection_items')
ORDER BY tablename;

-- Показать созданные политики
SELECT
  tablename,
  policyname,
  ARRAY(SELECT unnest(roles::text[])) as roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('building_favorites', 'user_collections', 'collection_items')
ORDER BY tablename, policyname;

-- Показать новые колонки в user_collections
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_collections'
  AND column_name IN ('is_public', 'share_token', 'description')
ORDER BY ordinal_position;

-- =====================================================
-- ПРИМЕЧАНИЯ
-- =====================================================
--
-- После применения миграции:
-- 1. building_favorites - новая таблица для лайков объектов
-- 2. user_collections - улучшена для шаринга (is_public, share_token, description)
-- 3. blog_reactions и news_reactions - только reaction_type='like'
-- 4. Публичные коллекции доступны по share_token без авторизации
-- 5. Две новые функции: get_user_favorites_count, get_collection_stats
--
-- Workflow пользователя:
-- 1. Лайкает контент (блог, новость, маршрут, объект)
-- 2. Лайкнутое попадает в избранное (/profile/favorites)
-- 3. Из избранного добавляет в коллекцию
-- 4. Коллекцией можно поделиться (публичная ссылка с share_token)
--
-- Откат миграции (если потребуется):
-- DROP TABLE IF EXISTS building_favorites CASCADE;
-- ALTER TABLE user_collections DROP COLUMN IF EXISTS is_public;
-- ALTER TABLE user_collections DROP COLUMN IF EXISTS share_token;
-- ALTER TABLE user_collections DROP COLUMN IF EXISTS description;
-- DROP FUNCTION IF EXISTS get_user_favorites_count;
-- DROP FUNCTION IF EXISTS get_collection_stats;
