-- =====================================================
-- MIGRATION 052: Moderation Functions
-- Date: 2026-01-01
-- Description: Функции для одобрения и отклонения контента
-- Status: ⏳ PENDING
-- =====================================================

-- =====================================================
-- 1. ФУНКЦИЯ ОДОБРЕНИЯ КОНТЕНТА
-- =====================================================

CREATE OR REPLACE FUNCTION approve_content(
  p_content_type VARCHAR(50),
  p_content_id UUID,
  p_moderator_id UUID
)
RETURNS void AS $$
BEGIN
  -- Одобряем в зависимости от типа контента
  IF p_content_type = 'building' THEN
    UPDATE buildings
    SET
      moderation_status = 'approved',
      moderated_by = p_moderator_id,
      moderated_at = NOW()
    WHERE id = p_content_id;

  ELSIF p_content_type = 'review' THEN
    UPDATE building_reviews
    SET
      moderation_status = 'approved',
      is_verified = true,
      moderated_by = p_moderator_id,
      moderated_at = NOW()
    WHERE id = p_content_id;

  ELSIF p_content_type = 'blog' THEN
    UPDATE blog_posts
    SET
      moderation_status = 'approved',
      status = 'published',
      moderated_by = p_moderator_id,
      moderated_at = NOW(),
      published_at = COALESCE(published_at, NOW())
    WHERE id = p_content_id;

  ELSE
    RAISE EXCEPTION 'Unknown content type: %', p_content_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_content IS
'Одобрение контента модератором (здание, обзор или блог)';

-- =====================================================
-- 2. ФУНКЦИЯ ОТКЛОНЕНИЯ КОНТЕНТА
-- =====================================================

CREATE OR REPLACE FUNCTION reject_content(
  p_content_type VARCHAR(50),
  p_content_id UUID,
  p_moderator_id UUID,
  p_rejection_reason TEXT
)
RETURNS void AS $$
BEGIN
  -- Отклоняем в зависимости от типа контента
  IF p_content_type = 'building' THEN
    UPDATE buildings
    SET
      moderation_status = 'rejected',
      moderated_by = p_moderator_id,
      moderated_at = NOW(),
      rejection_reason = p_rejection_reason
    WHERE id = p_content_id;

  ELSIF p_content_type = 'review' THEN
    UPDATE building_reviews
    SET
      moderation_status = 'rejected',
      is_verified = false,
      moderated_by = p_moderator_id,
      moderated_at = NOW(),
      rejection_reason = p_rejection_reason
    WHERE id = p_content_id;

  ELSIF p_content_type = 'blog' THEN
    UPDATE blog_posts
    SET
      moderation_status = 'rejected',
      moderated_by = p_moderator_id,
      moderated_at = NOW(),
      rejection_reason = p_rejection_reason
    WHERE id = p_content_id;

  ELSE
    RAISE EXCEPTION 'Unknown content type: %', p_content_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_content IS
'Отклонение контента модератором с указанием причины';

-- =====================================================
-- 3. ФУНКЦИЯ ПОЛУЧЕНИЯ СТАТИСТИКИ МОДЕРАЦИИ
-- =====================================================

CREATE OR REPLACE FUNCTION get_moderation_stats()
RETURNS TABLE (
  content_type VARCHAR,
  pending_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT
) AS $$
BEGIN
  -- Статистика зданий
  RETURN QUERY
  SELECT
    'building'::VARCHAR as content_type,
    COUNT(*) FILTER (WHERE moderation_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE moderation_status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected') as rejected_count
  FROM buildings;

  -- Статистика обзоров
  RETURN QUERY
  SELECT
    'review'::VARCHAR as content_type,
    COUNT(*) FILTER (WHERE moderation_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE moderation_status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected') as rejected_count
  FROM building_reviews;

  -- Статистика блогов
  RETURN QUERY
  SELECT
    'blog'::VARCHAR as content_type,
    COUNT(*) FILTER (WHERE moderation_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE moderation_status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected') as rejected_count
  FROM blog_posts;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_moderation_stats IS
'Получение статистики модерации по всем типам контента';

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =====================================================

SELECT
  'Migration 052: Moderation functions created successfully' as status,
  'approve_content, reject_content, get_moderation_stats created' as functions_status;
