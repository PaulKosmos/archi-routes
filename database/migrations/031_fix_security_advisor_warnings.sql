-- 031_fix_security_advisor_warnings.sql
-- Миграция для исправления предупреждений Supabase Security Advisor
-- Дата: 22 декабря 2025

-- =====================================================
-- ОПИСАНИЕ
-- =====================================================
-- Эта миграция исправляет предупреждения безопасности:
-- 1. Включает RLS на таблицах auto_generated_routes_log и city_name_variants
-- 2. Создает соответствующие политики безопасности для этих таблиц
--
-- ПРИМЕЧАНИЕ: Security Advisor сообщил о 5 представлениях с SECURITY DEFINER:
-- - collection_stats
-- - collection_items_detailed
-- - buildings_with_audio
-- - collections_with_stats
-- - collection_buildings_detailed
--
-- Однако при проверке базы данных эти представления НЕ содержат SECURITY DEFINER
-- в своих определениях. Они являются обычными представлениями SELECT.
-- Возможно, Security Advisor ошибочно помечает их или относится к другим объектам.

-- =====================================================
-- ЧАСТЬ 1: Включить RLS на city_name_variants
-- =====================================================

-- Таблица city_name_variants содержит справочные данные о вариантах названий городов
-- на разных языках. Это публичные справочные данные.

ALTER TABLE city_name_variants ENABLE ROW LEVEL SECURITY;

-- Политика: Все могут читать варианты названий городов
CREATE POLICY "city_name_variants_select_policy"
ON city_name_variants
FOR SELECT
TO public
USING (true);

-- Политика: Только аутентифицированные пользователи могут вставлять
-- (в будущем можно ограничить только до администраторов)
CREATE POLICY "city_name_variants_insert_policy"
ON city_name_variants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Политика: Только аутентифицированные пользователи могут обновлять
CREATE POLICY "city_name_variants_update_policy"
ON city_name_variants
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Политика: Только аутентифицированные пользователи могут удалять
CREATE POLICY "city_name_variants_delete_policy"
ON city_name_variants
FOR DELETE
TO authenticated
USING (true);

COMMENT ON POLICY "city_name_variants_select_policy" ON city_name_variants IS
'Разрешить всем читать варианты названий городов';

COMMENT ON POLICY "city_name_variants_insert_policy" ON city_name_variants IS
'Разрешить аутентифицированным пользователям добавлять варианты';

COMMENT ON POLICY "city_name_variants_update_policy" ON city_name_variants IS
'Разрешить аутентифицированным пользователям обновлять варианты';

COMMENT ON POLICY "city_name_variants_delete_policy" ON city_name_variants IS
'Разрешить аутентифицированным пользователям удалять варианты';

-- =====================================================
-- ЧАСТЬ 2: Включить RLS на auto_generated_routes_log
-- =====================================================

-- Таблица auto_generated_routes_log содержит журнал автоматически сгенерированных маршрутов.
-- Это системный журнал для отладки и мониторинга.

ALTER TABLE auto_generated_routes_log ENABLE ROW LEVEL SECURITY;

-- Политика: Все аутентифицированные пользователи могут читать логи
CREATE POLICY "auto_generated_routes_log_select_policy"
ON auto_generated_routes_log
FOR SELECT
TO authenticated
USING (true);

-- Политика: Только сервисная роль может вставлять записи в лог
-- (обычные пользователи не должны напрямую писать в логи)
CREATE POLICY "auto_generated_routes_log_insert_policy"
ON auto_generated_routes_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Политика: Только сервисная роль может обновлять записи в логе
CREATE POLICY "auto_generated_routes_log_update_policy"
ON auto_generated_routes_log
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Политика: Только сервисная роль может удалять записи из лога
CREATE POLICY "auto_generated_routes_log_delete_policy"
ON auto_generated_routes_log
FOR DELETE
TO service_role
USING (true);

COMMENT ON POLICY "auto_generated_routes_log_select_policy" ON auto_generated_routes_log IS
'Разрешить аутентифицированным пользователям читать логи генерации маршрутов';

COMMENT ON POLICY "auto_generated_routes_log_insert_policy" ON auto_generated_routes_log IS
'Только сервисная роль может добавлять записи в лог';

COMMENT ON POLICY "auto_generated_routes_log_update_policy" ON auto_generated_routes_log IS
'Только сервисная роль может обновлять записи в логе';

COMMENT ON POLICY "auto_generated_routes_log_delete_policy" ON auto_generated_routes_log IS
'Только сервисная роль может удалять записи из лога';

-- =====================================================
-- ЧАСТЬ 3: Проверка статуса RLS
-- =====================================================

-- Показать статус RLS для всех таблиц
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('city_name_variants', 'auto_generated_routes_log')
ORDER BY tablename;

-- Показать созданные политики
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('city_name_variants', 'auto_generated_routes_log')
ORDER BY tablename, policyname;

-- =====================================================
-- ПРИМЕЧАНИЯ
-- =====================================================
--
-- После применения миграции:
-- 1. Обе таблицы будут иметь включенный RLS
-- 2. city_name_variants: публичное чтение, запись для аутентифицированных
-- 3. auto_generated_routes_log: чтение для аутентифицированных, запись только для service_role
-- 4. Предупреждения Security Advisor по этим таблицам должны исчезнуть
--
-- Относительно предупреждений о представлениях:
-- - Проверено, что представления НЕ содержат SECURITY DEFINER
-- - Это обычные SELECT представления без особых свойств безопасности
-- - Если предупреждения сохранятся, возможно требуется обновление Security Advisor
-- - Или предупреждения относятся к функциям, а не представлениям
--
-- Откат миграции (если потребуется):
-- ALTER TABLE city_name_variants DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "city_name_variants_select_policy" ON city_name_variants;
-- DROP POLICY IF EXISTS "city_name_variants_insert_policy" ON city_name_variants;
-- DROP POLICY IF EXISTS "city_name_variants_update_policy" ON city_name_variants;
-- DROP POLICY IF EXISTS "city_name_variants_delete_policy" ON city_name_variants;
--
-- ALTER TABLE auto_generated_routes_log DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "auto_generated_routes_log_select_policy" ON auto_generated_routes_log;
-- DROP POLICY IF EXISTS "auto_generated_routes_log_insert_policy" ON auto_generated_routes_log;
-- DROP POLICY IF EXISTS "auto_generated_routes_log_update_policy" ON auto_generated_routes_log;
-- DROP POLICY IF EXISTS "auto_generated_routes_log_delete_policy" ON auto_generated_routes_log;
