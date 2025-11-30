-- 027_fix_search_path_in_functions.sql
-- Миграция для добавления безопасного search_path ко всем функциям
-- Согласно LAUNCH_READINESS_REPORT.md раздел 1.3
-- Критичность: СРЕДНЯЯ (защита от schema poisoning)
-- Дата: 29 ноября 2025

-- =====================================================
-- ЧАСТЬ 1: SECURITY DEFINER функции (КРИТИЧНО)
-- =====================================================

-- Эти функции выполняются с правами создателя, поэтому крайне важно
-- защитить их от атак schema poisoning

ALTER FUNCTION add_building_to_collection(uuid, uuid, text, date)
SET search_path = '';

ALTER FUNCTION check_rls_optimization()
SET search_path = '';

ALTER FUNCTION check_rls_status()
SET search_path = '';

ALTER FUNCTION check_search_indexes()
SET search_path = '';

ALTER FUNCTION get_user_collections(uuid)
SET search_path = '';

ALTER FUNCTION handle_new_user()
SET search_path = '';

ALTER FUNCTION log_building_edit()
SET search_path = '';

ALTER FUNCTION notify_moderation_status_change()
SET search_path = '';

ALTER FUNCTION remove_building_from_collection(uuid, uuid)
SET search_path = '';

ALTER FUNCTION search_public_collections(text, integer, integer)
SET search_path = '';

ALTER FUNCTION set_building_moderation_status()
SET search_path = '';

-- =====================================================
-- ЧАСТЬ 2: Остальные пользовательские функции
-- =====================================================

-- Хотя эти функции SECURITY INVOKER, всё равно рекомендуется
-- установить безопасный search_path для защиты

ALTER FUNCTION add_to_collection(uuid, varchar, uuid, text)
SET search_path = '';

ALTER FUNCTION buildings_within_distance(double precision, double precision, double precision)
SET search_path = '';

ALTER FUNCTION calculate_distance(double precision, double precision, double precision, double precision)
SET search_path = '';

ALTER FUNCTION check_routes_rls()
SET search_path = '';

ALTER FUNCTION create_collection(uuid, text, text, varchar, boolean)
SET search_path = '';

-- =====================================================
-- ЧАСТЬ 3: Проверочная функция
-- =====================================================

-- Функция для проверки, что все пользовательские функции имеют search_path
CREATE OR REPLACE FUNCTION check_function_search_paths()
RETURNS TABLE (
  function_name TEXT,
  arguments TEXT,
  security_type TEXT,
  has_search_path BOOLEAN,
  current_search_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.proname::TEXT as function_name,
    pg_get_function_identity_arguments(p.oid)::TEXT as arguments,
    CASE
      WHEN p.prosecdef THEN 'SECURITY DEFINER'
      ELSE 'SECURITY INVOKER'
    END::TEXT as security_type,
    EXISTS (
      SELECT 1 FROM unnest(p.proconfig) as config
      WHERE config LIKE 'search_path=%'
    ) as has_search_path,
    COALESCE(
      array_to_string(
        ARRAY(
          SELECT config
          FROM unnest(p.proconfig) as config
          WHERE config LIKE 'search_path=%'
        ),
        ', '
      ),
      'NO search_path SET'
    )::TEXT as current_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    -- Исключить функции из расширений
    AND p.proname NOT LIKE 'cube%'
    AND p.proname NOT LIKE 'earth%'
    AND p.proname NOT LIKE 'll_%'
    AND p.proname NOT LIKE 'gc_%'
    AND p.proname NOT LIKE 'geo_%'
  ORDER BY
    CASE WHEN p.prosecdef THEN 1 ELSE 2 END,
    p.proname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Вывод результата проверки
SELECT * FROM check_function_search_paths();

-- Статистика
SELECT
  COUNT(*) FILTER (WHERE has_search_path) as functions_with_search_path,
  COUNT(*) FILTER (WHERE NOT has_search_path) as functions_without_search_path,
  COUNT(*) FILTER (WHERE security_type = 'SECURITY DEFINER' AND has_search_path) as secure_definer_functions,
  COUNT(*) FILTER (WHERE security_type = 'SECURITY DEFINER' AND NOT has_search_path) as insecure_definer_functions,
  COUNT(*) as total_user_functions
FROM check_function_search_paths();
