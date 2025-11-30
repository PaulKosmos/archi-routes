-- database/migrations/008_news_statistics_triggers.sql
-- Триггеры для автоматического обновления статистики новостей

-- Функция для обновления счетчиков взаимодействий
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
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Уменьшаем счетчик (только для лайков и шер)
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
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для таблицы news_interactions
DROP TRIGGER IF EXISTS trigger_update_news_statistics ON news_interactions;
CREATE TRIGGER trigger_update_news_statistics
  AFTER INSERT OR DELETE ON news_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_news_statistics();

-- Функция для пересчета статистики (для исправления данных)
CREATE OR REPLACE FUNCTION recalculate_news_statistics()
RETURNS void AS $$
BEGIN
  UPDATE architecture_news SET
    views_count = (
      SELECT COUNT(DISTINCT user_id) 
      FROM news_interactions 
      WHERE news_id = architecture_news.id 
      AND interaction_type = 'view'
    ),
    likes_count = (
      SELECT COUNT(*) 
      FROM news_interactions 
      WHERE news_id = architecture_news.id 
      AND interaction_type = 'like'
    ),
    shares_count = (
      SELECT COUNT(*) 
      FROM news_interactions 
      WHERE news_id = architecture_news.id 
      AND interaction_type = 'share'
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Пересчитываем текущую статистику
SELECT recalculate_news_statistics();

-- Создаем индексы для оптимизации подсчетов
CREATE INDEX IF NOT EXISTS idx_news_interactions_news_type ON news_interactions(news_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_news_interactions_user_news ON news_interactions(user_id, news_id);

COMMENT ON FUNCTION update_news_statistics() IS 'Автоматическое обновление счетчиков статистики новостей при добавлении/удалении взаимодействий';
COMMENT ON FUNCTION recalculate_news_statistics() IS 'Пересчет всей статистики новостей (для исправления данных)';
