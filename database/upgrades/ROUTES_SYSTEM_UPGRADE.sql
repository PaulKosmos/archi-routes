-- ROUTES_SYSTEM_UPGRADE.sql
-- Умная система маршрутов и фильтрации для архитектурной платформы
-- Выполнить в Supabase SQL Editor

-- 🎯 ЭТАП 1: Обновление таблицы routes для умной фильтрации
-- =====================================================================

-- Добавляем новые поля к существующей таблице routes (если их нет)
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS route_visibility TEXT DEFAULT 'private' CHECK (route_visibility IN ('private', 'public', 'featured')),
ADD COLUMN IF NOT EXISTS publication_status TEXT DEFAULT 'draft' CHECK (publication_status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
ADD COLUMN IF NOT EXISTS route_source TEXT DEFAULT 'user' CHECK (route_source IN ('user', 'blog', 'ai_generated', 'corporate', 'institutional')),
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_generated_params JSONB,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_routes_visibility_status ON routes(route_visibility, publication_status);
CREATE INDEX IF NOT EXISTS idx_routes_priority_score ON routes(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city);
CREATE INDEX IF NOT EXISTS idx_routes_featured_until ON routes(featured_until) WHERE featured_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_rating ON routes(average_rating DESC) WHERE average_rating > 0;

-- 🎯 ЭТАП 2: Таблица избранных маршрутов пользователей
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_route_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  notes TEXT,
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, route_id)
);

-- Индексы для user_route_favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_route_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_route_id ON user_route_favorites(route_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_completed ON user_route_favorites(completed_at) WHERE completed_at IS NOT NULL;

-- RLS для user_route_favorites
ALTER TABLE user_route_favorites ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can manage their own favorites" ON user_route_favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read for completed routes stats" ON user_route_favorites
  FOR SELECT USING (completed_at IS NOT NULL);

-- 🎯 ЭТАП 3: Система заявок на публикацию маршрутов
-- =====================================================================

CREATE TABLE IF NOT EXISTS route_publication_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('publish', 'feature', 'corporate')),
  justification TEXT NOT NULL,
  business_info JSONB, -- Для корпоративных заявок
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для route_publication_requests
CREATE INDEX IF NOT EXISTS idx_publication_requests_route ON route_publication_requests(route_id);
CREATE INDEX IF NOT EXISTS idx_publication_requests_status ON route_publication_requests(status);
CREATE INDEX IF NOT EXISTS idx_publication_requests_user ON route_publication_requests(requested_by);

-- RLS для route_publication_requests
ALTER TABLE route_publication_requests ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can manage their own requests" ON route_publication_requests
  FOR ALL USING (auth.uid() = requested_by);

CREATE POLICY "Moderators can manage all requests" ON route_publication_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('moderator', 'admin')
    )
  );

-- 🎯 ЭТАП 4: Функция умной фильтрации маршрутов
-- =====================================================================

