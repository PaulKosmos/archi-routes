-- Миграция: Создание системы уведомлений
-- Дата: 2025-10-09
-- Описание: Создает таблицу уведомлений и триггеры для автоматических уведомлений о модерации
-- Статус: ✅ ПРИМЕНЕНА через MCP Supabase

-- Создание таблицы уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'moderation_approved', 'moderation_rejected', 'moderation_pending', 'new_review', etc
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Ссылка на объект
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  -- Данные о связанном объекте
  related_building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  related_route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  related_review_id UUID REFERENCES building_reviews(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS политики
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only system can create notifications"
ON notifications FOR INSERT
WITH CHECK (false);

-- Функция для создания уведомлений при изменении статуса модерации
CREATE OR REPLACE FUNCTION notify_moderation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.moderation_status IS DISTINCT FROM NEW.moderation_status) THEN
    
    IF NEW.moderation_status = 'approved' THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_building_id)
      VALUES (
        NEW.created_by,
        'moderation_approved',
        '✅ Объект одобрен!',
        'Ваш объект "' || NEW.name || '" прошел модерацию и теперь виден всем пользователям.',
        '/buildings/' || NEW.id,
        NEW.id
      );
    
    ELSIF NEW.moderation_status = 'rejected' THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_building_id)
      VALUES (
        NEW.created_by,
        'moderation_rejected',
        '❌ Объект отклонен',
        'Ваш объект "' || NEW.name || '" не прошел модерацию.' || 
        CASE WHEN NEW.rejection_reason IS NOT NULL 
          THEN ' Причина: ' || NEW.rejection_reason 
          ELSE '' 
        END,
        '/buildings/' || NEW.id,
        NEW.id
      );
    END IF;
  
  ELSIF (TG_OP = 'INSERT' AND NEW.moderation_status = 'pending') THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_building_id)
    VALUES (
      NEW.created_by,
      'moderation_pending',
      '🟡 Объект на модерации',
      'Ваш объект "' || NEW.name || '" отправлен на модерацию. Мы проверим его в ближайшее время.',
      '/buildings/' || NEW.id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер
DROP TRIGGER IF EXISTS trigger_notify_moderation_status ON buildings;
CREATE TRIGGER trigger_notify_moderation_status
  AFTER INSERT OR UPDATE OF moderation_status ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION notify_moderation_status_change();

SELECT 'Notification system created successfully' as status;

