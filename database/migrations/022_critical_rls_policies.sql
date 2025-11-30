-- 022_critical_rls_policies.sql
-- Миграция для добавления критических RLS политик безопасности
-- Согласно LAUNCH_READINESS_REPORT.md раздел 1.1

-- =====================================================
-- ЧАСТЬ 1: Включение RLS для таблиц без защиты
-- =====================================================

-- 1.1 collection_items (критично!)
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- ЧАСТЬ 2: RLS политики для collection_items
-- =====================================================

-- Пользователи могут просматривать элементы в своих или публичных коллекциях
CREATE POLICY "Users can view items in their own or public collections"
ON collection_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_collections
    WHERE user_collections.id = collection_items.collection_id
    AND (user_collections.user_id = (SELECT auth.uid()) OR user_collections.is_public = true)
  )
);

-- Пользователи могут управлять элементами только в своих коллекциях
CREATE POLICY "Users can manage items in their own collections"
ON collection_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_collections
    WHERE user_collections.id = collection_items.collection_id
    AND user_collections.user_id = (SELECT auth.uid())
  )
);


-- =====================================================
-- ЧАСТЬ 3: RLS политики для blog_post_reactions
-- =====================================================

-- Все могут просматривать реакции
CREATE POLICY "Anyone can view blog post reactions"
ON blog_post_reactions FOR SELECT
USING (true);

-- Пользователи могут создавать реакции от своего имени
CREATE POLICY "Users can create their own reactions"
ON blog_post_reactions FOR INSERT
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- Пользователи могут удалять только свои реакции
CREATE POLICY "Users can delete their own reactions"
ON blog_post_reactions FOR DELETE
USING (
  user_id = (SELECT auth.uid())
);


-- =====================================================
-- ЧАСТЬ 4: RLS политики для blog_post_routes
-- =====================================================

-- Все могут просматривать связи блог-постов с маршрутами
CREATE POLICY "Anyone can view blog post routes"
ON blog_post_routes FOR SELECT
USING (true);

-- Админы и редакторы могут управлять связями
CREATE POLICY "Editors can manage blog post routes"
ON blog_post_routes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator', 'content_creator')
  )
);


-- =====================================================
-- ЧАСТЬ 5: RLS политики для blog_post_tags
-- =====================================================

-- Все могут просматривать теги блог-постов
CREATE POLICY "Anyone can view blog post tags"
ON blog_post_tags FOR SELECT
USING (true);

-- Админы и редакторы могут управлять тегами
CREATE POLICY "Editors can manage blog post tags"
ON blog_post_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator', 'content_creator')
  )
);


-- =====================================================
-- ЧАСТЬ 6: RLS политики для blog_reading_stats
-- =====================================================

-- Пользователи могут просматривать только свою статистику чтения
CREATE POLICY "Users can view their own reading stats"
ON blog_reading_stats FOR SELECT
USING (
  user_id = (SELECT auth.uid())
);

-- Админы могут видеть всю статистику
CREATE POLICY "Admins can view all reading stats"
ON blog_reading_stats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator')
  )
);

-- Пользователи могут создавать записи статистики от своего имени
CREATE POLICY "Users can create their own reading stats"
ON blog_reading_stats FOR INSERT
WITH CHECK (
  user_id = (SELECT auth.uid())
);

-- Пользователи могут обновлять свою статистику
CREATE POLICY "Users can update their own reading stats"
ON blog_reading_stats FOR UPDATE
USING (
  user_id = (SELECT auth.uid())
);


-- =====================================================
-- ЧАСТЬ 7: RLS политики для news_post_buildings
-- =====================================================

-- Все могут просматривать связи новостей со зданиями
CREATE POLICY "Anyone can view news post buildings"
ON news_post_buildings FOR SELECT
USING (true);

-- Админы и редакторы могут управлять связями
CREATE POLICY "Editors can manage news post buildings"
ON news_post_buildings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator', 'content_creator')
  )
);


-- =====================================================
-- ЧАСТЬ 8: RLS политики для user_follows
-- =====================================================

-- Все могут просматривать публичные подписки
CREATE POLICY "Anyone can view public follows"
ON user_follows FOR SELECT
USING (true);

-- Пользователи могут создавать подписки от своего имени
CREATE POLICY "Users can create their own follows"
ON user_follows FOR INSERT
WITH CHECK (
  follower_id = (SELECT auth.uid())
);

-- Пользователи могут удалять только свои подписки
CREATE POLICY "Users can delete their own follows"
ON user_follows FOR DELETE
USING (
  follower_id = (SELECT auth.uid())
);


-- =====================================================
-- ЧАСТЬ 9: Проверка и отчет
-- =====================================================

-- Функция для проверки статуса RLS
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT,
    c.relrowsecurity,
    COUNT(p.polname)
  FROM pg_class c
  LEFT JOIN pg_policy p ON c.oid = p.polrelid
  WHERE c.relname IN (
    'collection_items',
    'blog_post_reactions',
    'blog_post_routes',
    'blog_post_tags',
    'blog_reading_stats',
    'news_post_buildings',
    'user_follows'
  )
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вывод результата проверки
SELECT * FROM check_rls_status();
