-- =====================================================
-- МИГРАЦИЯ: СОЗДАНИЕ ТАБЛИЦ ДЛЯ БЛОГА
-- Дата: 2025-10-28
-- Описание: Создание всех необходимых таблиц для системы блога
-- =====================================================

-- 1. Таблица blog_posts (основная таблица статей)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  content JSONB NOT NULL, -- Rich text editor content
  excerpt VARCHAR(500),
  featured_image_url TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER,
  seo_title VARCHAR(60),
  seo_description VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для blog_posts
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- 2. Таблица blog_tags (теги для статей)
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- hex color
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для blog_tags
CREATE INDEX idx_blog_tags_slug ON blog_tags(slug);

-- 3. Таблица blog_post_tags (связь постов и тегов)
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

-- Индексы для blog_post_tags
CREATE INDEX idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- 4. Таблица blog_post_buildings (связь постов с зданиями)
CREATE TABLE IF NOT EXISTS blog_post_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  mention_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (mention_type IN ('auto', 'manual', 'featured')),
  context TEXT,
  order_index INTEGER,
  position_in_text INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, building_id)
);

-- Индексы для blog_post_buildings
CREATE INDEX idx_blog_post_buildings_post ON blog_post_buildings(post_id);
CREATE INDEX idx_blog_post_buildings_building ON blog_post_buildings(building_id);

-- 5. Таблица blog_post_routes (связь постов с маршрутами)
CREATE TABLE IF NOT EXISTS blog_post_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  route_type VARCHAR(20) NOT NULL DEFAULT 'existing' CHECK (route_type IN ('generated', 'existing', 'suggested', 'author_created')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, route_id)
);

-- Индексы для blog_post_routes
CREATE INDEX idx_blog_post_routes_post ON blog_post_routes(post_id);
CREATE INDEX idx_blog_post_routes_route ON blog_post_routes(route_id);

-- 6. Таблица blog_comments (комментарии к статьям)
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для blog_comments
CREATE INDEX idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX idx_blog_comments_user ON blog_comments(user_id);
CREATE INDEX idx_blog_comments_parent ON blog_comments(parent_id);
CREATE INDEX idx_blog_comments_status ON blog_comments(status);

-- 7. Таблица blog_post_reactions (реакции пользователей на статьи)
CREATE TABLE IF NOT EXISTS blog_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'save', 'share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id, reaction_type)
);

-- Индексы для blog_post_reactions
CREATE INDEX idx_blog_post_reactions_post ON blog_post_reactions(post_id);
CREATE INDEX idx_blog_post_reactions_user ON blog_post_reactions(user_id);
CREATE INDEX idx_blog_post_reactions_type ON blog_post_reactions(reaction_type);

-- 8. Таблица blog_reading_stats (статистика чтения)
CREATE TABLE IF NOT EXISTS blog_reading_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  reading_time_seconds INTEGER,
  scroll_percentage INTEGER,
  device_type VARCHAR(50),
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для blog_reading_stats
CREATE INDEX idx_blog_reading_stats_post ON blog_reading_stats(post_id);
CREATE INDEX idx_blog_reading_stats_user ON blog_reading_stats(user_id);
CREATE INDEX idx_blog_reading_stats_created ON blog_reading_stats(created_at);

-- =====================================================
-- ТРИГГЕРЫ И ФУНКЦИИ
-- =====================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для blog_posts
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Триггер для blog_tags
CREATE TRIGGER blog_tags_updated_at
  BEFORE UPDATE ON blog_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Триггер для blog_comments
CREATE TRIGGER blog_comments_updated_at
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Функция для обновления счетчика постов в тегах
CREATE OR REPLACE FUNCTION update_tag_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_tags
    SET post_count = post_count + 1
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_tags
    SET post_count = post_count - 1
    WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления счетчика постов в тегах
CREATE TRIGGER blog_post_tags_count
  AFTER INSERT OR DELETE ON blog_post_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_post_count();

-- =====================================================
-- RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_reading_stats ENABLE ROW LEVEL SECURITY;

-- Политики для blog_posts
CREATE POLICY "Опубликованные статьи доступны всем"
  ON blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Авторы видят свои статьи"
  ON blog_posts FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Авторы могут создавать статьи"
  ON blog_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Авторы могут редактировать свои статьи"
  ON blog_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Авторы могут удалять свои статьи"
  ON blog_posts FOR DELETE
  USING (auth.uid() = author_id);

-- Политики для blog_tags (все могут читать, админы могут управлять)
CREATE POLICY "Теги доступны всем"
  ON blog_tags FOR SELECT
  USING (true);

-- Политики для blog_post_tags (автоматически наследуют права от постов)
CREATE POLICY "Связи постов и тегов доступны всем"
  ON blog_post_tags FOR SELECT
  USING (true);

CREATE POLICY "Авторы могут связывать теги со своими статьями"
  ON blog_post_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Политики для blog_post_buildings
CREATE POLICY "Связи постов и зданий доступны всем"
  ON blog_post_buildings FOR SELECT
  USING (true);

CREATE POLICY "Авторы могут связывать здания со своими статьями"
  ON blog_post_buildings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Политики для blog_post_routes
CREATE POLICY "Связи постов и маршрутов доступны всем"
  ON blog_post_routes FOR SELECT
  USING (true);

CREATE POLICY "Авторы могут связывать маршруты со своими статьями"
  ON blog_post_routes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Политики для blog_comments
CREATE POLICY "Одобренные комментарии доступны всем"
  ON blog_comments FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Пользователи видят свои комментарии"
  ON blog_comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Авторизованные пользователи могут комментировать"
  ON blog_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут редактировать свои комментарии"
  ON blog_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои комментарии"
  ON blog_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Политики для blog_post_reactions
CREATE POLICY "Реакции доступны всем"
  ON blog_post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Пользователи могут добавлять реакции"
  ON blog_post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои реакции"
  ON blog_post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Политики для blog_reading_stats
CREATE POLICY "Статистика доступна только авторам"
  ON blog_reading_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Все могут добавлять статистику чтения"
  ON blog_reading_stats FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

-- Добавляем несколько базовых тегов
INSERT INTO blog_tags (name, slug, description, color) VALUES
  ('Архитектура', 'architecture', 'Общие темы архитектуры', '#3B82F6'),
  ('Модернизм', 'modernism', 'Модернистская архитектура', '#8B5CF6'),
  ('Классика', 'classic', 'Классическая архитектура', '#F59E0B'),
  ('Урбанистика', 'urbanism', 'Городское планирование', '#10B981'),
  ('История', 'history', 'История архитектуры', '#EF4444'),
  ('Современность', 'contemporary', 'Современная архитектура', '#06B6D4')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ЗАВЕРШЕНИЕ
-- =====================================================

-- Комментарии к таблицам
COMMENT ON TABLE blog_posts IS 'Основная таблица статей блога';
COMMENT ON TABLE blog_tags IS 'Теги для категоризации статей';
COMMENT ON TABLE blog_post_tags IS 'Связь постов и тегов (many-to-many)';
COMMENT ON TABLE blog_post_buildings IS 'Связь постов со зданиями';
COMMENT ON TABLE blog_post_routes IS 'Связь постов с маршрутами';
COMMENT ON TABLE blog_comments IS 'Комментарии к статьям блога';
COMMENT ON TABLE blog_post_reactions IS 'Реакции пользователей (лайки, сохранения, репосты)';
COMMENT ON TABLE blog_reading_stats IS 'Статистика чтения статей';
