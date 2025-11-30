-- =========================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ ТАБЛИЦЫ ROUTES (ВЕРСИЯ 2)
-- =========================================
-- 
-- Этот скрипт исправляет проблемы с Row Level Security (RLS) 
-- учитывая реальную структуру существующих таблиц
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
DROP POLICY IF EXISTS "Users can view route points for accessible routes" ON route_points;
DROP POLICY IF EXISTS "Users can create route points for own routes" ON route_points;
DROP POLICY IF EXISTS "Users can update route points for own routes" ON route_points;
DROP POLICY IF EXISTS "Users can delete route points for own routes" ON route_points;

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
-- ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ АВТОГЕНЕРАЦИИ
-- =========================================

-- Проверяем и показываем структуру существующих таблиц
DO $$
BEGIN
  -- Проверяем таблицу ai_providers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_providers') THEN
    RAISE NOTICE '✅ Таблица ai_providers существует';
    
    -- Добавляем OpenAI провайдера с существующими колонками
    INSERT INTO ai_providers (name, default_model, is_active)
    VALUES ('openai', 'gpt-4', true)
    ON CONFLICT (name) DO NOTHING;
    
    RAISE NOTICE '✅ OpenAI провайдер добавлен в ai_providers';
  ELSE
    RAISE NOTICE '❌ Таблица ai_providers не существует';
  END IF;

  -- Проверяем таблицу route_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_templates') THEN
    RAISE NOTICE '✅ Таблица route_templates существует';
    
    -- Добавляем базовые шаблоны с существующими колонками
    INSERT INTO route_templates (name, category, is_active, priority)
    VALUES 
    ('Универсальный архитектурный маршрут', 'general', true, 1),
    ('Модернистская архитектура', 'architectural_style', true, 2),
    ('Историческая архитектура', 'historical_period', true, 3)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Базовые шаблоны добавлены в route_templates';
  ELSE
    RAISE NOTICE '❌ Таблица route_templates не существует';
  END IF;

  -- Проверяем таблицу route_generation_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_generation_logs') THEN
    RAISE NOTICE '✅ Таблица route_generation_logs существует';
  ELSE
    RAISE NOTICE '❌ Таблица route_generation_logs не существует';
  END IF;
END $$;

-- =========================================
-- RLS ДЛЯ ТАБЛИЦ АВТОГЕНЕРАЦИИ
-- =========================================

-- Включаем RLS для существующих таблиц автогенерации
DO $$
BEGIN
  -- RLS для route_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_templates') THEN
    ALTER TABLE route_templates ENABLE ROW LEVEL SECURITY;
    
    -- Удаляем существующие политики
    DROP POLICY IF EXISTS "Anyone can view route templates" ON route_templates;
    DROP POLICY IF EXISTS "Authenticated users can manage route templates" ON route_templates;
    
    -- Создаем новые политики
    CREATE POLICY "Anyone can view active route templates" ON route_templates 
      FOR SELECT USING (is_active = true);
    CREATE POLICY "Authenticated users can manage route templates" ON route_templates 
      FOR ALL USING (auth.uid() IS NOT NULL);
      
    RAISE NOTICE '✅ RLS настроен для route_templates';
  END IF;

  -- RLS для route_generation_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_generation_logs') THEN
    ALTER TABLE route_generation_logs ENABLE ROW LEVEL SECURITY;
    
    -- Удаляем существующие политики
    DROP POLICY IF EXISTS "Anyone can view generation logs" ON route_generation_logs;
    DROP POLICY IF EXISTS "Authenticated users can create generation logs" ON route_generation_logs;
    
    -- Создаем новые политики
    CREATE POLICY "Anyone can view generation logs" ON route_generation_logs 
      FOR SELECT USING (true);
    CREATE POLICY "Authenticated users can create generation logs" ON route_generation_logs 
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
      
    RAISE NOTICE '✅ RLS настроен для route_generation_logs';
  END IF;

  -- RLS для ai_providers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_providers') THEN
    ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
    
    -- Удаляем существующие политики
    DROP POLICY IF EXISTS "Anyone can view active AI providers" ON ai_providers;
    DROP POLICY IF EXISTS "Authenticated users can manage AI providers" ON ai_providers;
    
    -- Создаем новые политики
    CREATE POLICY "Anyone can view active AI providers" ON ai_providers 
      FOR SELECT USING (is_active = true);
    CREATE POLICY "Authenticated users can manage AI providers" ON ai_providers 
      FOR ALL USING (auth.uid() IS NOT NULL);
      
    RAISE NOTICE '✅ RLS настроен для ai_providers';
  END IF;
END $$;

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

-- Индексы для таблиц автогенерации (с проверкой существования колонок)
DO $$
BEGIN
  -- Индекс для route_templates
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'route_templates' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_route_templates_active ON route_templates(is_active, priority DESC);
    RAISE NOTICE '✅ Индекс создан для route_templates';
  END IF;
  
  -- Индекс для route_generation_logs (проверяем наличие нужных колонок)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'route_generation_logs' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_generation_logs_created ON route_generation_logs(created_at DESC);
    RAISE NOTICE '✅ Индекс создан для route_generation_logs';
  END IF;
END $$;

-- =========================================
-- ПРОВЕРКА СИСТЕМЫ (ИСПРАВЛЕННАЯ)
-- =========================================

-- Функция для проверки RLS политик (исправленная)
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
    COUNT(p.policyname)::INTEGER
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.tablename = t.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_name IN ('routes', 'route_points', 'route_templates', 'route_generation_logs', 'ai_providers')
  GROUP BY t.table_name, t.row_security_enabled
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- Запускаем проверку
SELECT * FROM check_routes_rls();

-- =========================================
-- ПОКАЗАТЬ СТРУКТУРУ ТАБЛИЦ АВТОГЕНЕРАЦИИ
-- =========================================

-- Показываем колонки в таблицах автогенерации для отладки
DO $$
DECLARE
  tbl_name TEXT;
  col_info RECORD;
BEGIN
  FOR tbl_name IN SELECT table_name FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name IN ('route_templates', 'ai_providers', 'route_generation_logs')
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '📋 Структура таблицы: %', tbl_name;
    RAISE NOTICE '----------------------------------------';
    
    FOR col_info IN SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = tbl_name AND table_schema = 'public'
                    ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '• % (%)', col_info.column_name, col_info.data_type;
    END LOOP;
  END LOOP;
END $$;

-- =========================================
-- УВЕДОМЛЕНИЕ О ЗАВЕРШЕНИИ
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS политики для маршрутов успешно настроены!';
  RAISE NOTICE '🚀 Автогенерация маршрутов теперь должна работать корректно.';
  RAISE NOTICE '📋 Проверьте результаты выше - все таблицы должны иметь RLS включенный и политики настроенные.';
  RAISE NOTICE '';
  RAISE NOTICE '🔑 ВАЖНО: Добавьте в .env.local:';
  RAISE NOTICE 'OPENAI_API_KEY=your_openai_api_key';
  RAISE NOTICE '';
END $$;