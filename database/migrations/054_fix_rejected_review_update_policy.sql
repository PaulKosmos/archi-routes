-- Миграция: Исправление политики UPDATE для отклонённых обзоров
-- Дата: 2026-01-04
-- Описание: Разрешает пользователям обновлять свои отклонённые обзоры для повторной отправки на модерацию

-- =====================================================
-- 1. УДАЛЯЕМ СТАРУЮ ОГРАНИЧИВАЮЩУЮ ПОЛИТИКУ
-- =====================================================

DROP POLICY IF EXISTS "Users can update own pending reviews" ON building_reviews;

-- =====================================================
-- 2. СОЗДАЁМ НОВУЮ ПОЛИТИКУ С ПОДДЕРЖКОЙ REJECTED СТАТУСА
-- =====================================================

CREATE POLICY "Users can update own pending or rejected reviews"
ON building_reviews FOR UPDATE
USING (
  user_id = auth.uid()
  AND moderation_status IN ('pending', 'rejected')  -- ✅ Разрешаем pending И rejected
)
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Users can update own pending or rejected reviews" ON building_reviews IS
'Allows users to update their own reviews that are pending or rejected.
This enables users to edit and resubmit rejected reviews for moderation.';

SELECT 'Fixed review update policy to allow rejected reviews' as status;
