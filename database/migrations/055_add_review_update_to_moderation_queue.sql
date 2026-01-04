-- Миграция: Добавление триггера для UPDATE обзоров в очередь модерации
-- Дата: 2026-01-04
-- Описание: Добавляет обзоры в очередь модерации при UPDATE статуса на 'pending' (для повторной отправки после отклонения)

-- =====================================================
-- ТРИГГЕР ДЛЯ UPDATE ОБЗОРОВ
-- =====================================================

-- Триггер для добавления обзоров в очередь при UPDATE
-- Срабатывает когда статус меняется на 'pending' (например, при повторной отправке после отклонения)
DROP TRIGGER IF EXISTS trigger_queue_review_update_moderation ON building_reviews;
CREATE TRIGGER trigger_queue_review_update_moderation
  AFTER UPDATE OF moderation_status ON building_reviews
  FOR EACH ROW
  WHEN (
    -- Срабатывает только когда статус меняется НА 'pending'
    -- (например, из 'rejected' в 'pending')
    NEW.moderation_status = 'pending'
    AND OLD.moderation_status != 'pending'
  )
  EXECUTE FUNCTION add_to_moderation_queue();

COMMENT ON TRIGGER trigger_queue_review_update_moderation ON building_reviews IS
'Adds reviews to moderation queue when status is updated to pending.
This handles resubmission of rejected reviews.';

SELECT 'Review UPDATE trigger for moderation queue created successfully' as status;
