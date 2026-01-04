-- =====================================================
-- MIGRATION 050: Complete Moderation System
-- Date: 2026-01-01
-- Description: Полная система модерации для обзоров, блогов,
--              очередь модерации и уведомления
-- Status: ⏳ PENDING
-- =====================================================

-- =====================================================
-- 1. МОДЕРАЦИЯ ОБЗОРОВ (Building Reviews)
-- =====================================================

-- Добавляем поля модерации
ALTER TABLE building_reviews
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status
ON building_reviews(moderation_status);

-- Комментарии
COMMENT ON COLUMN building_reviews.moderation_status IS 'Статус модерации: pending, approved, rejected';
COMMENT ON COLUMN building_reviews.moderated_by IS 'ID модератора, проверившего обзор';
COMMENT ON COLUMN building_reviews.rejection_reason IS 'Причина отклонения обзора';

-- Обновляем существующие обзоры
-- Одобренные = те, что is_verified = true
UPDATE building_reviews
SET moderation_status = CASE
  WHEN is_verified = true THEN 'approved'
  ELSE 'pending'
END
WHERE moderation_status IS NULL;

-- =====================================================
-- 2. МОДЕРАЦИЯ БЛОГОВ (Blog Posts)
-- =====================================================

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Индекс
CREATE INDEX IF NOT EXISTS idx_blog_posts_moderation_status
ON blog_posts(moderation_status);

-- Комментарии
COMMENT ON COLUMN blog_posts.moderation_status IS 'Статус модерации: pending, approved, rejected';
COMMENT ON COLUMN blog_posts.moderated_by IS 'ID модератора, проверившего статью';
COMMENT ON COLUMN blog_posts.rejection_reason IS 'Причина отклонения статьи';

-- Обновляем существующие посты
-- published = approved, остальное = pending
UPDATE blog_posts
SET moderation_status = CASE
  WHEN status = 'published' THEN 'approved'
  WHEN status = 'draft' THEN 'pending'
  ELSE 'pending'
END
WHERE moderation_status IS NULL;

-- =====================================================
-- 3. МАРШРУТЫ - БЕЗ МОДЕРАЦИИ
-- =====================================================

-- Маршруты НЕ модерируются для пользователей
-- Пользователи могут создавать только личные маршруты (route_visibility = 'private')
-- Публичные маршруты создают только модераторы/админы

-- Удаляем поле rejection_reason из routes если оно было добавлено ранее
-- (в данном случае ничего не делаем, т.к. это поле может быть полезно для админских маршрутов)

-- Комментарий для ясности
COMMENT ON COLUMN routes.publication_status IS
'Для пользователей: всегда published с route_visibility=private.
Для админов/модераторов: может быть draft/pending/published с любым visibility';

-- =====================================================
-- 4. РАСШИРЕНИЕ ТАБЛИЦЫ УВЕДОМЛЕНИЙ
-- =====================================================

-- Добавляем связи с новыми сущностями
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS related_edit_history_id UUID REFERENCES building_edit_history(id) ON DELETE CASCADE;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notifications_blog_post ON notifications(related_blog_post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_edit_history ON notifications(related_edit_history_id);

-- =====================================================
-- 5. ОЧЕРЕДЬ МОДЕРАЦИИ
-- =====================================================

CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Тип контента
  content_type VARCHAR(50) NOT NULL, -- 'building', 'review', 'blog', 'edit'
  content_id UUID NOT NULL,

  -- Автор
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Приоритет (выше = важнее)
  priority INTEGER DEFAULT 0,

  -- Статус
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'completed'
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Метаданные для быстрого просмотра
  title TEXT,
  preview_data JSONB,

  -- Флаги проверки дубликатов
  is_duplicate_check_needed BOOLEAN DEFAULT TRUE,
  duplicate_confidence VARCHAR(20), -- 'high', 'medium', 'low'
  potential_duplicates JSONB
);

CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_type ON moderation_queue(content_type);
CREATE INDEX idx_moderation_queue_assigned ON moderation_queue(assigned_to);
CREATE INDEX idx_moderation_queue_priority ON moderation_queue(priority DESC, created_at ASC);
CREATE INDEX idx_moderation_queue_created ON moderation_queue(created_at DESC);

