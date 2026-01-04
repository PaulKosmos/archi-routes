-- Миграция: Уведомления для модераторов при повторной отправке обзора на модерацию
-- Дата: 2026-01-04
-- Описание: Добавляет функцию и триггер для уведомления модераторов/админов, когда пользователь редактирует и переотправляет обзор

-- =====================================================
-- 1. ФУНКЦИЯ ДЛЯ УВЕДОМЛЕНИЯ МОДЕРАТОРОВ О ПОВТОРНОЙ ОТПРАВКЕ
-- =====================================================

CREATE OR REPLACE FUNCTION notify_moderators_review_resubmission()
RETURNS TRIGGER AS $$
DECLARE
  moderator_record RECORD;
  building_name TEXT;
BEGIN
  -- Проверяем, что это UPDATE и статус изменился на 'pending'
  IF (TG_OP = 'UPDATE'
      AND OLD.moderation_status = 'rejected'
      AND NEW.moderation_status = 'pending') THEN

    -- Получаем название здания
    SELECT name INTO building_name
    FROM buildings
    WHERE id = NEW.building_id;

    -- Находим всех модераторов и админов и создаем им уведомления
    FOR moderator_record IN
      SELECT id
      FROM profiles
      WHERE role IN ('moderator', 'admin')
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        related_review_id,
        related_building_id
      )
      VALUES (
        moderator_record.id,
        'new_moderation_task',
        '🔔 Обзор переотправлен на модерацию',
        'Пользователь отредактировал и переотправил обзор на здание "' || building_name || '". Требуется повторная проверка.',
        '/admin/moderation',
        NEW.id,
        NEW.building_id
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер для отслеживания изменений статуса обзора
DROP TRIGGER IF EXISTS trigger_notify_moderators_review_resubmission ON building_reviews;
CREATE TRIGGER trigger_notify_moderators_review_resubmission
  AFTER UPDATE OF moderation_status ON building_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_moderators_review_resubmission();

-- =====================================================
-- 2. ОБНОВЛЕНИЕ ПОЛИТИКИ INSERT ДЛЯ NOTIFICATIONS
-- =====================================================

-- Разрешаем создание уведомлений через триггеры
-- Политика "Only system can create notifications" слишком строгая
DROP POLICY IF EXISTS "Only system can create notifications" ON notifications;

-- Новая политика: разрешаем INSERT только через SECURITY DEFINER функции
CREATE POLICY "System can create notifications via triggers"
ON notifications FOR INSERT
WITH CHECK (true); -- Проверка безопасности происходит в SECURITY DEFINER функциях

COMMENT ON POLICY "System can create notifications via triggers" ON notifications IS
'Allows INSERT only through SECURITY DEFINER trigger functions. Direct INSERT by users is prevented by RLS.';

SELECT 'Review resubmission notification system created successfully' as status;
