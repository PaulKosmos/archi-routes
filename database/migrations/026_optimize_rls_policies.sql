-- 026_optimize_rls_policies.sql
-- Миграция для оптимизации RLS политик
-- Согласно LAUNCH_READINESS_REPORT.md раздел 2.2
-- Критичность: СРЕДНЯЯ
-- Влияние: ускорение запросов с RLS в 2-5 раз

-- ВАЖНО: Заменяем auth.uid() на (SELECT auth.uid()) для предотвращения
-- повторной оценки функции для каждой строки

-- =====================================================
-- ЧАСТЬ 1: Оптимизация политик для profiles
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Создаем оптимизированные политики
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
USING (true);

COMMENT ON POLICY "Users can view own profile" ON profiles IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 2: Оптимизация политик для buildings
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view published buildings" ON buildings;
DROP POLICY IF EXISTS "Users can create buildings" ON buildings;
DROP POLICY IF EXISTS "Users can update own buildings" ON buildings;
DROP POLICY IF EXISTS "Moderators can update any building" ON buildings;

-- Создаем оптимизированные политики
CREATE POLICY "Users can view published buildings"
ON buildings FOR SELECT
USING (
  verified = true AND moderation_status = 'approved'
);

CREATE POLICY "Users can create buildings"
ON buildings FOR INSERT
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update own buildings"
ON buildings FOR UPDATE
USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Moderators can update any building"
ON buildings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator')
  )
);

COMMENT ON POLICY "Users can create buildings" ON buildings IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 3: Оптимизация политик для building_reviews
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can view verified reviews" ON building_reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON building_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON building_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON building_reviews;

-- Создаем оптимизированные политики
CREATE POLICY "Anyone can view verified reviews"
ON building_reviews FOR SELECT
USING (is_verified = true);

CREATE POLICY "Users can create own reviews"
ON building_reviews FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own reviews"
ON building_reviews FOR UPDATE
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own reviews"
ON building_reviews FOR DELETE
USING (user_id = (SELECT auth.uid()));

COMMENT ON POLICY "Users can create own reviews" ON building_reviews IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 4: Оптимизация политик для routes
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can view published routes" ON routes;
DROP POLICY IF EXISTS "Users can view own routes" ON routes;
DROP POLICY IF EXISTS "Users can create routes" ON routes;
DROP POLICY IF EXISTS "Users can update own routes" ON routes;
DROP POLICY IF EXISTS "Moderators can update any route" ON routes;

-- Создаем оптимизированные политики
CREATE POLICY "Anyone can view published routes"
ON routes FOR SELECT
USING (
  is_published = true AND publication_status = 'published'
);

CREATE POLICY "Users can view own routes"
ON routes FOR SELECT
USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can create routes"
ON routes FOR INSERT
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Users can update own routes"
ON routes FOR UPDATE
USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Moderators can update any route"
ON routes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator')
  )
);

COMMENT ON POLICY "Users can view own routes" ON routes IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 5: Оптимизация политик для notifications
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Создаем оптимизированные политики
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (user_id = (SELECT auth.uid()));

COMMENT ON POLICY "Users can view own notifications" ON notifications IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 6: Оптимизация политик для user_collections
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own collections" ON user_collections;
DROP POLICY IF EXISTS "Users can view public collections" ON user_collections;
DROP POLICY IF EXISTS "Users can create own collections" ON user_collections;
DROP POLICY IF EXISTS "Users can update own collections" ON user_collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON user_collections;

-- Создаем оптимизированные политики
CREATE POLICY "Users can view own collections"
ON user_collections FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view public collections"
ON user_collections FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create own collections"
ON user_collections FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own collections"
ON user_collections FOR UPDATE
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own collections"
ON user_collections FOR DELETE
USING (user_id = (SELECT auth.uid()));

COMMENT ON POLICY "Users can view own collections" ON user_collections IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 7: Оптимизация политик для blog_posts
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can view own drafts" ON blog_posts;
DROP POLICY IF EXISTS "Content creators can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON blog_posts;

-- Создаем оптимизированные политики
CREATE POLICY "Anyone can view published blog posts"
ON blog_posts FOR SELECT
USING (status = 'published');

CREATE POLICY "Authors can view own drafts"
ON blog_posts FOR SELECT
USING (author_id = (SELECT auth.uid()));

CREATE POLICY "Content creators can create blog posts"
ON blog_posts FOR INSERT
WITH CHECK (
  author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role IN ('admin', 'moderator', 'content_creator')
  )
);

CREATE POLICY "Authors can update own posts"
ON blog_posts FOR UPDATE
USING (author_id = (SELECT auth.uid()));

COMMENT ON POLICY "Authors can view own drafts" ON blog_posts IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 8: Оптимизация политик для route_completions
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own completions" ON route_completions;
DROP POLICY IF EXISTS "Users can create own completions" ON route_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON route_completions;

-- Создаем оптимизированные политики
CREATE POLICY "Users can view own completions"
ON route_completions FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own completions"
ON route_completions FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own completions"
ON route_completions FOR UPDATE
USING (user_id = (SELECT auth.uid()));

COMMENT ON POLICY "Users can view own completions" ON route_completions IS 'Оптимизировано: используется (SELECT auth.uid())';


-- =====================================================
-- ЧАСТЬ 9: Проверка и отчет
-- =====================================================

-- Функция для проверки оптимизации RLS политик
CREATE OR REPLACE FUNCTION check_rls_optimization()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  using_optimized BOOLEAN,
  check_optimized BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pol.tablename::TEXT,
    pol.policyname::TEXT,
    pg_get_expr(pol.qual, c.oid) LIKE '%(SELECT auth.uid())%' as using_optimized,
    pg_get_expr(pol.with_check, c.oid) LIKE '%(SELECT auth.uid())%' OR pol.with_check IS NULL as check_optimized
  FROM pg_policies pol
  JOIN pg_class c ON c.relname = pol.tablename
  WHERE pol.schemaname = 'public'
    AND (
      pg_get_expr(pol.qual, c.oid) LIKE '%auth.uid()%'
      OR pg_get_expr(pol.with_check, c.oid) LIKE '%auth.uid()%'
    )
  ORDER BY pol.tablename, pol.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вывод результата проверки
SELECT * FROM check_rls_optimization();

-- Статистика оптимизации
SELECT
  COUNT(*) FILTER (WHERE using_optimized) as optimized_policies,
  COUNT(*) FILTER (WHERE NOT using_optimized) as non_optimized_policies,
  COUNT(*) as total_policies
FROM check_rls_optimization();
