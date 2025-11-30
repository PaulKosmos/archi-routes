-- Миграция: Добавление системы модерации для зданий
-- Дата: 2025-10-09
-- Описание: Добавляет поля для модерации новых зданий, созданных пользователями
-- Статус: ✅ ПРИМЕНЕНА через MCP Supabase

-- 1. Добавляем поля модерации в таблицу buildings
ALTER TABLE buildings 
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Создаем индекс для быстрого поиска по статусу
CREATE INDEX IF NOT EXISTS idx_buildings_moderation_status 
ON buildings(moderation_status);

-- 3. Комментарии к полям
COMMENT ON COLUMN buildings.moderation_status IS 'Статус модерации: pending (на модерации), approved (одобрено), rejected (отклонено)';
COMMENT ON COLUMN buildings.moderated_by IS 'ID модератора, который проверил здание';
COMMENT ON COLUMN buildings.moderated_at IS 'Дата и время модерации';
COMMENT ON COLUMN buildings.rejection_reason IS 'Причина отклонения (если rejected)';

-- 4. Обновляем существующие здания - все approved
UPDATE buildings 
SET moderation_status = 'approved' 
WHERE moderation_status IS NULL;

-- 5. Удаляем старые политики для buildings
DROP POLICY IF EXISTS "Buildings are viewable by everyone" ON buildings;
DROP POLICY IF EXISTS "Users can insert their own buildings" ON buildings;
DROP POLICY IF EXISTS "Users can update their own buildings" ON buildings;
DROP POLICY IF EXISTS "Users can delete their own buildings" ON buildings;

-- 6. Создаем новые RLS политики с учетом модерации

-- Политика просмотра: обычные пользователи видят только approved ИЛИ свои собственные
CREATE POLICY "View approved or own buildings"
ON buildings FOR SELECT
USING (
  moderation_status = 'approved' 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  )
);

-- Политика создания: авторизованные пользователи могут создавать здания
CREATE POLICY "Authenticated users can create buildings"
ON buildings FOR INSERT
WITH CHECK (
  auth.uid() = created_by
);

-- Политика обновления: пользователи могут редактировать свои здания
CREATE POLICY "Users can update own buildings"
ON buildings FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Политика для модераторов: могут обновлять статус модерации
CREATE POLICY "Moderators can moderate buildings"
ON buildings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  )
);

-- Политика удаления: только свои здания или модераторы
CREATE POLICY "Users can delete own buildings or moderators all"
ON buildings FOR DELETE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  )
);

-- 7. Создаем функцию для автоматической установки статуса pending для новых зданий от обычных пользователей
CREATE OR REPLACE FUNCTION set_building_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем роль создателя
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = NEW.created_by
    AND profiles.role IN ('expert', 'moderator', 'admin')
  ) THEN
    -- Expert+ создают сразу approved здания
    NEW.moderation_status := 'approved';
  ELSE
    -- Guide и ниже создают pending здания
    NEW.moderation_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Создаем триггер для автоматической установки статуса
DROP TRIGGER IF EXISTS trigger_set_building_moderation_status ON buildings;
CREATE TRIGGER trigger_set_building_moderation_status
  BEFORE INSERT ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION set_building_moderation_status();

-- Информация о миграции
SELECT 'Migration 009: Moderation system for buildings completed successfully' as status;
