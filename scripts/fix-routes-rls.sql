-- =========================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ ТАБЛИЦЫ ROUTES
-- =========================================
-- 
-- Этот скрипт исправляет проблемы с Row Level Security (RLS) 
-- для таблицы routes, чтобы работала автогенерация маршрутов
--

-- Включаем RLS для таблицы routes (если еще не включен)
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть)
DROP POLICY IF EXISTS "Users can view routes" ON routes;
DROP POLICY IF EXISTS "Users can create own routes" ON routes;
DROP POLICY IF EXISTS "Users can update own routes" ON routes;
DROP POLICY IF EXISTS "Users can delete own routes" ON routes;
DROP POLICY IF EXISTS "Users can view published and own routes" ON routes;
DROP POLICY IF EXISTS "Users can create routes" ON routes;
DROP POLICY IF EXISTS "Users can update routes" ON routes;
DROP POLICY IF EXISTS "Users can delete routes" ON routes;

-- =========================================
-- СОЗДАНИЕ НОВЫХ ПОЛИТИК БЕЗОПАСНОСТИ
-- =========================================

-- 1. Просмотр маршрутов
-- Пользователи могут видеть:
-- - Свои собственные маршруты (любые)
-- - Публичные маршруты других пользователей
-- - Опубликованные маршруты
CREATE POLICY "Users can view published and own routes" ON routes
  FOR SELECT
  USING (
    -- Свои маршруты (любые)
    created_by = auth.uid()
    OR
    -- Публичные и опубликованные маршруты других
    (route_visibility = 'public' AND publication_status = 'published')
    OR
    (route_visibility = 'featured' AND publication_status = 'published')
    OR
    (is_published = true)
  );

-- 2. Создание маршрутов
-- Авторизованные пользователи могут создавать маршруты
-- Автоматически устанавливается created_by = auth.uid()
CREATE POLICY "Users can create routes" ON routes
  FOR INSERT
  WITH CHECK (
    -- Пользователь должен быть авторизован
    auth.uid() IS NOT NULL
    AND
    -- created_by должен соответствовать текущему пользователю
    created_by = auth.uid()
  );

-- 3. Обновление маршрутов
-- Пользователи могут обновлять только свои маршруты
CREATE POLICY "Users can update own routes" ON routes
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 4. Удаление маршрутов
-- Пользователи могут удалять только свои маршруты
CREATE POLICY "Users can delete own routes" ON routes
  FOR DELETE
  USING (created_by = auth.uid());

-- =========================================
-- ПРОВЕРКА RLS ДЛЯ СВЯЗАННЫХ ТАБЛИЦ
-- =========================================

-- Включаем RLS для route_points (если еще не включен)
ALTER TABLE route_points ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики для route_points
DROP POLICY IF EXISTS "Users can view route points" ON route_points;
DROP POLICY IF EXISTS "Users can create route points" ON route_points;
DROP POLICY IF EXISTS "Users can update route points" ON route_points;
DROP POLICY IF EXISTS "Users can delete route points" ON route_points;

-- Политики для route_points
-- Пользователи могут управлять точками маршрутов, которыми они владеют
CREATE POLICY "Users can view route points for accessible routes" ON route_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routes r 
      WHERE r.id = route_points.route_id 
      AND (
        r.created_by = auth.uid()
        OR (r.route_visibility = 'public' AND r.publication_status = 'published')
        OR (r.route_visibility = 'featured' AND r.publication_status = 'published')
        OR r.is_published = true
      )
    )
  );

CREATE POLICY "Users can create route points for own routes" ON route_points
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes r 
      WHERE r.id = route_points.route_id 
      AND r.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update route points for own routes" ON route_points
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM routes r 
      WHERE r.id = route_points.route_id 
      AND r.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete route points for own routes" ON route_points
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM routes r 
      WHERE r.id = route_points.route_id 
      AND r.created_by = auth.uid()
    )
  );

-- =========================================
-- ПРОВЕРКА ТАБЛИЦ АВТОГЕНЕРАЦИИ
-- =========================================

-- Убеждаемся, что таблицы автогенерации существуют
-- (Если они не существуют, создаем их)

-- Таблица шаблонов маршрутов
CREATE TABLE IF NOT EXISTS route_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  generation_params JSONB NOT NULL DEFAULT '{}',
  title_template TEXT,
  description_template TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица логов генерации
CREATE TABLE IF NOT EXISTS route_generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES route_templates(id),
  route_id UUID REFERENCES routes(id),
  generation_params JSONB NOT NULL DEFAULT '{}',
  ai_usage JSONB DEFAULT '{}',
  generation_metadata JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL,
  error_message TEXT,
  buildings_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица AI провайдеров
CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  api_endpoint TEXT,
  default_model TEXT,
  api_key_env_var TEXT,
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица расписаний генерации
CREATE TABLE IF NOT EXISTS route_generation_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES route_templates(id),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS для таблиц автогенерации (открытый доступ для админов)
ALTER TABLE route_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_generation_schedules ENABLE ROW LEVEL SECURITY;

-- Простые политики для автогенерации (читать могут все, писать только авторизованные)
CREATE POLICY "Anyone can view route templates" ON route_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage route templates" ON route_templates FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view generation logs" ON route_generation_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create generation logs" ON route_generation_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view active AI providers" ON ai_providers FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage AI providers" ON ai_providers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view generation schedules" ON route_generation_schedules FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage generation schedules" ON route_generation_schedules FOR ALL USING (auth.uid() IS NOT NULL);

-- =========================================
-- ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ
-- =========================================

-- Добавляем OpenAI провайдера, если его нет
INSERT INTO ai_providers (name, api_endpoint, default_model, api_key_env_var, is_active)
VALUES ('openai', 'https://api.openai.com/v1', 'gpt-4', 'OPENAI_API_KEY', true)
ON CONFLICT (name) DO NOTHING;

-- Добавляем базовые шаблоны, если их нет
INSERT INTO route_templates (name, category, criteria, generation_params, title_template, description_template, is_active, priority)
VALUES 
(
  'Универсальный архитектурный маршрут',
  'general',
  '{"min_rating": 4.0}',
  '{"max_points": 8, "max_distance_km": 3}',
  'Архитектурные жемчужины {city}',
  'Откройте для себя лучшие архитектурные достопримечательности города {city}. Этот маршрут проведет вас мимо самых интересных зданий и сооружений.',
  true,
  1
),
(
  'Модернистская архитектура',
  'architectural_style',
  '{"architectural_style": ["modern", "modernism", "модернизм"]}',
  '{"max_points": 6, "max_distance_km": 4}',
  'Модернизм в {city}',
  'Исследуйте модернистскую архитектуру {city}. Узнайте о революционных идеях архитекторов XX века и их влиянии на городской пейзаж.',
  true,
  2
),
(
  'Историческая архитектура',
  'historical_period',
  '{"year_built_max": 1950}',
  '{"max_points": 10, "max_distance_km": 2}',
  'Историческое наследие {city}',
  'Прогулка по историческим районам {city}. Познакомьтесь с архитектурными стилями прошлых веков и их историями.',
  true,
  3
)
ON CONFLICT DO NOTHING;

-- =========================================
-- СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ОПТИМИЗАЦИИ
-- =========================================

-- Индексы для таблицы routes
CREATE INDEX IF NOT EXISTS idx_routes_created_by ON routes(created_by);
CREATE INDEX IF NOT EXISTS idx_routes_visibility_status ON routes(route_visibility, publication_status);
CREATE INDEX IF NOT EXISTS idx_routes_published ON routes(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city);
CREATE INDEX IF NOT EXISTS idx_routes_priority_score ON routes(priority_score DESC);

-- Индексы для таблицы route_points
CREATE INDEX IF NOT EXISTS idx_route_points_route_id ON route_points(route_id);
CREATE INDEX IF NOT EXISTS idx_route_points_order ON route_points(route_id, order_index);

-- Индексы для таблиц автогенерации
CREATE INDEX IF NOT EXISTS idx_route_templates_active ON route_templates(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_generation_logs_success ON route_generation_logs(success, created_at DESC);

-- =========================================
-- ПРОВЕРКА СИСТЕМЫ
-- =========================================

-- Функция для проверки RLS политик
CREATE OR REPLACE FUNCTION check_routes_rls()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    t.row_security_enabled,
    COUNT(p.policy_name)::INTEGER
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.table_name = t.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_name IN ('routes', 'route_points', 'route_templates', 'route_generation_logs')
  GROUP BY t.table_name, t.row_security_enabled
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- Запускаем проверку
SELECT * FROM check_routes_rls();

-- =========================================
-- УВЕДОМЛЕНИЕ О ЗАВЕРШЕНИИ
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS политики для маршрутов успешно настроены!';
  RAISE NOTICE '🚀 Автогенерация маршрутов теперь должна работать корректно.';
  RAISE NOTICE '📋 Проверьте результаты выше - все таблицы должны иметь RLS включенный и политики настроенные.';
END $$;