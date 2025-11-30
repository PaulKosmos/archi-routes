-- ROUTES_SYSTEM_UPGRADE.sql (ПРОДОЛЖЕНИЕ)
-- Умная система маршрутов и фильтрации для архитектурной платформы

route_visibility = 'public'
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