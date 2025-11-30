-- Миграция: Добавление практической информации в обзоры
-- Дата: 2025-10-08
-- Описание: Добавляет поля opening_hours и entry_fee в building_reviews
-- Статус: ✅ ПРИМЕНЕНА через MCP Supabase

-- Добавляем новые колонки
ALTER TABLE building_reviews 
ADD COLUMN IF NOT EXISTS opening_hours TEXT,
ADD COLUMN IF NOT EXISTS entry_fee TEXT;

-- Комментарии
COMMENT ON COLUMN building_reviews.opening_hours IS 'Часы работы (например, "Пн-Пт 9:00-18:00")';
COMMENT ON COLUMN building_reviews.entry_fee IS 'Стоимость входа (например, "Бесплатно" или "10 EUR")';

-- Информация о миграции
SELECT 'Migration 010: Practical info fields added to building_reviews successfully' as status;

