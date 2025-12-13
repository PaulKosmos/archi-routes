-- Добавляем тип 'bookmark' в news_interactions
-- Обновляем CHECK constraint для interaction_type

ALTER TABLE news_interactions
DROP CONSTRAINT IF EXISTS news_interactions_interaction_type_check;

ALTER TABLE news_interactions
ADD CONSTRAINT news_interactions_interaction_type_check
CHECK (interaction_type IN ('view', 'like', 'share', 'bookmark'));

-- Добавляем поле bookmarks_count в architecture_news
ALTER TABLE architecture_news
ADD COLUMN IF NOT EXISTS bookmarks_count INTEGER NOT NULL DEFAULT 0;

-- Обновляем функцию update_news_statistics для поддержки bookmark
CREATE OR REPLACE FUNCTION update_news_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем счетчики в зависимости от типа взаимодействия
  IF TG_OP = 'INSERT' THEN
    -- Увеличиваем счетчик
    IF NEW.interaction_type = 'view' THEN
      UPDATE architecture_news
      SET views_count = views_count + 1,
          updated_at = NOW()
      WHERE id = NEW.news_id;
    ELSIF NEW.interaction_type = 'like' THEN
      UPDATE architecture_news
      SET likes_count = likes_count + 1,
          updated_at = NOW()
      WHERE id = NEW.news_id;
    ELSIF NEW.interaction_type = 'share' THEN
      UPDATE architecture_news
      SET shares_count = shares_count + 1,
          updated_at = NOW()
      WHERE id = NEW.news_id;
    ELSIF NEW.interaction_type = 'bookmark' THEN
      UPDATE architecture_news
      SET bookmarks_count = bookmarks_count + 1,
          updated_at = NOW()
      WHERE id = NEW.news_id;
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Уменьшаем счетчик
    IF OLD.interaction_type = 'like' THEN
      UPDATE architecture_news
      SET likes_count = GREATEST(0, likes_count - 1),
          updated_at = NOW()
      WHERE id = OLD.news_id;
    ELSIF OLD.interaction_type = 'share' THEN
      UPDATE architecture_news
      SET shares_count = GREATEST(0, shares_count - 1),
          updated_at = NOW()
      WHERE id = OLD.news_id;
    ELSIF OLD.interaction_type = 'bookmark' THEN
      UPDATE architecture_news
      SET bookmarks_count = GREATEST(0, bookmarks_count - 1),
          updated_at = NOW()
      WHERE id = OLD.news_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Комментарий
COMMENT ON COLUMN architecture_news.bookmarks_count IS 'Количество добавлений в закладки';