COMMENT ON TABLE moderation_queue IS 'Очередь контента на модерацию';
COMMENT ON COLUMN moderation_queue.priority IS 'Приоритет: 0=обычный, 1=высокий, 2=срочный';
COMMENT ON COLUMN moderation_queue.duplicate_confidence IS 'Уверенность в дубликате: high, medium, low';

-- RLS для очереди модерации
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Модераторы видят всю очередь
CREATE POLICY "Moderators can view moderation queue"
ON moderation_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  )
);

-- Модераторы могут обновлять очередь
CREATE POLICY "Moderators can update moderation queue"
ON moderation_queue FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  )
);

-- =====================================================
-- 6. ИСТОРИЯ ИЗМЕНЕНИЙ ЗДАНИЙ (для будущего)
-- =====================================================

CREATE TABLE IF NOT EXISTS building_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES profiles(id),
  edited_at TIMESTAMPTZ DEFAULT NOW(),

  -- Что изменилось
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,

  -- Модерация изменений
  moderation_status VARCHAR(20) DEFAULT 'pending',
  moderated_by UUID REFERENCES profiles(id),
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Контекст
  change_description TEXT,
  is_auto_approved BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_building_edit_history_building ON building_edit_history(building_id);
CREATE INDEX idx_building_edit_history_status ON building_edit_history(moderation_status);
CREATE INDEX idx_building_edit_history_edited_at ON building_edit_history(edited_at DESC);

COMMENT ON TABLE building_edit_history IS 'История изменений зданий с модерацией';
COMMENT ON COLUMN building_edit_history.is_auto_approved IS 'Автоматически одобрено (для Expert+)';

-- RLS для истории изменений
ALTER TABLE building_edit_history ENABLE ROW LEVEL SECURITY;

-- Все видят одобренные изменения
CREATE POLICY "View approved edit history"
ON building_edit_history FOR SELECT
USING (
  moderation_status = 'approved'
  OR edited_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  )
);

-- =====================================================
-- 7. ФУНКЦИИ ДЛЯ ПРОВЕРКИ РОЛЕЙ
-- =====================================================