CREATE OR REPLACE FUNCTION get_filtered_routes_for_map(
  p_city TEXT DEFAULT 'Berlin',
  p_limit INTEGER DEFAULT 30
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  city TEXT,
  country TEXT,
  created_by UUID,
  route_type TEXT,
  difficulty_level TEXT,
  estimated_duration_minutes INTEGER,
  distance_km DECIMAL,
  points_count INTEGER,
  transport_mode TEXT,
  tags TEXT[],
  route_geometry JSONB,
  route_instructions JSONB,
  route_summary JSONB,
  route_visibility TEXT,
  publication_status TEXT,
  route_source TEXT,
  priority_score INTEGER,
  average_rating DECIMAL,
  review_count INTEGER,
  completion_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH prioritized_routes AS (
    -- Featured маршруты (высший приоритет)
    SELECT 
      r.*,
      1 as category_priority,
      GREATEST(
        r.priority_score + 50, -- Featured бонус
        COALESCE(r.average_rating * 10, 0) + 
        COALESCE(r.completion_count, 0) + 
        GREATEST(100 - EXTRACT(days FROM NOW() - r.created_at)::INTEGER, 0) -- Новизна
      ) as computed_priority
    FROM routes r
    WHERE r.route_visibility = 'featured'
      AND r.publication_status = 'published'
      AND (r.featured_until IS NULL OR r.featured_until > NOW())
      AND (p_city = '' OR r.city ILIKE '%' || p_city || '%')
    
    UNION ALL
    
    -- Корпоративные маршруты 
    SELECT 
      r.*,
      2 as category_priority,
      GREATEST(
        r.priority_score + 30, -- Corporate бонус
        COALESCE(r.average_rating * 8, 0) +
        COALESCE(r.completion_count, 0)
      ) as computed_priority
    FROM routes r
    WHERE r.route_source = 'corporate'
      AND r.publication_status = 'published'
      AND r.route_visibility IN ('public', 'featured')
      AND (p_city = '' OR r.city ILIKE '%' || p_city || '%')
    
    UNION ALL
    
    -- Популярные публичные маршруты
    SELECT 
      r.*,
      3 as category_priority,
      GREATEST(
        r.priority_score + 20, -- Popular бонус
        COALESCE(r.average_rating * 12, 0) + -- Рейтинг важнее для популярных
        COALESCE(r.completion_count * 2, 0) + -- Завершения = популярность
        COALESCE(r.views_count / 10, 0)
      ) as computed_priority
    FROM routes r
    WHERE r.route_visibility = 'public'
      AND r.publication_status = 'published'
      AND r.route_source = 'user'
      AND (r.average_rating >= 4.0 OR r.completion_count >= 5)
      AND (p_city = '' OR r.city ILIKE '%' || p_city || '%')
    
    UNION ALL
    
    -- Недавние от проверенных авторов
    SELECT 
      r.*,
      4 as category_priority,
      GREATEST(
        r.priority_score + 15,
        COALESCE(r.average_rating * 6, 0) +
        GREATEST(30 - EXTRACT(days FROM NOW() - r.created_at)::INTEGER, 0) -- Бонус за новизну
      ) as computed_priority
    FROM routes r
    JOIN profiles p ON p.id = r.created_by
    WHERE r.route_visibility = 'public'
      AND r.publication_status = 'published'
      AND r.route_source = 'user'
      AND p.role IN ('guide', 'expert', 'moderator')
      AND r.created_at > NOW() - INTERVAL '60 days'
      AND (p_city = '' OR r.city ILIKE '%' || p_city || '%')
    
    UNION ALL
    
    -- AI-generated тематические маршруты
    SELECT 
      r.*,
      5 as category_priority,
      GREATEST(
        r.priority_score + 10,
        COALESCE(r.average_rating * 5, 0) +
        CASE 
          WHEN r.auto_generated_params->>'quality_score' IS NOT NULL 
          THEN (r.auto_generated_params->>'quality_score')::DECIMAL * 10
          ELSE 0
        END
      ) as computed_priority
    FROM routes r
    WHERE r.route_source = 'ai_generated'
      AND r.publication_status = 'published'
      AND r.route_visibility IN ('public', 'featured')
      AND (p_city = '' OR r.city ILIKE '%' || p_city || '%')
  )
  SELECT 
    pr.id,
    pr.title,
    pr.description,
    pr.city,
    pr.country,
    pr.created_by,
    pr.route_type,
    pr.difficulty_level,
    pr.estimated_duration_minutes,
    pr.distance_km,
    pr.points_count,
    pr.transport_mode,
    pr.tags,
    pr.route_geometry,
    pr.route_instructions,
    pr.route_summary,
    pr.route_visibility,
    pr.publication_status,
    pr.route_source,
    pr.priority_score,
    pr.average_rating,
    pr.review_count,
    pr.completion_count,
    pr.created_at,
    pr.updated_at
  FROM prioritized_routes pr
  ORDER BY 
    pr.category_priority ASC,  -- Сначала по категории (featured, corporate, etc.)
    pr.computed_priority DESC, -- Потом по вычисленному приоритету
    pr.created_at DESC         -- При равенстве - по дате
  LIMIT p_limit;
END;
$$;

-- 🎯 ЭТАП 5: Триггеры для автоматических обновлений
-- =====================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для updated_at
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_favorites_updated_at ON user_route_favorites;
CREATE TRIGGER update_user_favorites_updated_at
    BEFORE UPDATE ON user_route_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления статистики маршрутов
CREATE OR REPLACE FUNCTION update_route_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем количество завершений
  IF TG_OP = 'INSERT' AND NEW.completed_at IS NOT NULL THEN
    UPDATE routes 
    SET completion_count = completion_count + 1,
        last_activity_at = NOW()
    WHERE id = NEW.route_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления статистики
DROP TRIGGER IF EXISTS update_route_completion_stats ON user_route_favorites;
CREATE TRIGGER update_route_completion_stats
    AFTER INSERT OR UPDATE ON user_route_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_route_stats();

-- 🎯 ЭТАП 6: Функции для работы с избранными маршрутами
-- =====================================================================

-- Функция добавления в избранное
CREATE OR REPLACE FUNCTION add_route_to_favorites(
  p_user_id UUID,
  p_route_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_route_favorites (user_id, route_id, notes)
  VALUES (p_user_id, p_route_id, p_notes)
  ON CONFLICT (user_id, route_id) DO UPDATE SET
    notes = EXCLUDED.notes,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Функция отметки как пройденного
CREATE OR REPLACE FUNCTION mark_route_completed(
  p_user_id UUID,
  p_route_id UUID,
  p_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_route_favorites (user_id, route_id, completed_at, personal_rating, completion_notes)
  VALUES (p_user_id, p_route_id, NOW(), p_rating, p_notes)
  ON CONFLICT (user_id, route_id) DO UPDATE SET
    completed_at = NOW(),
    personal_rating = EXCLUDED.personal_rating,
    completion_notes = EXCLUDED.completion_notes,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 🎯 ЭТАП 7: Обновление существующих маршрутов  
-- =====================================================================

-- Устанавливаем базовые значения для существующих маршрутов
UPDATE routes 
SET 
  route_visibility = CASE 
    WHEN is_published = true THEN 'public'::TEXT
    ELSE 'private'::TEXT
  END,
  publication_status = CASE 
    WHEN is_published = true THEN 'published'::TEXT
    ELSE 'draft'::TEXT
  END,
  route_source = 'user'::TEXT,
  priority_score = CASE 
    WHEN is_published = true THEN 15
    ELSE 5
  END,
  last_activity_at = COALESCE(updated_at, created_at)
WHERE route_visibility IS NULL;

-- 🎯 ЭТАП 8: Политики RLS для обновленной таблицы routes
-- =====================================================================

-- Обновляем политики RLS для routes
DROP POLICY IF EXISTS "Public routes are viewable by everyone" ON routes;
CREATE POLICY "Public routes are viewable by everyone" ON routes
  FOR SELECT USING (
    publication_status = 'published' 
    AND route_visibility IN ('public', 'featured')
  );

DROP POLICY IF EXISTS "Users can view their own routes" ON routes;
CREATE POLICY "Users can view their own routes" ON routes
  FOR SELECT USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own routes" ON routes;
CREATE POLICY "Users can update their own routes" ON routes
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own routes" ON routes;
CREATE POLICY "Users can delete their own routes" ON routes
  FOR DELETE USING (auth.uid() = created_by);

-- Политика для модераторов
CREATE POLICY "Moderators can manage all routes" ON routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('moderator', 'admin')
    )
  );

-- ✅ УСПЕШНОЕ ЗАВЕРШЕНИЕ ОБНОВЛЕНИЯ
-- =====================================================================

-- Создание тестового featured маршрута (опционально)
-- INSERT INTO routes (
--   title, description, city, country, created_by,
--   route_visibility, publication_status, route_source, priority_score
-- ) VALUES (
--   'Тестовый Featured маршрут', 
--   'Описание тестового маршрута',
--   'Berlin', 'Germany', 
--   (SELECT id FROM auth.users LIMIT 1),
--   'featured', 'published', 'user', 60
-- );

-- Логирование успешного завершения
DO $$
BEGIN
  RAISE NOTICE '✅ Умная система маршрутов успешно установлена!';
  RAISE NOTICE '🎯 Добавлены новые поля в таблицу routes';  
  RAISE NOTICE '📝 Созданы таблицы: user_route_favorites, route_publication_requests';
  RAISE NOTICE '🔍 Создана функция умной фильтрации: get_filtered_routes_for_map()';
  RAISE NOTICE '🛡️ Настроены политики RLS для безопасности';
  RAISE NOTICE '⚡ Добавлены триггеры для автоматических обновлений';
  RAISE NOTICE '';
  RAISE NOTICE '▶️ Следующий шаг: Протестировать в приложении!';
END
$$;