-- =====================================================
-- МИГРАЦИЯ: СОЗДАНИЕ ТАБЛИЦ ДЛЯ СИСТЕМЫ НОВОСТЕЙ
-- Дата: 2025-11-02
-- Описание: Создание всех необходимых таблиц для системы новостей и новостных статей
-- =====================================================

-- 1. Таблица architecture_news (основная таблица новостей)
CREATE TABLE IF NOT EXISTS architecture_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  summary TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Категоризация
  category VARCHAR(50) NOT NULL DEFAULT 'projects' CHECK (category IN ('projects', 'events', 'personalities', 'trends', 'planning', 'heritage')),
  subcategory VARCHAR(50),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Геолокация
  city VARCHAR(100),
  country VARCHAR(100),
  region VARCHAR(100),
  
  -- Связи
  related_buildings UUID[] DEFAULT ARRAY[]::UUID[],
  related_architects TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Метаданные авторства
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Публикация
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  featured BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  -- SEO
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  meta_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Статистика
  views_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  
  -- Временные метки
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для architecture_news
CREATE INDEX IF NOT EXISTS idx_architecture_news_author ON architecture_news(author_id);
CREATE INDEX IF NOT EXISTS idx_architecture_news_status ON architecture_news(status);
CREATE INDEX IF NOT EXISTS idx_architecture_news_published_at ON architecture_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_architecture_news_slug ON architecture_news(slug);
CREATE INDEX IF NOT EXISTS idx_architecture_news_category ON architecture_news(category);
CREATE INDEX IF NOT EXISTS idx_architecture_news_featured ON architecture_news(featured);
CREATE INDEX IF NOT EXISTS idx_architecture_news_created_at ON architecture_news(created_at DESC);

-- 2. Таблица news_interactions (взаимодействия с новостями)
CREATE TABLE IF NOT EXISTS news_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES architecture_news(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'like', 'share')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для news_interactions
CREATE INDEX IF NOT EXISTS idx_news_interactions_news_id ON news_interactions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_interactions_user_id ON news_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_news_interactions_type ON news_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_news_interactions_news_type ON news_interactions(news_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_news_interactions_created_at ON news_interactions(created_at DESC);

-- 3. Таблица news_tags (теги для новостей)
CREATE TABLE IF NOT EXISTS news_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для news_tags
CREATE INDEX IF NOT EXISTS idx_news_tags_slug ON news_tags(slug);

-- =====================================================
-- ТРИГГЕРЫ И ФУНКЦИИ
-- =====================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для architecture_news
DROP TRIGGER IF EXISTS architecture_news_updated_at ON architecture_news;
CREATE TRIGGER architecture_news_updated_at
  BEFORE UPDATE ON architecture_news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();

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

-- Триггер для таблицы news_interactions
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

-- =====================================================
-- RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE architecture_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_tags ENABLE ROW LEVEL SECURITY;

-- Политики для architecture_news
CREATE POLICY "Опубликованные новости доступны всем"
  ON architecture_news FOR SELECT
  USING (status = 'published');

CREATE POLICY "Авторы видят свои новости"
  ON architecture_news FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Авторы могут создавать новости"
  ON architecture_news FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Авторы могут редактировать свои новости"
  ON architecture_news FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Авторы могут удалять свои новости"
  ON architecture_news FOR DELETE
  USING (auth.uid() = author_id);

-- Политики для news_interactions
CREATE POLICY "Все могут добавлять взаимодействия"
  ON news_interactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Все могут видеть взаимодействия опубликованных новостей"
  ON news_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM architecture_news
      WHERE architecture_news.id = news_interactions.news_id
      AND architecture_news.status = 'published'
    )
  );

-- Политики для news_tags
CREATE POLICY "Теги доступны всем"
  ON news_tags FOR SELECT
  USING (true);

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =====================================================

COMMENT ON TABLE architecture_news IS 'Основная таблица новостей архитектуры';
COMMENT ON TABLE news_interactions IS 'Взаимодействия пользователей с новостями (просмотры, лайки, шеринг)';
COMMENT ON TABLE news_tags IS 'Теги для категоризации новостей';