-- Функция проверки, является ли пользователь модератором
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Функция проверки, является ли пользователь Expert+
CREATE OR REPLACE FUNCTION is_expert_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('expert', 'moderator', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 8. ТРИГГЕРЫ АВТОМАТИЧЕСКОЙ УСТАНОВКИ СТАТУСОВ
-- =====================================================

-- Функция для автоматической установки статуса обзоров
CREATE OR REPLACE FUNCTION set_review_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем роль создателя
  IF is_expert_or_higher() THEN
    NEW.moderation_status := 'approved';
    NEW.is_verified := true;
  ELSE
    NEW.moderation_status := 'pending';
    NEW.is_verified := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для обзоров
DROP TRIGGER IF EXISTS trigger_set_review_moderation_status ON building_reviews;
CREATE TRIGGER trigger_set_review_moderation_status
  BEFORE INSERT ON building_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_review_moderation_status();

-- Функция для автоматической установки статуса блогов
CREATE OR REPLACE FUNCTION set_blog_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем роль создателя
  IF is_expert_or_higher() THEN
    NEW.moderation_status := 'approved';
  ELSE
    NEW.moderation_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для блогов
DROP TRIGGER IF EXISTS trigger_set_blog_moderation_status ON blog_posts;
CREATE TRIGGER trigger_set_blog_moderation_status
  BEFORE INSERT ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_blog_moderation_status();

-- =====================================================
-- 9. УВЕДОМЛЕНИЯ ДЛЯ ОБЗОРОВ
-- =====================================================

CREATE OR REPLACE FUNCTION notify_review_moderation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- При изменении статуса
  IF (TG_OP = 'UPDATE' AND OLD.moderation_status IS DISTINCT FROM NEW.moderation_status) THEN

    IF NEW.moderation_status = 'approved' THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_review_id)
      VALUES (
        NEW.user_id,
        'review_approved',
        '✅ Обзор одобрен!',
        'Ваш обзор был одобрен и теперь виден всем пользователям.',
        '/buildings/' || (SELECT building_id FROM building_reviews WHERE id = NEW.id),
        NEW.id
      );

    ELSIF NEW.moderation_status = 'rejected' THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_review_id)
      VALUES (
        NEW.user_id,
        'review_rejected',
        '❌ Обзор отклонен',
        'Ваш обзор не прошел модерацию.' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL
          THEN ' Причина: ' || NEW.rejection_reason
          ELSE ''
        END,
        '/buildings/' || (SELECT building_id FROM building_reviews WHERE id = NEW.id),
        NEW.id
      );
    END IF;

  -- При создании с pending статусом
  ELSIF (TG_OP = 'INSERT' AND NEW.moderation_status = 'pending') THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_review_id)
    VALUES (
      NEW.user_id,
      'review_pending',
      '🟡 Обзор на модерации',
      'Ваш обзор отправлен на модерацию. Мы проверим его в ближайшее время.',
      '/buildings/' || NEW.building_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_review_moderation ON building_reviews;
CREATE TRIGGER trigger_notify_review_moderation
  AFTER INSERT OR UPDATE OF moderation_status ON building_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_moderation_change();

-- =====================================================
-- 10. УВЕДОМЛЕНИЯ ДЛЯ БЛОГОВ
-- =====================================================

CREATE OR REPLACE FUNCTION notify_blog_moderation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- При изменении статуса
  IF (TG_OP = 'UPDATE' AND OLD.moderation_status IS DISTINCT FROM NEW.moderation_status) THEN

    IF NEW.moderation_status = 'approved' THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_blog_post_id)
      VALUES (
        NEW.author_id,
        'blog_approved',
        '✅ Статья опубликована!',
        'Ваша статья "' || NEW.title || '" была одобрена и опубликована.',
        '/blog/' || NEW.slug,
        NEW.id
      );

    ELSIF NEW.moderation_status = 'rejected' THEN
      INSERT INTO notifications (user_id, type, title, message, link, related_blog_post_id)
      VALUES (
        NEW.author_id,
        'blog_rejected',
        '❌ Статья отклонена',
        'Ваша статья "' || NEW.title || '" не была одобрена.' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL
          THEN ' Причина: ' || NEW.rejection_reason
          ELSE ''
        END,
        '/blog/' || NEW.slug,
        NEW.id
      );
    END IF;

  -- При создании с pending статусом
  ELSIF (TG_OP = 'INSERT' AND NEW.moderation_status = 'pending') THEN
    INSERT INTO notifications (user_id, type, title, message, link, related_blog_post_id)
    VALUES (
      NEW.author_id,
      'blog_pending',
      '🟡 Статья на модерации',
      'Ваша статья "' || NEW.title || '" отправлена на модерацию.',
      '/blog/' || NEW.slug,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_blog_moderation ON blog_posts;
CREATE TRIGGER trigger_notify_blog_moderation
  AFTER INSERT OR UPDATE OF moderation_status ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_blog_moderation_change();

-- =====================================================
-- 11. ДОБАВЛЕНИЕ В ОЧЕРЕДЬ МОДЕРАЦИИ
-- =====================================================

-- Функция добавления в очередь модерации
CREATE OR REPLACE FUNCTION add_to_moderation_queue()
RETURNS TRIGGER AS $$
DECLARE
  content_type_name VARCHAR(50);
  content_title TEXT;
  creator_id UUID;
  should_queue BOOLEAN := FALSE;
BEGIN
  -- Определяем тип контента и данные
  IF TG_TABLE_NAME = 'buildings' THEN
    content_type_name := 'building';
    content_title := NEW.name;
    creator_id := NEW.created_by;
    should_queue := (NEW.moderation_status = 'pending');

  ELSIF TG_TABLE_NAME = 'building_reviews' THEN
    content_type_name := 'review';
    content_title := COALESCE(NEW.title, 'Обзор без названия');
    creator_id := NEW.user_id;
    should_queue := (NEW.moderation_status = 'pending');

  ELSIF TG_TABLE_NAME = 'blog_posts' THEN
    content_type_name := 'blog';
    content_title := NEW.title;
    creator_id := NEW.author_id;
    should_queue := (NEW.moderation_status = 'pending');

  ELSE
    RETURN NEW;
  END IF;

  -- Добавляем в очередь только если статус pending
  IF should_queue THEN
    INSERT INTO moderation_queue (
      content_type,
      content_id,
      created_by,
      title,
      priority,
      preview_data
    ) VALUES (
      content_type_name,
      NEW.id,
      creator_id,
      content_title,
      0, -- Базовый приоритет
      jsonb_build_object(
        'created_at', NEW.created_at,
        'type', content_type_name
      )
    );

    -- Уведомляем всех модераторов о новом контенте
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT
      p.id,
      'new_moderation_task',
      '🔔 Новый контент на модерации',
      'Добавлен новый ' ||
        CASE content_type_name
          WHEN 'building' THEN 'объект'
          WHEN 'review' THEN 'обзор'
          WHEN 'blog' THEN 'статья'
          ELSE 'контент'
        END ||
        ' "' || content_title || '" на модерацию',
      '/admin/moderation'
    FROM profiles p
    WHERE p.role IN ('moderator', 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггеры для добавления в очередь
DROP TRIGGER IF EXISTS trigger_queue_building_moderation ON buildings;
CREATE TRIGGER trigger_queue_building_moderation
  AFTER INSERT ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION add_to_moderation_queue();

DROP TRIGGER IF EXISTS trigger_queue_review_moderation ON building_reviews;
CREATE TRIGGER trigger_queue_review_moderation
  AFTER INSERT ON building_reviews
  FOR EACH ROW
  EXECUTE FUNCTION add_to_moderation_queue();

DROP TRIGGER IF EXISTS trigger_queue_blog_moderation ON blog_posts;
CREATE TRIGGER trigger_queue_blog_moderation
  AFTER INSERT ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION add_to_moderation_queue();

-- =====================================================
-- 12. RLS ПОЛИТИКИ ДЛЯ ОБЗОРОВ И БЛОГОВ
-- =====================================================

-- Удаляем старые политики для обзоров
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON building_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON building_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON building_reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON building_reviews;

-- Новые политики для обзоров
CREATE POLICY "View approved or own reviews"
ON building_reviews FOR SELECT
USING (
  moderation_status = 'approved'
  OR user_id = auth.uid()
  OR is_moderator_or_admin()
);

CREATE POLICY "Authenticated users can create reviews"
ON building_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending reviews"
ON building_reviews FOR UPDATE
USING (
  user_id = auth.uid()
  AND moderation_status = 'pending'
)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Moderators can update all reviews"
ON building_reviews FOR UPDATE
USING (is_moderator_or_admin());

-- Политики для блогов
DROP POLICY IF EXISTS "Anyone can view published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authors can manage own posts" ON blog_posts;

CREATE POLICY "View approved or own blog posts"
ON blog_posts FOR SELECT
USING (
  moderation_status = 'approved'
  OR author_id = auth.uid()
  OR is_moderator_or_admin()
);

-- Создание блогов доступно только Expert+
CREATE POLICY "Expert+ can create blog posts"
ON blog_posts FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND is_expert_or_higher()
);

CREATE POLICY "Authors can update own pending posts"
ON blog_posts FOR UPDATE
USING (
  author_id = auth.uid()
  AND (moderation_status = 'pending' OR moderation_status = 'rejected')
)
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Moderators can update all posts"
ON blog_posts FOR UPDATE
USING (is_moderator_or_admin());

-- =====================================================
-- 13. ПОЛИТИКИ ДЛЯ МАРШРУТОВ
-- =====================================================

-- Пользователи могут создавать только личные маршруты
DROP POLICY IF EXISTS "Users can create routes" ON routes;

CREATE POLICY "Users create only private routes"
ON routes FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    -- Обычные пользователи - только личные
    (route_visibility = 'private' AND NOT is_moderator_or_admin())
    -- Модераторы - любые
    OR is_moderator_or_admin()
  )
);

-- Просмотр маршрутов
DROP POLICY IF EXISTS "View routes based on visibility" ON routes;

CREATE POLICY "View public routes or own routes"
ON routes FOR SELECT
USING (
  route_visibility IN ('public', 'featured')
  OR created_by = auth.uid()
  OR is_moderator_or_admin()
);

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =====================================================

SELECT
  'Migration 050: Complete moderation system created successfully' as status,
  'Buildings: moderation already exists' as buildings_status,
  'Reviews: moderation added' as reviews_status,
  'Blogs: moderation added' as blogs_status,
  'Routes: private only for users' as routes_status,
  'Moderation queue: created' as queue_status,
  'Edit history: created' as history_status,
  'Notifications: extended' as notifications_status;
