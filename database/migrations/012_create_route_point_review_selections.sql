-- Миграция: Таблица для сохранения выбранных обзоров для точек маршрута
-- Дата: 2025-10-12
-- Описание: Позволяет пользователям выбирать предпочтительные обзоры для каждой точки маршрута

-- Создание таблицы для сохранения выбранных обзоров
CREATE TABLE IF NOT EXISTS public.route_point_review_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Связи
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  route_point_id UUID NOT NULL REFERENCES public.route_points(id) ON DELETE CASCADE,
  building_review_id UUID NOT NULL REFERENCES public.building_reviews(id) ON DELETE CASCADE,
  
  -- Метаданные
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  last_listened_at TIMESTAMPTZ, -- Когда последний раз слушали аудио
  audio_position_seconds INTEGER DEFAULT 0, -- Позиция воспроизведения аудио
  is_completed BOOLEAN DEFAULT FALSE, -- Прослушан/прочитан ли обзор
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один пользователь может выбрать только один обзор для каждой точки маршрута
  UNIQUE(user_id, route_id, route_point_id)
);

-- Индексы для производительности
CREATE INDEX idx_route_point_review_selections_user_route 
  ON public.route_point_review_selections(user_id, route_id);

CREATE INDEX idx_route_point_review_selections_point 
  ON public.route_point_review_selections(route_point_id);

CREATE INDEX idx_route_point_review_selections_review 
  ON public.route_point_review_selections(building_review_id);

-- Комментарии
COMMENT ON TABLE public.route_point_review_selections IS 
  'Сохраняет выбранные пользователем обзоры для каждой точки маршрута';

COMMENT ON COLUMN public.route_point_review_selections.audio_position_seconds IS 
  'Позиция воспроизведения аудио (для возобновления с места остановки)';

COMMENT ON COLUMN public.route_point_review_selections.is_completed IS 
  'Был ли обзор полностью прослушан/прочитан';

-- RLS Policies
ALTER TABLE public.route_point_review_selections ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи видят только свои выборы
CREATE POLICY "Users can view their own review selections"
  ON public.route_point_review_selections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: Пользователи могут создавать свои выборы
CREATE POLICY "Users can create their own review selections"
  ON public.route_point_review_selections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Политика: Пользователи могут обновлять свои выборы
CREATE POLICY "Users can update their own review selections"
  ON public.route_point_review_selections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Политика: Пользователи могут удалять свои выборы
CREATE POLICY "Users can delete their own review selections"
  ON public.route_point_review_selections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger для обновления updated_at
CREATE OR REPLACE FUNCTION update_route_point_review_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_route_point_review_selections_updated_at
  BEFORE UPDATE ON public.route_point_review_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_route_point_review_selections_updated_at();

